'use client';

// Threads are deleted 24 hours after their last message.
//
// The database does this on a schedule when pg_cron is available. This is the
// backstop for projects where it is not: the site asks for a sweep when the
// chat is actually used. Once per page load at most — the point is that old
// threads go away, not that they go away to the second.

import { supabase } from './supabaseClient';

export const CHAT_TTL_HOURS = 24;

let swept = false;

/** Best effort: a failed sweep must never block sending or reading a message. */
export async function purgeOldChats() {
  if (swept) return;
  swept = true;

  const { error } = await supabase.rpc('purge_old_chats');
  if (error) console.warn('Chat purge skipped:', error.message);
}

/**
 * True when a thread stored in this browser has aged out. Checked before the
 * widget reuses its saved id, so a visitor whose thread was swept starts a
 * fresh one instead of writing into a row that no longer exists.
 */
export function expired(lastMessageAt) {
  if (!lastMessageAt) return false;
  return Date.now() - new Date(lastMessageAt).getTime() > CHAT_TTL_HOURS * 3600 * 1000;
}
