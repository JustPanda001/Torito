// Telegram's webhook: replying to a chat alert answers the visitor on the site.
//
// Only a reply to one of the bot's alerts, from the team's own chat, counts.
// Telegram sends the secret set with setWebhook on every call. Anything else
// gets a plain 200, because Telegram retries whatever it sees fail.
//
// This writes as the service role: there is no signed-in admin here, so the row
// security rules would otherwise refuse a message with sender 'admin'.

import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  CHAT_WEBHOOK_SECRET,
} = process.env;

const CHAT_LINE = /^Chat: ([0-9a-f-]{36})$/m;

export async function POST(request) {
  if (!CHAT_WEBHOOK_SECRET
      || request.headers.get('x-telegram-bot-api-secret-token') !== CHAT_WEBHOOK_SECRET) {
    return Response.json({ error: 'Forbidden.' }, { status: 401 });
  }

  const update = await request.json().catch(() => null);
  const message = update?.message;
  const id = CHAT_LINE.exec(message?.reply_to_message?.text ?? '')?.[1];
  const body = message?.text?.trim();

  if (!id || !body || String(message.chat?.id) !== String(TELEGRAM_CHAT_ID)) {
    return Response.json({ ok: true });
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    await tell(message.chat.id, 'Not sent: SUPABASE_SERVICE_ROLE_KEY is not set.');
    return Response.json({ ok: true });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase
    .from('chat_messages')
    .insert({ conversation_id: id, sender: 'admin', body });

  if (error) console.error('Telegram reply failed:', error.message);
  await tell(message.chat.id, error ? 'Not sent, please answer on the site.' : 'Sent ✓');
  return Response.json({ ok: true });
}

async function tell(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
