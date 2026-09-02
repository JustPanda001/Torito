// Swaps the header "Log in" link for the signed-in user, and reveals the
// Admin link when that user's profile row has role = 'admin'.
import { currentProfile, signOut } from './supabase.js';
import { watchBackend } from './connection.js';

watchBackend();

const profile = await currentProfile();
const slot = document.querySelector('.icon-btn[href="login.html"]');
if (!slot) throw new Error('no login slot in header');

if (!profile) {
  // signed out — leave the Log in link as it is
} else {
  const name = (profile.full_name || profile.email || 'Account').split(' ')[0];

  const wrap = document.createElement('div');
  wrap.className = 'account-menu';
  wrap.innerHTML = `
    <button class="icon-btn account-btn" type="button">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>
      </svg>
      <span class="hide-sm">${name}</span>
    </button>
    <div class="account-drop" hidden>
      ${profile.role === 'admin' ? '<a href="admin.html" class="admin-link">Admin panel</a>' : ''}
      ${profile.role === 'admin' ? '<a href="chat.html" class="admin-link">Chat</a>' : ''}
      <a href="#">My bookings</a>
      <a href="reset.html">Change password</a>
      <button type="button" class="signout">Sign out</button>
    </div>`;

  slot.replaceWith(wrap);

  const btn = wrap.querySelector('.account-btn');
  const drop = wrap.querySelector('.account-drop');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    drop.hidden = !drop.hidden;
  });
  document.addEventListener('click', () => { drop.hidden = true; });
  wrap.querySelector('.signout').addEventListener('click', signOut);
}
