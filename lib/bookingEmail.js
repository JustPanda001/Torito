// Customer emails about a booking, sent through Resend: request received,
// waitlist, confirmed, declined and cancelled. Used by /api/bookings (new
// requests), /api/admin/booking-status (admin presses Confirm or Decline) and
// /api/bookings/cancel (the customer cancels).
//
// Server only: it reads RESEND_API_KEY. Without the key or a from-address it
// does nothing and resolves false, so the site works with email switched off.

const { RESEND_API_KEY, BOOKING_EMAIL_FROM, BOOKING_EMAIL_REPLY_TO } = process.env;

// Email clients block SVG, so the logo is a PNG on the live site. A fixed
// address, so a test sent from a preview or localhost still shows it.
const LOGO_URL = 'https://www.mtani.ge/email-logo.png';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "28 Dec 2026" from a YYYY-MM-DD, read as a calendar date (no timezone). */
function niceDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  return m ? `${Number(m[3])} ${MONTHS_SHORT[Number(m[2]) - 1]} ${m[1]}` : null;
}

const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/** Wording per email type. */
function copy(type, row, site) {
  const title = row.tour_title;
  switch (type) {
    case 'waitlist':
      return {
        label: 'Waitlist',
        subject: `You're on the waitlist — ${title} (${row.ref})`,
        lead: `You are on the waitlist for ${title}. We will write to you as soon as a place frees up.`,
        button: ['See my bookings', `${site}/bookings`],
      };
    case 'confirmed':
      return {
        label: 'Booking confirmed',
        subject: `Confirmed — ${title} (${row.ref})`,
        lead: `Good news: your booking for ${title} is confirmed. We look forward to seeing you. We will be in touch before the day with the meeting point and details.`,
        button: ['See my bookings', `${site}/bookings`],
      };
    case 'declined':
      return {
        label: 'Not available',
        subject: `Sorry, this date is not available — ${title} (${row.ref})`,
        lead: `Sorry, we can't take your booking for ${title} on this date. Please pick another date, or reply to this email and we will help you find one.`,
        button: ['Choose another date', row.tour_slug ? `${site}/activities/${row.tour_slug}` : `${site}/activities`],
      };
    case 'cancelled':
      return {
        label: 'Booking cancelled',
        subject: `Cancelled — ${title} (${row.ref})`,
        lead: `Your booking for ${title} is cancelled, as you asked. Nothing is due. You are welcome to book another date any time.`,
        button: ['Choose another date', row.tour_slug ? `${site}/activities/${row.tour_slug}` : `${site}/activities`],
      };
    default:
      return {
        label: 'Request received',
        subject: `Booking request received — ${title} (${row.ref})`,
        lead: `Your booking request for ${title} has gone through. We will check the date with the guide and email you again to confirm.`,
        button: ['See my bookings', `${site}/bookings`],
      };
  }
}

/**
 * Sends one booking email to the account's address on the row.
 * type: 'received' | 'waitlist' | 'confirmed' | 'declined' | 'cancelled'.
 * Resolves true once Resend has taken it, false when email is not set up.
 */
export async function sendBookingEmail(row, site, type = 'received') {
  if (!RESEND_API_KEY || !BOOKING_EMAIL_FROM || !row?.email) return false;

  const c = copy(type, row, site);
  const date = niceDate(row.wanted_date);
  const details = [
    ['Reference', row.ref],
    ['Trip', row.tour_title],
    date && ['Date', `${date}${row.lesson_time ? ` at ${row.lesson_time}` : ''}`],
    ['People', String(row.people)],
    row.skill_level && ['Level', row.skill_level],
    row.lesson_type && ['Lesson', row.lesson_type],
    ...Object.entries(row.answers ?? {}).map(([k, v]) => [k, String(v)]),
    type !== 'declined' && type !== 'cancelled' && row.total != null && ['Total', `${row.total} GEL, paid on the day`],
  ].filter(Boolean);

  const hello = row.name ? `Hello ${row.name.split(' ')[0]},` : 'Hello,';
  const [buttonText, buttonLink] = c.button;

  const text = [
    hello, '', c.lead, '',
    ...details.map(([k, v]) => `${k}: ${v}`), '',
    `${buttonText}: ${buttonLink}`, '',
    'Reply to this email if anything needs changing.', '', 'MTANI',
  ].join('\n');

  const accent = type === 'declined' ? '#b4534a' : type === 'cancelled' ? '#6b7f89' : '#3f8f80';
  const cell = 'padding:8px 0;border-top:1px solid #d8f3e4';
  const html = `<!doctype html><html><body style="margin:0;background:#f4f7f8;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#2f4a55">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
  <table role="presentation" style="margin:0 auto 18px;border-collapse:collapse"><tr>
    <td style="vertical-align:middle;padding-right:10px"><img src="${LOGO_URL}" width="40" height="40" alt="MTANI" style="display:block;border:0"></td>
    <td style="vertical-align:middle;font-size:20px;font-weight:700;letter-spacing:.14em;color:#14212b">MTANI</td>
  </tr></table>
  <div style="background:#fff;border-radius:20px;padding:28px;box-shadow:0 8px 24px rgba(47,74,85,.08)">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${accent}">${escapeHtml(c.label)}</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${escapeHtml(row.tour_title)}</h1>
    <p style="margin:0 0 12px;line-height:1.65">${escapeHtml(hello)}</p>
    <p style="margin:0 0 20px;line-height:1.65">${escapeHtml(c.lead)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      ${details.map(([k, v]) => `<tr><td style="${cell};color:#5c7784">${escapeHtml(k)}</td><td style="${cell};text-align:right;font-weight:600">${escapeHtml(v)}</td></tr>`).join('')}
    </table>
    <p style="margin:24px 0 0"><a href="${escapeHtml(buttonLink)}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px">${escapeHtml(buttonText)}</a></p>
    <p style="margin:20px 0 0;font-size:14px;color:#5c7784;line-height:1.6">Reply to this email if anything needs changing.</p>
  </div>
  <p style="text-align:center;font-size:12px;color:#5c7784;margin:16px 0 0">MTANI · Georgia · <a href="https://www.mtani.ge" style="color:#5c7784">mtani.ge</a></p>
</div></body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: BOOKING_EMAIL_FROM,
      to: [row.email],
      ...(BOOKING_EMAIL_REPLY_TO ? { reply_to: BOOKING_EMAIL_REPLY_TO } : {}),
      subject: c.subject,
      text,
      html,
    }),
  });

  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return true;
}
