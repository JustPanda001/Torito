// Tells the team on Telegram that a visitor wrote in the chat.
//
// Called by a Supabase database webhook on chat_messages inserts, not by the
// browser, so a message cannot be announced without really having been stored.
// The shared secret is what stops anyone else posting to this address.
//
// The conversation id is the last line of the alert: /api/telegram reads it
// back when the alert is replied to, to know which thread the reply belongs to.

import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Chat alerts go to the support bot. Without one set, they fall back to the
// bookings bot so nothing is lost.
const {
  CHAT_WEBHOOK_SECRET,
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;
const TELEGRAM_BOT_TOKEN = process.env.SUPPORT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.SUPPORT_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

// A visitor typing several short lines in a row should ring the team's phone
// once, not once per line: the first alert carries the link to the thread.
const QUIET_MS = 20 * 1000;

/**
 * True when the same thread had another visitor message less than QUIET_MS
 * before this one. Needs the service role key to read the table from here;
 * without it, or if the lookup fails, every message is announced as before.
 */
async function justAlerted(message) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !message.conversation_id) return false;

  const at = message.created_at ? new Date(message.created_at) : new Date();
  if (Number.isNaN(at.getTime())) return false;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let query = supabase
      .from('chat_messages')
      .select('created_at')
      .eq('conversation_id', message.conversation_id)
      .eq('sender', 'user')
      .lte('created_at', at.toISOString())
      .gte('created_at', new Date(at.getTime() - QUIET_MS).toISOString())
      .limit(1);
    if (message.id) query = query.neq('id', message.id);

    const { data, error } = await query;
    if (error) { console.error('Chat alert throttle lookup failed:', error.message); return false; }
    return data.length > 0;
  } catch (err) {
    console.error('Chat alert throttle lookup failed:', err?.message ?? err);
    return false;
  }
}

export async function POST(request) {
  if (!CHAT_WEBHOOK_SECRET || request.headers.get('x-webhook-secret') !== CHAT_WEBHOOK_SECRET) {
    return Response.json({ error: 'Forbidden.' }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const message = payload?.record;
  // the team's own replies and the auto-reply fire this webhook too
  if (message?.sender !== 'user') return Response.json({ ok: true, skipped: true });
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return Response.json({ ok: true, skipped: true });
  // nothing to show the team
  if (!String(message.body ?? '').trim()) return Response.json({ ok: true, skipped: true });
  if (await justAlerted(message)) return Response.json({ ok: true, skipped: true, throttled: true });

  const inbox = `${new URL(request.url).origin}/chat`;
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: [
        '💬 New chat message',
        String(message.body ?? '').slice(0, 3000),
        '',
        `Reply to this message to answer, or open ${inbox}`,
        `Chat: ${message.conversation_id}`,
      ].join('\n'),
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    console.error('Telegram chat alert failed:', res.status, await res.text());
    return Response.json({ error: 'Telegram refused the alert.' }, { status: 502 });
  }
  return Response.json({ ok: true });
}
