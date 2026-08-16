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

const STORE_KEY = 'torito.chat.conversation';
const POLL_MS = 8000;

export const CHAT_OPEN_EVENT = 'torito:chat-open';

/** Lets any component open the panel: openChat() from a click handler. */
export function openChat() {
  window.dispatchEvent(new Event(CHAT_OPEN_EVENT));
}

export default function ChatWidget() {
  const { t } = useT();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');

  const conversationId = useRef(null);
  const loaded = useRef(false);
  const seen = useRef(new Set());
  const autoReplied = useRef(false);
  const logRef = useRef(null);
  const inputRef = useRef(null);

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

    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, sender, body, created_at')
      .eq('conversation_id', id)
      .order('created_at');

    if (error || !data?.length) { setMessages([greeting]); return; }

    data.forEach((m) => seen.current.add(m.id));
    autoReplied.current = data.some((m) => m.sender === 'bot' && m.body === t('chat.autoReply'));
    setMessages([greeting, ...data]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  /* ---------------- opening ---------------- */

  const show = useCallback(() => {
    setOpen(true);
    setUnread(0);
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    window.addEventListener(CHAT_OPEN_EVENT, show);
    return () => window.removeEventListener(CHAT_OPEN_EVENT, show);
  }, [show]);

  useEffect(() => {
    if (!open) return;
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [open, messages]);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

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

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;

    setSending(true);
    setText('');
    append({ id: `local-${Date.now()}`, sender: 'user', body, created_at: new Date().toISOString() });

    try {
      const id = await ensureConversation();
      const { error } = await supabase
        .from('chat_messages')
        .insert({ conversation_id: id, sender: 'user', body });
      if (error) throw error;

      if (!autoReplied.current) {
        autoReplied.current = true;
        const reply = t('chat.autoReply');
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
    } finally {
      setSending(false);
    }
  }

  // the admin pages have their own chat UI; two panels at once would be silly
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/chat')) return null;

  return (
    <div className={`chat-widget${open ? ' open' : ''}`}>
      {open && (
        <div className="chat-panel">
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
                <p>{m.body}</p>
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
