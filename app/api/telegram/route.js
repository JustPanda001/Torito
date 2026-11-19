// Telegram replies to chat alerts are switched off (owner, 2026-11-20): alerts
// only notify the team, who answer from the /chat inbox on the site. This
// address stays so Telegram's old webhook gets a quiet 200 instead of
// retrying an error; it does nothing and reads nothing.

export const runtime = 'nodejs';

export async function POST() {
  return Response.json({ ok: true, ignored: true });
}
