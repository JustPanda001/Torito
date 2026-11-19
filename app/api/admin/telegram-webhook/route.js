// Points the support bot's Telegram webhook at /api/telegram with the current
// TELEGRAM_WEBHOOK_SECRET (SEC-04). Admin only. The bot token never leaves the
// server; the admin panel's "Re-link Telegram replies" button calls this once
// after the secret changes.

import { createClient } from '@supabase/supabase-js';
import { SITE_URL } from '@/lib/siteUrl';

export const runtime = 'nodejs';

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_KEY,
  TELEGRAM_WEBHOOK_SECRET,
} = process.env;
const BOT_TOKEN = process.env.SUPPORT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

export async function POST(request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return Response.json({ error: 'Please sign in.' }, { status: 401 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth } = await supabase.auth.getUser(token);
  if (!auth?.user) return Response.json({ error: 'Please sign in again.' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', auth.user.id).maybeSingle();
  if (profile?.role !== 'admin') return Response.json({ error: 'Admins only.' }, { status: 403 });

  if (!BOT_TOKEN || !TELEGRAM_WEBHOOK_SECRET) {
    return Response.json({ error: 'The bot token or TELEGRAM_WEBHOOK_SECRET is not set in Vercel.' }, { status: 500 });
  }

  const site = SITE_URL;
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: `${site}/api/telegram`,
      secret_token: TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ['message'],
    }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out.ok) {
    return Response.json({ error: out.description || 'Telegram refused the change.' }, { status: 502 });
  }
  return Response.json({ ok: true, url: `${site}/api/telegram` });
}
