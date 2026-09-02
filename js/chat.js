// Admin inbox: read visitor questions and reply to them.
// The gate below only hides the UI — the database rules are what actually stop
// a non-admin reading or answering anything.
import { supabase, currentProfile } from './supabase.js';
import { friendlyError, watchBackend } from './connection.js';

watchBackend();

const main = document.getElementById('chatMain');
const denied = document.getElementById('chatDenied');
const deniedNote = document.getElementById('deniedNote');

const profile = await currentProfile();

if (!profile) {
  denied.hidden = false;
  deniedNote.textContent = 'You are not signed in.';
} else if (profile.role !== 'admin') {
  denied.hidden = false;
  deniedNote.textContent = `Signed in as ${profile.email}, but this account is not an admin.`;
} else {
  denied.remove();
  main.hidden = false;
  start();
}

function start() {
  const listEl = document.getElementById('chatList');
  const countEl = document.getElementById('chatCount');
  const headEl = document.getElementById('threadHead');
  const logEl = document.getElementById('threadLog');
  const form = document.getElementById('replyForm');
  const input = document.getElementById('replyInput');
  const sendBtn = form.querySelector('button');

  let conversations = [];
  let activeId = null;

  const when = (iso) => new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const nameOf = (c) =>
    c.display_name || c.email || `Guest ${c.id.slice(0, 6)}`;

  async function loadList() {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (error) {
      listEl.innerHTML = `<p class="form-note error">${friendlyError(error)}</p>`;
      return;
    }

    conversations = data;
    const waiting = data.filter((c) => c.admin_unread).length;
    countEl.textContent = `${data.length} conversations${waiting ? ` · ${waiting} waiting` : ''}`;

    if (!data.length) {
      listEl.innerHTML = '<p class="form-note">No questions yet.</p>';
      return;
    }

    listEl.innerHTML = data.map((c) => `
      <button class="chat-list-item${c.id === activeId ? ' active' : ''}" data-id="${c.id}">
        <strong>${c.admin_unread ? '<span class="dot"></span>' : ''}${nameOf(c)}</strong>
        <span>${when(c.last_message_at)}${c.page ? ` · ${c.page}` : ''}</span>
      </button>`).join('');

    listEl.querySelectorAll('[data-id]').forEach((b) =>
      b.addEventListener('click', () => openThread(b.dataset.id)));
  }

  function render(messages) {
    logEl.innerHTML = '';
    for (const m of messages) {
      const el = document.createElement('div');
      el.className = `chat-msg ${m.sender === 'admin' ? 'admin' : 'theirs'}`;
      el.innerHTML = '<p></p><time></time>';
      el.querySelector('p').textContent = m.body;
      el.querySelector('time').textContent = when(m.created_at);
      logEl.appendChild(el);
    }
    logEl.scrollTop = logEl.scrollHeight;
  }

  async function openThread(id) {
    activeId = id;
    const conv = conversations.find((c) => c.id === id);

    headEl.innerHTML = '<strong></strong><span></span>';
    headEl.querySelector('strong').textContent = nameOf(conv);
    headEl.querySelector('span').textContent =
      `${conv.email ? conv.email + ' · ' : ''}started ${when(conv.created_at)}`;

    input.disabled = false;
    sendBtn.disabled = false;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('sender, body, created_at')
      .eq('conversation_id', id)
      .order('created_at');

    if (error) { logEl.innerHTML = `<p class="form-note error">${friendlyError(error)}</p>`; return; }
    render(data);

    // opening a thread is reading it
    if (conv.admin_unread) {
      await supabase.from('chat_conversations').update({ admin_unread: false }).eq('id', id);
      conv.admin_unread = false;
    }
    await loadList();
    input.focus();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = input.value.trim();
    if (!body || !activeId) return;

    input.value = '';
    sendBtn.disabled = true;
    const { error } = await supabase
      .from('chat_messages')
      .insert({ conversation_id: activeId, sender: 'admin', body });
    sendBtn.disabled = false;

    if (error) {
      input.value = body;
      alert(friendlyError(error));
      return;
    }
    await openThread(activeId);
  });

  // realtime is off by default on a fresh project, so refresh on a timer too
  supabase
    .channel('chat:inbox')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
      loadList();
      // don't redraw under someone who is mid-reply
      if (activeId && !input.value) openThread(activeId);
    })
    .subscribe();

  setInterval(() => {
    if (document.hidden) return;
    loadList();
  }, 10000);

  loadList();
}
