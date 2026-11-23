// One Telegram message to the team's alerts chat (TELEGRAM_CHAT_ID), the same
// bot and chat the booking alerts use. Server only: it reads the bot token.
//
// Without the token or chat id it does nothing and resolves false, so every
// caller works with Telegram switched off. A failed send is logged, never
// thrown: an alert being down is not a reason to fail a booking.

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

// Telegram refuses messages over 4096 characters; long reports go in parts
const MAX = 4000;

function parts(text) {
  const out = [];
  let current = '';
  for (const line of String(text).split('\n')) {
    if (current && current.length + line.length + 1 > MAX) { out.push(current); current = ''; }
    current = current ? `${current}\n${line}` : line.slice(0, MAX);
  }
  if (current) out.push(current);
  return out;
}

/** Sends `text` to the alerts chat. Resolves true once Telegram took all of it. */
export async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !text) return false;

  let ok = true;
  for (const chunk of parts(text)) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: chunk, disable_web_page_preview: true }),
      });
      if (!res.ok) {
        ok = false;
        console.error('Telegram send failed:', res.status, (await res.text()).slice(0, 200));
      }
    } catch (error) {
      ok = false;
      console.error('Telegram send failed:', error?.message);
    }
  }
  return ok;
}
