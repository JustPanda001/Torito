// Receives a message from the Contact page and emails it to the team.
//
// Needs an account, like booking: the request carries the visitor's Supabase
// access token. The name, email and phone in the email come from their account
// and profile, never from the post, so this cannot be used as an open mail
// relay. The post supplies only the message, an optional display name and the
// page language.

import { createClient } from '@supabase/supabase-js';
import { sendContactEmail } from '@/lib/contactEmail';

export const runtime = 'nodejs';

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_KEY,
} = process.env;

const MAX_MESSAGE = 2000;
const MAX_NAME = 80;
// 3 per 10 minutes, 20 per day, per account
const LIMITS = [
  { ms: 10 * 60 * 1000, max: 3 },
  { ms: 24 * 60 * 60 * 1000, max: 20 },
];
const LANGS =['en', 'ka', 'ru', 'zh'];

export async function POST(request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return Response.json({ error: 'Please sign in to send a message.' }, { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  const user = auth?.user;
  if (authError || !user) {
    return Response.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Malformed request.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length < 1) {
    return Response.json({ error: 'Please write a message.' }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE) {
    return Response.json({ error: `Please keep the message under ${MAX_MESSAGE} characters.` }, { status: 400 });
  }
  const typedName = typeof body.name === 'string' ? body.name.trim() : '';
  if (typedName.length > MAX_NAME) {
    return Response.json({ error: `Please keep the name under ${MAX_NAME} characters.` }, { status: 400 });
  }
  const lang = LANGS.includes(body.lang) ? body.lang : 'en';

  // profile as the visitor ("read own profile"); a failed lookup is not fatal
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) console.warn('Contact profile lookup failed:', profileError.message);

  if (!user.email) {
    return Response.json({ error: 'Your account has no email address to reply to.' }, { status: 400 });
  }

  // Rate limit, counted from public.contact_messages as the visitor. If the
  // table is not there yet (CONTACT-RATE-LIMIT.sql not run) the message still
  // goes out, unlimited, and the problem is logged.
  const since = (ms) => new Date(Date.now() - ms).toISOString();
  const [recent, day] = await Promise.all(LIMITS.map(({ ms }) => supabase
    .from('contact_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since(ms))));
  const countError = recent.error || day.error;
  let tableReady = !countError;
  if (countError) {
    console.error('Contact rate limit off (run CONTACT-RATE-LIMIT.sql):', countError.message);
  } else if ((recent.count ?? 0) >= LIMITS[0].max || (day.count ?? 0) >= LIMITS[1].max) {
    return Response.json({ error: 'You have sent a few messages already. Please try again later.' }, { status: 429 });
  }

  if (tableReady) {
    const { error: insertError } = await supabase
      .from('contact_messages')
      .insert({ user_id: user.id, message });
    if (insertError) {
      tableReady = false;
      console.error('Contact message not recorded:', insertError.message);
    }
  }

  try {
    const sent = await sendContactEmail({
      name: typedName || profile?.full_name || '',
      email: user.email,
      phone: profile?.phone || user.user_metadata?.phone || '',
      userId: user.id,
      lang,
      message,
    });
    if (!sent) {
      console.error('Contact email not sent: RESEND_API_KEY or BOOKING_EMAIL_FROM is not set.');
      return Response.json({ error: 'Email is not set up yet.' }, { status: 503 });
    }
  } catch (err) {
    console.error('Contact email failed:', err.message);
    return Response.json({ error: 'Could not send the message.' }, { status: 502 });
  }

  return Response.json({ ok: true });
}
