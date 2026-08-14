// Tells the visitor when the site cannot reach its database.
//
// Without this a dead backend just reads "Failed to fetch", which means nothing
// to anyone. Two parts: a banner that appears when the server is unreachable,
// and a translator so form errors say something useful.

import { SUPABASE_URL, SUPABASE_KEY } from './supabase.js';

const OFFLINE_MESSAGE =
  'Not connected to the database. Signing in, creating an account and saving changes will not work — the trips below are sample data.';

/** Turns a raw supabase/network error into something a visitor can act on. */
export function friendlyError(error) {
  const message = error?.message ?? String(error ?? '');

  // browsers word this differently: Chrome "Failed to fetch", Firefox
  // "NetworkError when attempting to fetch resource", Safari "Load failed"
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return 'Could not reach the server. The site is not connected to its database yet — see the banner below.';
  }
  return message;
}

/** True when the auth service answers at all. */
async function reachable() {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_KEY },
      cache: 'no-store',
    });
    return true;   // any HTTP reply means the host exists
  } catch {
    return false;  // DNS failure or no network — fetch rejects before a status
  }
}

/** Shows the banner if the backend cannot be reached. Safe to call anywhere. */
export async function watchBackend() {
  if (await reachable()) return;
  showBanner();
}

function showBanner() {
  if (document.querySelector('.offline-banner')) return;

  const bar = document.createElement('div');
  bar.className = 'offline-banner';
  bar.setAttribute('role', 'status');
  bar.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
      <path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>
    </svg>
    <span>${OFFLINE_MESSAGE}</span>
    <button type="button" class="offline-close" aria-label="Dismiss">×</button>`;

  bar.querySelector('.offline-close').addEventListener('click', () => {
    bar.remove();
    document.body.classList.remove('has-offline-banner');
  });

  document.body.appendChild(bar);
  document.body.classList.add('has-offline-banner');
}
