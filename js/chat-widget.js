// Visitor-side chat: a small panel in the bottom-right corner.
//
// Opened by the floating bubble or by any "Ask a question" button on the page.
// Visitors do not have to sign in, so the conversation is remembered by its own
// uuid in localStorage — that uuid is what lets the same browser read the
// thread back later. Admin replies arrive over Supabase realtime, with a poll
// as a fallback for when the socket cannot connect.
import { supabase, currentProfile } from './supabase.js';

const STORE_KEY = 'torito.chat.conversation';
const GREETING = 'Hello! What can I help you with?';
const AUTO_REPLY = 'Thanks for your message — our team will reply as soon as possible.';

let conversationId = localStorage.getItem(STORE_KEY);
let sending = false;
let unread = 0;
let autoReplySent = false;

/* ---------------- markup ---------------- */

const root = document.createElement('div');
root.className = 'chat-widget';
root.innerHTML = `
  <div class="chat-panel" id="chatPanel" hidden>
    <div class="chat-head">
      <span class="chat-avatar"><img src="assets/torito-logo.png" alt=""></span>
      <div class="chat-head-main">
        <strong>Torito</strong>
        <span>We usually reply within a few hours</span>
      </div>
      <button class="chat-close" type="button" aria-label="Close chat">&times;</button>
    </div>
    <div class="chat-log" id="chatLog"></div>
    <form class="chat-form" id="chatForm">
      <input id="chatInput" autocomplete="off" placeholder="Type a message…" aria-label="Message">
      <button type="submit" aria-label="Send">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 12l16-8-6 8 6 8z"/>
        </svg>
      </button>
    </form>
  </div>
  <button class="chat-bubble" id="chatBubble" type="button" aria-label="Ask a question">
    <svg class="chat-ico-open" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12a8 8 0 1 1-3.2-6.4"/><path d="M8 11h8M8 15h5"/>
    </svg>
    <svg class="chat-ico-close" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2">
      <path d="M6 6l12 12M18 6L6 18"/>
    </svg>
    <span class="chat-badge" id="chatBadge" hidden>0</span>
  </button>`;
document.body.appendChild(root);

const panel = root.querySelector('#chatPanel');
const log = root.querySelector('#chatLog');
const form = root.querySelector('#chatForm');
const input = root.querySelector('#chatInput');
const bubble = root.querySelector('#chatBubble');
const badge = root.querySelector('#chatBadge');

/* ---------------- rendering ---------------- */

function bubbleFor(sender, body, when) {
  const el = document.createElement('div');
  el.className = `chat-msg ${sender === 'user' ? 'mine' : 'theirs'}`;
  el.innerHTML = `<p></p><time></time>`;
  el.querySelector('p').textContent = body;
  el.querySelector('time').textContent = new Date(when || Date.now())
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return el;
}

function add(sender, body, when) {
  log.appendChild(bubbleFor(sender, body, when));
  log.scrollTop = log.scrollHeight;
}

function setUnread(n) {
  unread = n;
  badge.textContent = n;
  badge.hidden = n === 0;
}

/* ---------------- data ---------------- */

/** Creates the conversation row on the first message, not on open. */
async function ensureConversation() {
  if (conversationId) return conversationId;

  const profile = await currentProfile().catch(() => null);
  const { data, error } = await supabase
    .from('chat_conversations')
    .insert({
      user_id: profile?.id ?? null,
      display_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
      page: location.pathname + location.search,
    })
    .select('id')
    .single();

  if (error) throw error;
  conversationId = data.id;
  localStorage.setItem(STORE_KEY, conversationId);
  listen();
  return conversationId;
}

async function post(sender, body) {
  const id = await ensureConversation();
  const { error } = await supabase
    .from('chat_messages')
    .insert({ conversation_id: id, sender, body });
  if (error) throw error;
}

let loaded = false;
async function loadHistory() {
  if (loaded) return;
  loaded = true;

  if (!conversationId) { add('bot', GREETING); return; }

  const { data, error } = await supabase
    .from('chat_messages')
    .select('sender, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at');

  if (error || !data?.length) { add('bot', GREETING); return; }

  for (const m of data) add(m.sender, m.body, m.created_at);
  autoReplySent = data.some((m) => m.body === AUTO_REPLY);
  listen();
}

/** Live admin replies. Falls back to polling if realtime is unavailable. */
let channel = null;
let pollTimer = null;
function listen() {
  if (channel || !conversationId) return;

  channel = supabase
    .channel(`chat:${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, ({ new: row }) => {
      if (row.sender !== 'admin') return;
      seen.add(row.id);
      add('admin', row.body, row.created_at);
      if (panel.hidden) setUnread(unread + 1);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED' && pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') startPolling();
    });

  // realtime is off by default on a fresh Supabase project, so never rely on it
  startPolling();
}

const seen = new Set();
function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    if (!conversationId || document.hidden) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('id, body, created_at')
      .eq('conversation_id', conversationId)
      .eq('sender', 'admin')
      .order('created_at');

    for (const m of data ?? []) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      // panel never opened this visit — nothing to append, just flag it
      if (!loaded) { setUnread(unread + 1); continue; }
      if ([...log.querySelectorAll('.chat-msg.theirs p')].some((p) => p.textContent === m.body)) continue;
      add('admin', m.body, m.created_at);
      if (panel.hidden) setUnread(unread + 1);
    }
  }, 8000);
}

/* ---------------- interaction ---------------- */

async function open() {
  panel.hidden = false;
  root.classList.add('open');
  setUnread(0);
  await loadHistory();
  input.focus();
}

function close() {
  panel.hidden = true;
  root.classList.remove('open');
}

bubble.addEventListener('click', () => (panel.hidden ? open() : close()));
root.querySelector('.chat-close').addEventListener('click', close);

// every "Ask a question" button on the page opens the same panel
document.querySelectorAll('.book-btn.secondary, [data-chat-open]').forEach((btn) => {
  btn.addEventListener('click', (e) => { e.preventDefault(); open(); });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = input.value.trim();
  if (!body || sending) return;

  sending = true;
  input.value = '';
  add('user', body);

  try {
    await post('user', body);
    if (!autoReplySent) {
      autoReplySent = true;
      setTimeout(async () => {
        add('bot', AUTO_REPLY);
        try { await post('bot', AUTO_REPLY); } catch { /* cosmetic only */ }
      }, 600);
    }
    listen();
  } catch (err) {
    add('bot', 'That message could not be sent — please try again in a moment.');
    console.warn('Chat send failed:', err.message ?? err);
  } finally {
    sending = false;
  }
});

// a thread already in progress: check once on load so the badge is right
if (conversationId) { listen(); }
