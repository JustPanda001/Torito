// Connection to your Supabase project.
// The publishable key is meant to be public — it only grants what the database
// security rules allow (read tours, manage your own bookings). All admin power
// lives in the `role` column, checked on the server.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://zwmmgrrrryxaulrcuudy.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_AgD0_riluR1ccTSAHUYsLw_zWC_E4P2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/** The signed-in user, or null. */
export async function currentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * The signed-in user's profile row (id, full_name, role), or null when nobody
 * is signed in.
 *
 * A missing profile row is NOT the same as being signed out — accounts created
 * before the trigger existed have no row. Returning null for both made the
 * header show a signed-in user as a guest, so the row is treated as optional
 * and recreated when it is absent.
 */
export async function currentProfile() {
  const user = await currentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) console.warn('Profile lookup failed:', error.message);
  if (data) return { ...data, email: user.email };

  // signed in, but no row — fall back to the auth record so the site still
  // knows who you are, and try to heal it for next time
  const fallback = {
    id: user.id,
    full_name: user.user_metadata?.full_name ?? null,
    role: 'user',
  };
  const { error: insertError } = await supabase.from('profiles').insert(fallback);
  if (insertError) console.warn('Could not create profile row:', insertError.message);

  return { ...fallback, email: user.email };
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}
