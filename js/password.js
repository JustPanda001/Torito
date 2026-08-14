// Password reset and change.
//
// The page covers two routes to the same place:
//   * not signed in, no link  -> ask for an email, send a recovery link
//   * arrived on a recovery link, or already signed in -> set a new password
//
// Supabase turns the token in the recovery link into a session on page load,
// which is what lets updateUser() below change the password without ever
// asking for the old one.

import { supabase } from './supabase.js';
import { friendlyError, watchBackend } from './connection.js';

watchBackend();

const heading = document.getElementById('resetHeading');
const intro = document.getElementById('resetIntro');
const requestForm = document.getElementById('requestForm');
const updateForm = document.getElementById('updateForm');

function say(id, message, isError) {
  const note = document.getElementById(id);
  note.textContent = message;
  note.className = isError ? 'form-note error' : 'form-note';
  note.hidden = false;
}

function busy(form, on) {
  const btn = form.querySelector('button[type="submit"]');
  btn.dataset.label ||= btn.textContent;
  btn.disabled = on;
  btn.textContent = on ? 'Please wait…' : btn.dataset.label;
}

// A recovery link lands here with its token in the URL fragment. supabase-js
// clears that fragment while its own module loads — before this file runs — so
// the flag is captured by an inline script in the page head instead.
let recovering = window.__recoveryLink === true || location.hash.includes('type=recovery');
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    recovering = true;
    showUpdate('Choose a new password for your account.');
  }
});

const { data: { session } } = await supabase.auth.getSession();

if (session || recovering) {
  showUpdate(session && !recovering
    ? `Signed in as ${session.user.email}. Enter a new password below.`
    : 'Choose a new password for your account.');
} else {
  heading.textContent = 'Reset your password';
  intro.textContent = 'Enter your email and we will send you a link to set a new password.';
  intro.hidden = false;
  requestForm.hidden = false;
}

function showUpdate(message) {
  heading.textContent = 'Set a new password';
  intro.textContent = message;
  intro.hidden = false;
  requestForm.hidden = true;
  updateForm.hidden = false;
}

// ---------- send the recovery email ----------
requestForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = String(new FormData(requestForm).get('email')).trim();

  if (!requestForm.checkValidity()) {
    say('requestNote', 'Enter the email address on your account.', true);
    return;
  }

  busy(requestForm, true);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL('reset.html', location.href).href,
  });
  busy(requestForm, false);

  if (error) {
    say('requestNote', friendlyError(error), true);
    return;
  }

  // Deliberately the same message whether or not the address exists, so this
  // form cannot be used to find out who has an account.
  say('requestNote', 'If that address has an account, a reset link is on its way. Check your inbox.', false);
  requestForm.reset();
});

// ---------- set the new password ----------
updateForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = new FormData(updateForm);
  const password = String(data.get('password'));

  if (password !== String(data.get('confirm'))) {
    say('updateNote', 'Passwords do not match.', true);
    return;
  }
  // checked by hand: the minlength attribute only applies to values the
  // visitor typed, so it misses anything set any other way
  if (password.length < 8) {
    say('updateNote', 'Password must be at least 8 characters.', true);
    return;
  }

  busy(updateForm, true);
  const { error } = await supabase.auth.updateUser({ password });
  busy(updateForm, false);

  if (error) {
    say('updateNote', friendlyError(error), true);
    return;
  }

  // the note lives inside the form, so the confirmation goes in the intro
  // line above it, which stays on screen
  updateForm.hidden = true;
  heading.textContent = 'Password updated';
  intro.textContent = 'Your password has been changed. Taking you to sign in…';
  intro.hidden = false;
  setTimeout(() => { window.location.href = 'login.html'; }, 2500);
});
