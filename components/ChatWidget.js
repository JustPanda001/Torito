'use client';

// Visitor-side live chat: a small panel in the bottom-right corner.
//
// Opened by its own bubble, or by anything that fires the 'torito:chat-open'
// event — that is how the "Ask a question" button on a trip page reaches it
// without the two components having to know about each other.
//
// Visitors are not asked to sign in first, so a thread is identified by its own
// uuid, kept in localStorage. That uuid is the secret: holding it is what lets
// the same browser read its thread back later. A signed-in visitor also gets
// user_id stamped on the row, so their name and email show in the inbox.

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase, currentProfile } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';
import Linkify from './Linkify';
import { purgeOldChats } from '@/lib/chatExpiry';

const STORE_KEY = 'torito.chat.conversation';
const POLL_MS = 8000;

// the opening line names the thing by what it actually is, so "I have a
// question about this hike" rather than the same word for every listing
const KIND_KEY = {
  hiking: 'chat.aboutHike',
  camping: 'chat.aboutCamp',
  ski: 'chat.aboutSki',
  culture: 'chat.aboutTour',
};

export const CHAT_OPEN_EVENT = 'torito:chat-open';

// Phones get the chat as a full-screen sheet rather than a floating panel; this
// is the same width chat.css switches at.
const PHONE_QUERY = '(max-width: 640px)';

/**
 * Turns an element into a full-screen sheet on a phone, the way Intercom or
 * WhatsApp do it, while `active` is true.
 *
 * Two things CSS alone cannot do on iOS:
 *  - When the keyboard opens, Safari keeps the layout viewport full height and
 *    only shrinks the *visual* viewport, so a `position:fixed; inset:0` sheet
 *    would carry on under the keyboard and the input would vanish behind it.
 *    window.visualViewport gives the part actually on screen, so the sheet is
 *    sized and placed to exactly that and follows it as it changes.
 *  - overflow:hidden on <body> does not stop the page scrolling behind on iOS;
 *    pinning <body> with position:fixed does. The scroll position is put back
 *    on close, so the visitor lands where they were.
 *
 * logRef, if given, is scrolled to the newest message whenever the sheet is
 * resized — that is the moment the keyboard opens or closes.
 */
export function usePhoneSheet(active, logRef) {
  const [phone, setPhone] = useState(false);
  const sheetRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const update = () => setPhone(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  const sheet = Boolean(active && phone);

  useEffect(() => {
    if (!sheet) return undefined;

    const body = document.body;
    const y = window.scrollY;
    const path = window.location.pathname;
    const saved = {
      position: body.style.position, top: body.style.top, left: body.style.left,
      right: body.style.right, width: body.style.width, overflow: body.style.overflow,
    };
    Object.assign(body.style, {
      position: 'fixed', top: `-${y}px`, left: '0', right: '0', width: '100%', overflow: 'hidden',
    });

    const vv = window.visualViewport;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = sheetRef.current;
        if (el && vv) {
          el.style.top = `${vv.offsetTop}px`;
          el.style.height = `${vv.height}px`;
        }
        const log = logRef?.current;
        if (log) log.scrollTop = log.scrollHeight;
      });
    };
    fit();
    vv?.addEventListener('resize', fit);
    vv?.addEventListener('scroll', fit);

    // keep a ref to the node: by cleanup time a closed panel has unmounted
    const node = sheetRef.current;
    return () => {
      cancelAnimationFrame(frame);
      vv?.removeEventListener('resize', fit);
      vv?.removeEventListener('scroll', fit);
      if (node) { node.style.top = ''; node.style.height = ''; }
      Object.assign(body.style, saved);
      // html has scroll-behavior:smooth, which would make the page visibly
      // glide back from the top; and if the visitor has moved to another page
      // meanwhile, the old position means nothing there
      if (window.location.pathname === path) window.scrollTo({ top: y, behavior: 'instant' });
    };
  }, [sheet, logRef]);

  return { phone, sheet, sheetRef };
}

/**
 * Lets any component open the panel: openChat() from a click handler.
 *
 * Pass a tour to open it "about" that trip — the panel then sends an opening
 * message naming the trip and linking to the page, so the inbox shows what the
 * question is about before the visitor has typed a word.
 */
export function openChat(tour) {
  const detail = tour && tour.title
    ? { title: tour.title, subtitle: tour.subtitle ?? null, category: tour.category ?? null }
    : null;
  window.dispatchEvent(new CustomEvent(CHAT_OPEN_EVENT, { detail }));
}

export default function ChatWidget() {
  const { t } = useT();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  // the trip the visitor pressed "Ask a question" on, until its opening line
  // has been sent. State rather than a ref: it has to trigger the render that
  // sends it, and a ref set after loadHistory() resolves comes too late.
  const [askAbout, setAskAbout] = useState(null);

  const conversationId = useRef(null);
  const loaded = useRef(false);
  const seen = useRef(new Set());
  const autoReplied = useRef(false);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  // the admin pages have their own chat UI; two panels at once would be silly
  const hidden = Boolean(pathname?.startsWith('/admin') || pathname?.startsWith('/chat'));
  const shown = open && !hidden;
  const { phone, sheetRef } = usePhoneSheet(shown, logRef);

  const greeting = { id: 'greeting', sender: 'bot', body: t('chat.greeting'), created_at: null };

  useEffect(() => {
    conversationId.current = localStorage.getItem(STORE_KEY);
  }, []);

  const append = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  /* ---------------- reading ---------------- */

  // Realtime is off by default on a fresh Supabase project, so this poll is the
  // dependable path rather than a fallback. Cheap: one indexed query per tick,
  // and only while the tab is visible.
  const pull = useCallback(async () => {
    const id = conversationId.current;
    if (!id || document.hidden) return;

    const { data } = await supabase
      .from('chat_messages')
      .select('id, sender, body, created_at')
      .eq('conversation_id', id)
      .eq('sender', 'admin')
      .order('created_at');

    const fresh = (data ?? []).filter((m) => !seen.current.has(m.id));
    if (!fresh.length) return;

    fresh.forEach((m) => seen.current.add(m.id));
    if (loaded.current) setMessages((prev) => [...prev, ...fresh]);
    setUnread((n) => (open ? 0 : n + fresh.length));
  }, [open]);

  useEffect(() => {
    const timer = setInterval(pull, POLL_MS);
    pull();
    return () => clearInterval(timer);
  }, [pull]);

  // and take realtime when the project does have it enabled
  useEffect(() => {
    const id = conversationId.current;
    if (!id) return undefined;

    const channel = supabase
      .channel(`chat:${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${id}`,
      }, ({ new: row }) => {
        if (row.sender !== 'admin' || seen.current.has(row.id)) return;
        seen.current.add(row.id);
        if (loaded.current) append(row);
        setUnread((n) => (open ? 0 : n + 1));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // conversationId is a ref, so this re-runs only when the panel opens and
    // the id may have just been created
  }, [open, append]);

  const loadHistory = useCallback(async () => {
    if (loaded.current) return;
    loaded.current = true;

    const id = conversationId.current;
    if (!id) { setMessages([greeting]); return; }

    // the thread may have aged out since this browser last used it; writing
    // into a deleted row would fail the foreign key, so forget it and start over
    const { data: conv } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!conv) {
      conversationId.current = null;
      localStorage.removeItem(STORE_KEY);
      seen.current.clear();
      setMessages([greeting]);
      return;
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, sender, body, created_at')
      .eq('conversation_id', id)
      .order('created_at');

    if (error || !data?.length) { setMessages([greeting]); return; }

    data.forEach((m) => seen.current.add(m.id));
    autoReplied.current = data.some((m) => m.sender === 'bot'
      && (m.body === t('chat.autoReply') || m.body === t('chat.askDetails')));
    setMessages([greeting, ...data]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  /* ---------------- opening ---------------- */

  const show = useCallback((tour) => {
    setOpen(true);
    setUnread(0);
    purgeOldChats();
    if (tour) setAskAbout(tour);
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const onOpen = (e) => show(e.detail);
    window.addEventListener(CHAT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CHAT_OPEN_EVENT, onOpen);
  }, [show]);

  useEffect(() => {
    if (!open) return;
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [open, messages]);

  // On a phone, focusing straight away would throw the keyboard up over the
  // conversation the visitor opened the chat to read; they tap the input when
  // they are ready to type, as in any messaging app.
  useEffect(() => { if (open && !phone) inputRef.current?.focus(); }, [open, phone]);

  // Contract with the rest of the site (BRIEF "Chat open state"): anything that
  // floats over the page can hide itself with `.chat-open .their-bar`.
  useEffect(() => {
    if (!shown) return undefined;
    const html = document.documentElement;
    html.classList.add('chat-open');
    return () => html.classList.remove('chat-open');
  }, [shown]);

  /* ---------------- writing ---------------- */

  /** The row is created on the first message, not when the panel opens, so
   *  idle visitors never leave an empty thread in the inbox. */
  async function ensureConversation() {
    if (conversationId.current) return conversationId.current;

    const profile = await currentProfile().catch(() => null);
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: profile?.id ?? null,
        display_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        page: window.location.pathname,
      })
      .select('id')
      .single();

    if (error) throw error;
    conversationId.current = data.id;
    localStorage.setItem(STORE_KEY, data.id);
    return data.id;
  }

  /**
   * Shows the message straight away, then stores it.
   *
   * autoReply is off for the opening "about this trip" line: that one is sent
   * for the visitor rather than by them, and promising a reply before they have
   * actually asked anything reads as a bot talking to itself.
   */
  const post = useCallback(async (body, { autoReply = true, replyKey = 'chat.autoReply' } = {}) => {
    append({ id: `local-${Date.now()}`, sender: 'user', body, created_at: new Date().toISOString() });

    try {
      const id = await ensureConversation();
      const { error } = await supabase
        .from('chat_messages')
        .insert({ conversation_id: id, sender: 'user', body });
      if (error) throw error;

      if (autoReply && !autoReplied.current) {
        autoReplied.current = true;
        const reply = t(replyKey);
        setTimeout(async () => {
          append({ id: `auto-${Date.now()}`, sender: 'bot', body: reply, created_at: new Date().toISOString() });
          // stored too, so the thread reads the same way when it is reopened
          await supabase.from('chat_messages')
            .insert({ conversation_id: id, sender: 'bot', body: reply });
        }, 600);
      }
    } catch (err) {
      append({ id: `err-${Date.now()}`, sender: 'bot', body: t('chat.failed'), created_at: new Date().toISOString() });
      console.warn('Chat send failed:', err?.message ?? err);
    }
    // ensureConversation reads refs only, so it needs no dependency entry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [append, t]);

  // Sending the opening line happens here rather than in show() so it runs
  // after the history is on screen — otherwise the load overwrites it.
  useEffect(() => {
    // messages is empty until loadHistory() has run; waiting for it keeps the
    // opening line below the greeting and lets the repeat check see the thread
    if (!open || !askAbout || !messages.length) return;
    const tour = askAbout;
    setAskAbout(null);

    const body = `${t(KIND_KEY[tour.category] ?? 'chat.aboutTrip')} ${tour.title}`
      + `${tour.subtitle ? ` (${tour.subtitle})` : ''}\n${window.location.href}`;

    // pressing the button twice should not repeat the same line
    if (messages.some((m) => m.sender === 'user' && m.body === body)) return;
    // our side answers straight away, asking for what we need to help
    post(body, { replyKey: 'chat.askDetails' });
  }, [open, askAbout, messages, post, t]);

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;

    setSending(true);
    setText('');
    await post(body);
    setSending(false);
  }

  if (hidden) return null;

  return (
    <div className={`chat-widget${open ? ' open' : ''}`}>
      {open && (
        <div className="chat-panel" ref={sheetRef} role="dialog" aria-label={t('chat.title')}>
          <div className="chat-head">
            <span className="chat-avatar"><img src="/assets/torito-logo.png" alt="" /></span>
            <div className="chat-head-main">
              <strong>{t('chat.title')}</strong>
              <span>{t('chat.sub')}</span>
            </div>
            <button className="chat-close" type="button" onClick={() => setOpen(false)} aria-label={t('chat.close')}>
              &times;
            </button>
          </div>

          <div className="chat-log" ref={logRef}>
            {messages.map((m) => (
              <div key={m.id} className={`chat-msg ${m.sender === 'user' ? 'mine' : 'theirs'}`}>
                <p><Linkify text={m.body} /></p>
                {m.created_at && (
                  <time>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                )}
              </div>
            ))}
          </div>

          <form className="chat-form" onSubmit={send}>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('chat.placeholder')}
              aria-label={t('chat.placeholder')}
              autoComplete="off"
              enterKeyHint="send"
            />
            <button type="submit" disabled={sending} aria-label={t('chat.send')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12l16-8-6 8 6 8z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        className="chat-bubble"
        type="button"
        onClick={() => (open ? setOpen(false) : show())}
        aria-label={t('chat.open')}
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a8 8 0 1 1-3.2-6.4" /><path d="M8 11h8M8 15h5" />
          </svg>
        )}
        {unread > 0 && !open && <span className="chat-badge">{unread}</span>}
      </button>
    </div>
  );
}
