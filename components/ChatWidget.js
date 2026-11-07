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
// user_id stamped on the row, so their name and email show in the inbox, and
// their thread then opens only while they are signed in to that account.
//
// The widget never touches the chat tables directly: the database only lets a
// visitor in through start_chat, send_chat_message and get_chat (see
// CHAT-PRIVACY.sql), which check that the thread is theirs. That is also why
// there is no realtime subscription here — row security hides the rows from a
// guest's realtime feed, so polling get_chat is how replies arrive.

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';
import Linkify from './Linkify';
import { purgeOldChats } from '@/lib/chatExpiry';

const STORE_KEY = 'torito.chat.conversation';
// quick while the panel is open, slow while closed (only feeds the badge)
const POLL_OPEN_MS = 4000;
const POLL_CLOSED_MS = 15000;
// each poll asks only for messages from the newest one seen, minus this much,
// so a reply stamped a moment before the last poll is not skipped
const OVERLAP_MS = 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  // created_at of the newest message fetched, as the database wrote it
  const lastAt = useRef(null);
  const autoReplied = useRef(false);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  // the admin pages have their own chat UI; two panels at once would be silly
  const hidden = Boolean(pathname?.startsWith('/admin') || pathname?.startsWith('/chat'));
  const shown = open && !hidden;
  const { phone, sheetRef } = usePhoneSheet(shown, logRef);

  const greeting = { id: 'greeting', sender: 'bot', body: t('chat.greeting'), created_at: null };

  useEffect(() => {
    const saved = localStorage.getItem(STORE_KEY);
    // anything else would only ever earn an "invalid uuid" error from the database
    conversationId.current = saved && UUID.test(saved) ? saved : null;
  }, []);

  const append = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  /** Drops the stored thread: it expired, or it is not this visitor's any more
   *  (opened under an account that has since signed out). The next message
   *  starts a fresh one. */
  const forget = useCallback(() => {
    conversationId.current = null;
    lastAt.current = null;
    localStorage.removeItem(STORE_KEY);
    seen.current.clear();
    autoReplied.current = false;
  }, []);

  /** Records the newest created_at, kept as the database's own string so the
   *  next poll's "from" is exact. Rows arrive oldest first. */
  const track = useCallback((rows) => {
    if (rows.length) lastAt.current = rows[rows.length - 1].created_at;
  }, []);

  /* ---------------- reading ---------------- */

  // Cheap: one indexed lookup per tick, only messages since the last one seen,
  // and only while the tab is visible.
  const pull = useCallback(async () => {
    const id = conversationId.current;
    if (!id || document.hidden) return;

    const after = lastAt.current
      ? new Date(new Date(lastAt.current).getTime() - OVERLAP_MS).toISOString()
      : null;
    const { data, error } = await supabase.rpc('get_chat', { p_conversation: id, p_after: after });
    if (error || conversationId.current !== id) return;
    // null (not an error) means the thread is gone or no longer ours
    if (data === null) { forget(); return; }

    const rows = Array.isArray(data) ? data : [];
    track(rows);
    const fresh = rows.filter((m) => m.sender === 'admin' && !seen.current.has(m.id));
    if (!fresh.length) return;

    fresh.forEach((m) => seen.current.add(m.id));
    if (loaded.current) setMessages((prev) => [...prev, ...fresh]);
    setUnread((n) => (open ? 0 : n + fresh.length));
  }, [open, forget, track]);

  useEffect(() => {
    const timer = setInterval(pull, open ? POLL_OPEN_MS : POLL_CLOSED_MS);
    pull();
    return () => clearInterval(timer);
  }, [pull, open]);

  const loadHistory = useCallback(async () => {
    if (loaded.current) return;
    loaded.current = true;

    const id = conversationId.current;
    if (!id) { setMessages([greeting]); return; }

    const { data, error } = await supabase.rpc('get_chat', { p_conversation: id });

    // a network or server error: keep the thread and try again on next open
    if (error) { loaded.current = false; setMessages([greeting]); return; }

    // the thread may have aged out since this browser last used it, or belong
    // to an account that is not signed in now; posting into it would fail, so
    // forget it and start over
    if (data === null) { forget(); setMessages([greeting]); return; }

    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) { setMessages([greeting]); return; }

    rows.forEach((m) => seen.current.add(m.id));
    track(rows);
    autoReplied.current = rows.some((m) => m.sender === 'bot'
      && (m.body === t('chat.autoReply') || m.body === t('chat.askDetails')));
    setMessages([greeting, ...rows]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, forget, track]);

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

    // the database stamps the account, name and email from the session itself
    const { data: id, error } = await supabase.rpc('start_chat', { p_page: window.location.pathname });

    if (error) throw error;
    if (!id) throw new Error('start_chat returned no id');
    conversationId.current = id;
    localStorage.setItem(STORE_KEY, id);
    return id;
  }

  /**
   * Stores one message and returns the thread id it went into. If the saved
   * thread has gone (expired, or opened under an account now signed out), a
   * visitor's message starts a new one and tries once more rather than failing.
   * An auto-reply never does: a thread holding only our reply would be noise.
   */
  async function store(sender, body) {
    let id = await ensureConversation();
    const call = () => supabase.rpc('send_chat_message', { p_conversation: id, p_body: body, p_sender: sender });

    let { data, error } = await call();
    if (error && sender === 'user' && /chat_not_found/.test(error.message ?? '')) {
      forget();
      id = await ensureConversation();
      ({ data, error } = await call());
    }
    if (error) throw error;
    // the poll would otherwise not know this row is already on screen
    if (data) seen.current.add(data);
    return id;
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
      await store('user', body);

      if (autoReply && !autoReplied.current) {
        autoReplied.current = true;
        const reply = t(replyKey);
        setTimeout(async () => {
          append({ id: `auto-${Date.now()}`, sender: 'bot', body: reply, created_at: new Date().toISOString() });
          // stored too, so the thread reads the same way when it is reopened;
          // best effort, as before: the visitor has already seen it
          try { await store('bot', reply); } catch (err) {
            console.warn('Chat auto-reply not stored:', err?.message ?? err);
          }
        }, 600);
      }
    } catch (err) {
      append({ id: `err-${Date.now()}`, sender: 'bot', body: t('chat.failed'), created_at: new Date().toISOString() });
      console.warn('Chat send failed:', err?.message ?? err);
    }
    // store / ensureConversation read refs and the stable forget() only, so
    // they need no dependency entry
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
            <span className="chat-avatar"><img src="/assets/mtani-mark.svg" alt="" /></span>
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
              maxLength={2000}
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
