// Sign-in and sign-up forms.
import { supabase } from './supabase.js';
import { friendlyError, watchBackend } from './connection.js';

watchBackend();

function showNote(noteId, message, isError) {
  const note = document.getElementById(noteId);
  if (!note) return;
  note.textContent = message;
  note.className = isError ? 'form-note error' : 'form-note';
  note.hidden = false;
}

function busy(form, on) {
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = on;
  btn.textContent = on ? 'Please wait…' : btn.dataset.label;
}

// ---------- sign in ----------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  const btn = loginForm.querySelector('button[type="submit"]');
  btn.dataset.label = btn.textContent;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(loginForm);

    if (!loginForm.checkValidity()) {
      showNote('loginNote', 'Enter your email and password.', true);
      return;
    }

    busy(loginForm, true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(data.get('email')).trim(),
      password: String(data.get('password')),
    });
    busy(loginForm, false);

    if (error) {
      showNote('loginNote', friendlyError(error), true);
      return;
    }
    window.location.href = 'index.html';
  });
}

// ---------- sign up ----------
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  const btn = signupForm.querySelector('button[type="submit"]');
  btn.dataset.label = btn.textContent;

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(signupForm);

    if (data.get('password') !== data.get('confirm')) {
      showNote('signupNote', 'Passwords do not match.', true);
      return;
    }
    if (!signupForm.checkValidity()) {
      showNote('signupNote', 'Please fill in every field correctly.', true);
      return;
    }

    busy(signupForm, true);
    const { data: result, error } = await supabase.auth.signUp({
      email: String(data.get('email')).trim(),
      password: String(data.get('password')),
      options: { data: { full_name: String(data.get('name')).trim() } },
    });
    busy(signupForm, false);

    if (error) {
      showNote('signupNote', friendlyError(error), true);
      return;
    }

    // With email confirmation on, there's no session until the link is clicked.
    if (result.session) {
      window.location.href = 'index.html';
    } else {
      showNote('signupNote', 'Account created. Check your email to confirm it, then sign in.', false);
      signupForm.reset();
    }
  });
}

// ---------- Google ----------
document.querySelectorAll('.auth-btn.google').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/index.html' },
    });
    if (error) {
      const noteId = document.getElementById('loginNote') ? 'loginNote' : 'signupNote';
      showNote(noteId, 'Google sign-in is not enabled yet in the Supabase dashboard.', true);
    }
  });
});
