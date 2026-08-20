// Supabase browser client.
//
// The old static site pulled supabase-js from the esm.sh CDN at runtime, which
// meant a ~15-file module waterfall before the first query could even start.
// Here it is a normal npm dependency, bundled by Next, so that cost is gone.

import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// createClient throws on an empty url, and this module is imported by pages that
// are prerendered at build time — so a deployment with the env vars missing
// would fail the build outright rather than just losing its database. Falling
// back to a placeholder keeps the build green; the requests then fail at
// runtime and OfflineBanner explains why.
const CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY);

if (!CONFIGURED) {
  console.warn(
    'Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and '
    + 'NEXT_PUBLIC_SUPABASE_ANON_KEY (locally in .env.local, on Vercel in '
    + 'Settings > Environment Variables).',
  );
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_KEY || 'placeholder-key',
);

/** The signed-in auth user, or null. */
export async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

/**
 * The signed-in user's profile row, or null when nobody is signed in.
 *
 * A missing profile row is NOT the same as being signed out — accounts created
 * before the database trigger existed have no row. Treating both as null made
 * the header show a signed-in user as a guest, so the row is optional here and
 * recreated when it is absent.
 */
export async function currentProfile() {
  const user = await currentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, phone')
    .eq('id', user.id)
    .maybeSingle();

  if (error) console.warn('Profile lookup failed:', error.message);
  if (data) return { ...data, email: user.email };

  const fallback = {
    id: user.id,
    full_name: user.user_metadata?.full_name ?? null,
    phone: user.user_metadata?.phone ?? null,
    role: 'user',
  };
  const { error: insertError } = await supabase.from('profiles').insert(fallback);
  if (insertError) console.warn('Could not create profile row:', insertError.message);

  return { ...fallback, email: user.email };
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = '/';
}

/** Turns a raw supabase/network error into something a visitor can act on. */
export function friendlyError(error) {
  const message = error?.message ?? String(error ?? '');
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return 'Could not reach the server. The site is not connected to its database yet.';
  }
  return message;
}
