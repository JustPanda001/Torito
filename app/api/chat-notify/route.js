// Tells the team on Telegram that a visitor wrote in the chat.
//
// Called by a Supabase database webhook on chat_messages inserts, not by the
// browser, so a message cannot be announced without really having been stored.
// The shared secret is what stops anyone else posting to this address.
//
// The conversation id is the last line of the alert: /api/telegram reads it
// back when the alert is replied to, to know which thread the reply belongs to.

export const runtime = 'nodejs';

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, CHAT_WEBHOOK_SECRET } = process.env;

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
