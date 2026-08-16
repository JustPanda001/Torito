'use client';

// Admin inbox: read the questions visitors send from the chat widget, and reply.
//
// The gate below only hides the UI — the row-level security rules in
// supabase-schema.sql are what actually stop a non-admin reading a thread or
// posting as 'admin', so bypassing this page achieves nothing.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { supabase, currentProfile, friendlyError } from '@/lib/supabaseClient';

const POLL_MS = 10000;

export default function ChatAdminPage() {
  const [profile, setProfile] = useState(undefined);   // undefined = still checking
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState(null);

  const logRef = useRef(null);
  // read inside polling callbacks, which must not be rebuilt on every keystroke
  const activeRef = useRef(null);
  const typingRef = useRef(false);

  useEffect(() => { activeRef.current = activeId; }, [activeId]);
  useEffect(() => { typingRef.current = reply.length > 0; }, [reply]);

  useEffect(() => {
    // ?mockuser=admin renders the page without a real session so the layout can
    // be checked locally. Dev only — never true in production.
    if (process.env.NODE_ENV !== 'production'
        && typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).get('mockuser') === 'admin') {
      setProfile({ id: 'mock', full_name: 'Sandro Phkhaladze', email: 'justpanda001@gmail.com', role: 'admin' });
      return;
    }
    currentProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  const loadList = useCallback(async () => {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (error) { setNote(friendlyError(error)); return; }
    setNote(null);
    setConversations(data ?? []);
  }, []);

  const loadThread = useCallback(async (id) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, sender, body, created_at')
      .eq('conversation_id', id)
      .order('created_at');

    if (error) { setNote(friendlyError(error)); return; }
    setMessages(data ?? []);
  }, []);

  useEffect(() => {
    if (profile?.role !== 'admin') return undefined;
    loadList();

    const tick = setInterval(() => {
      if (document.hidden) return;
      loadList();
      // never redraw the thread under someone who is mid-reply
      if (activeRef.current && !typingRef.current) loadThread(activeRef.current);
    }, POLL_MS);

    const channel = supabase
      .channel('chat:inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        loadList();
        if (activeRef.current && !typingRef.current) loadThread(activeRef.current);
      })
      .subscribe();

    return () => { clearInterval(tick); supabase.removeChannel(channel); };
  }, [profile, loadList, loadThread]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  if (profile === undefined) return <Denied message="Checking your account…" />;
  if (!profile) return <Denied message="You are not signed in." />;
  if (profile.role !== 'admin') {
    return <Denied message={`Signed in as ${profile.email}, but this account is not an admin.`} />;
  }

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const waiting = conversations.filter((c) => c.admin_unread).length;

  async function openThread(id) {
    setActiveId(id);
    setMessages([]);
    await loadThread(id);

    // opening a thread is reading it
    const conv = conversations.find((c) => c.id === id);
    if (conv?.admin_unread) {
      await supabase.from('chat_conversations').update({ admin_unread: false }).eq('id', id);
      loadList();
    }
  }

  async function send(e) {
    e.preventDefault();
    const body = reply.trim();
    if (!body || !activeId || sending) return;

    setSending(true);
    setReply('');
    const { error } = await supabase
      .from('chat_messages')
      .insert({ conversation_id: activeId, sender: 'admin', body });
    setSending(false);

    if (error) { setReply(body); setNote(friendlyError(error)); return; }
    loadThread(activeId);
    loadList();
  }

  return (
    <>
      <SiteHeader solid />
      <main className="detail-page">
        <div className="listing-head">
          <h1>Visitor questions</h1>
          <p className="listing-count">
            {conversations.length} conversations{waiting ? ` · ${waiting} waiting` : ''}
          </p>
        </div>

        {note && <p className="form-note error">{note}</p>}

        <section className="detail-block">
          <div className="chat-admin">
            <div className="chat-list">
              {conversations.length === 0 && <p className="form-note">No questions yet.</p>}
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`chat-list-item${c.id === activeId ? ' active' : ''}`}
                  onClick={() => openThread(c.id)}
                >
                  <strong>
                    {c.admin_unread && <span className="dot" />}
                    {c.display_name || c.email || `Guest ${c.id.slice(0, 6)}`}
                  </strong>
                  <span>{whenFull(c.last_message_at)}{c.page ? ` · ${c.page}` : ''}</span>
                </button>
              ))}
            </div>

            <div className="chat-thread">
              <div className="chat-thread-head">
                <strong>
                  {active
                    ? (active.display_name || active.email || `Guest ${active.id.slice(0, 6)}`)
                    : 'No conversation selected'}
                </strong>
                <span>
                  {active
                    ? `${active.email ? `${active.email} · ` : ''}started ${whenFull(active.created_at)}`
                    : 'Pick someone on the left to read and reply.'}
                </span>
              </div>

              <div className="chat-log" ref={logRef}>
                {messages.map((m) => (
                  <div key={m.id} className={`chat-msg ${m.sender === 'admin' ? 'admin' : 'theirs'}`}>
                    <p>{m.body}</p>
                    <time>{whenFull(m.created_at)}</time>
                  </div>
                ))}
              </div>

              <form className="chat-form" onSubmit={send}>
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={activeId ? 'Write a reply…' : 'Pick a conversation first'}
                  aria-label="Reply"
                  autoComplete="off"
                  disabled={!activeId}
                />
                <button type="submit" disabled={!activeId || sending} aria-label="Send">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12l16-8-6 8 6 8z" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function whenFull(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function Denied({ message }) {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="auth-logo" href="/">
          <img src="/assets/torito-logo.png" alt="" /><span>TORITO</span>
        </Link>
        <h1>Admins only</h1>
        <p className="form-note">{message}</p>
        <p className="auth-foot">
          <Link className="auth-link" href="/login">Sign in</Link> · <Link className="auth-link" href="/">Back to site</Link>
        </p>
      </div>
    </main>
  );
}
