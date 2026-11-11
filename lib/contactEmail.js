// Emails the team a message sent from the Contact page, through Resend, the
// same provider and sender as lib/bookingEmail.js (RESEND_API_KEY and
// BOOKING_EMAIL_FROM). Reply-To is the customer, so the team just presses reply.
//
// Server only. Goes to CONTACT_EMAIL_TO when set, otherwise support@mtani.ge
// (the address shown on the Contact page).
//
// Resolves true once Resend has taken it, false when email is not set up.

const { RESEND_API_KEY, BOOKING_EMAIL_FROM, CONTACT_EMAIL_TO } = process.env;

const TEAM_EMAIL = CONTACT_EMAIL_TO || 'support@mtani.ge';

const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/** Strips line breaks so a name cannot inject extra email headers. */
const oneLine = (v) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim();

/**
 * c: { name, email, phone, userId, lang, message }.
 */
export async function sendContactEmail(c) {
  if (!RESEND_API_KEY || !BOOKING_EMAIL_FROM || !c?.email) return false;

  const name = oneLine(c.name) || 'Website visitor';
  const rows = [
    ['Name', name],
    ['Email', oneLine(c.email)],
    ['Phone', oneLine(c.phone) || 'not given'],
    ['Account id', c.userId],
    ['Page language', c.lang],
  ];

  const text = [
    ...rows.map(([k, v]) => `${k}: ${v}`), '',
    'Message:', c.message, '',
    'Press reply to answer the customer.',
  ].join('\n');

  const html = `<!doctype html><html><body style="margin:0;font-family:'Segoe UI',system-ui,sans-serif;color:#2f4a55">
<div style="max-width:560px;margin:0 auto;padding:20px 16px">
  <p style="margin:0 0 12px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#3f8f80">Contact page message</p>
  <table style="width:100%;border-collapse:collapse;font-size:15px">
    ${rows.map(([k, v]) => `<tr><td style="padding:6px 0;border-top:1px solid #d8f3e4;color:#5c7784">${escapeHtml(k)}</td><td style="padding:6px 0;border-top:1px solid #d8f3e4;text-align:right;font-weight:600">${escapeHtml(v)}</td></tr>`).join('')}
  </table>
  <p style="margin:20px 0 6px;color:#5c7784">Message</p>
  <p style="margin:0;line-height:1.65;white-space:pre-wrap">${escapeHtml(c.message)}</p>
  <p style="margin:20px 0 0;font-size:13px;color:#5c7784">Press reply to answer the customer.</p>
</div></body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: BOOKING_EMAIL_FROM,
      to: [TEAM_EMAIL],
      reply_to: oneLine(c.email),
      subject: `Contact form — ${name}`.slice(0, 120),
      text,
      html,
    }),
  });

  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return true;
}
