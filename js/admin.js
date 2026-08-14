// Admin panel: add, edit and delete tours.
// The gate below only hides the UI — the database rules are what actually stop
// a non-admin writing anything, so bypassing this page achieves nothing.
import { supabase, currentProfile } from './supabase.js';
import { friendlyError, watchBackend } from './connection.js';

watchBackend();

const main = document.getElementById('adminMain');
const denied = document.getElementById('adminDenied');
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
  const form = document.getElementById('tourForm');
  const note = document.getElementById('adminNote');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelEdit');
  const formTitle = document.getElementById('formTitle');
  const list = document.getElementById('adminList');
  const count = document.getElementById('adminCount');

  let editingId = null;

  const say = (msg, isError) => {
    note.textContent = msg;
    note.className = isError ? 'form-note error' : 'form-note';
    note.hidden = false;
  };

  async function load() {
    const { data, error } = await supabase
      .from('tours').select('*').order('created_at', { ascending: false });

    if (error) { list.innerHTML = `<p class="form-note error">${friendlyError(error)}</p>`; return; }

    count.textContent = `${data.length} tours`;
    list.innerHTML = data.map((t) => `
      <div class="admin-row">
        <img src="${t.cover_image || 'assets/hero.svg'}" alt="">
        <div class="admin-row-main">
          <strong>${t.title}</strong>
          <span>${t.region || '—'} · ${t.duration || '—'} · ${t.capacity} people${t.published ? '' : ' · <em>draft</em>'}</span>
        </div>
        <div class="admin-row-btns">
          <button class="chip" data-edit="${t.id}">Edit</button>
          <button class="chip danger" data-del="${t.id}" data-title="${t.title}">Delete</button>
        </div>
      </div>`).join('');

    list.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => edit(data.find((t) => t.id === b.dataset.edit))));

    list.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', () => remove(b.dataset.del, b.dataset.title)));
  }

  function edit(tour) {
    editingId = tour.id;
    for (const [key, value] of Object.entries(tour)) {
      const input = form.elements[key];
      if (!input) continue;
      if (input.type === 'checkbox') input.checked = !!value;
      else input.value = value ?? '';
    }
    formTitle.textContent = `Editing: ${tour.title}`;
    saveBtn.textContent = 'Save changes';
    cancelBtn.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    editingId = null;
    form.reset();
    formTitle.textContent = 'Add a tour';
    saveBtn.textContent = 'Add tour';
    cancelBtn.hidden = true;
    note.hidden = true;
  }
  cancelBtn.addEventListener('click', resetForm);

  async function remove(id, title) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('tours').delete().eq('id', id);
    if (error) say(error.message, true);
    else { say(`Deleted "${title}".`); load(); }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { say('Fill in the required fields.', true); return; }

    const fd = new FormData(form);
    const row = Object.fromEntries(fd.entries());
    row.published = form.elements.published.checked;
    row.capacity = Number(row.capacity);
    row.spots_left = row.spots_left === '' ? null : Number(row.spots_left);
    if (row.badge === '') row.badge = null;

    saveBtn.disabled = true;
    const { error } = editingId
      ? await supabase.from('tours').update(row).eq('id', editingId)
      : await supabase.from('tours').insert(row);
    saveBtn.disabled = false;

    if (error) { say(friendlyError(error), true); return; }

    say(editingId ? 'Changes saved.' : `Added "${row.title}".`);
    const wasEditing = editingId;
    resetForm();
    if (wasEditing) note.hidden = false;
    load();
  });

  load();
}
