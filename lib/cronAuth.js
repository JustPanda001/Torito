// Who may call /api/cron/*: Vercel Cron and the Supabase pg_cron job, both
// sending "Authorization: Bearer <CRON_SECRET>". Vercel adds that header by
// itself once CRON_SECRET is set in the project's environment variables; the
// database job reads the same value from Vault ('cron_secret').
//
// No CRON_SECRET set means nobody gets in (secretMatches never matches an
// empty secret), so a forgotten variable fails closed.

import { secretMatches } from '@/lib/secretMatch';

export function cronAuthorized(request) {
  const given = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  return secretMatches(given, process.env.CRON_SECRET);
}
