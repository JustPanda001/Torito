# Where booking requests go

Every "Book a spot" and "Book a lesson" request is saved to the `bookings`
table in Supabase. That row is the record. Telegram and Google Sheets are
copies — if either is not configured, or is down, the request is still saved
and the visitor still gets their confirmation.

Do all three steps below in whatever order you like. Nothing depends on
anything else.

---

## 1. The database (required)

Run `RUN-THIS-IN-SUPABASE.sql` in the Supabase SQL editor. It now creates the
`bookings` table as well as the chat tables. Safe to re-run — it never drops
data.

Without this step, requests fail and the visitor is told to try again.

---

## 2. Telegram (5 minutes)

1. In Telegram, message **@BotFather** and send `/newbot`. Pick any name, then
   a username ending in `bot`. It replies with a **token** that looks like
   `8123456789:AAF…`.
2. Message **your new bot** — send it anything, e.g. `hi`. A bot cannot start a
   conversation, so this step is what allows it to message you.
3. Open this in a browser, with your token pasted in:
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   Find `"chat":{"id":123456789` — that number is your **chat id**.
4. In Vercel → your project → **Settings → Environment Variables**, add:

   | Name | Value |
   |---|---|
   | `TELEGRAM_BOT_TOKEN` | the token from step 1 |
   | `TELEGRAM_CHAT_ID` | the number from step 3 |

5. **Redeploy** (Deployments → ⋯ → Redeploy). Environment variables are read at
   build time, so an existing deployment will not pick them up.

To get the messages in a group instead, add the bot to the group and use the
group's id — it starts with a minus sign.

---

## 3. Google Sheets (10 minutes)

This uses an Apps Script attached to the sheet itself. No Google Cloud project,
no service account, no JSON key.

1. Create a blank sheet. You do **not** need to add headers — the script writes
   them the first time a booking arrives.

2. **Extensions -> Apps Script**. Delete what is there and paste:

```javascript
// MTANI booking requests -> this sheet
const SECRET = 'put-your-own-random-string-here';

// every booking is also copied here, so one tab shows what is coming up next
const ALL_TAB = 'All bookings';

// Only these kinds of trip go into the sheet (the website sends each booking's
// category). Winter only for now; add 'hiking', 'camping', 'mountaineering' or
// 'transfer' here when those trips are running again. Other bookings still
// reach the website admin and Telegram, just not this sheet.
const KEEP = ['ski'];

// New columns go at the END, so the columns of tabs you already have keep
// their positions. ref and status let the site find a row again when the admin
// presses Confirm / Decline / Undo on /admin/bookings.
const HEADERS = [
  'created_at', 'kind', 'tour_title', 'tour_slug', 'wanted_date',
  'lesson_time', 'people', 'skill_level', 'lesson_type', 'total',
  'name', 'email', 'phone', 'ref', 'status',
];
const REF_COL = HEADERS.indexOf('ref') + 1;       // 14
const STATUS_COL = HEADERS.indexOf('status') + 1; // 15

// row colours per status; null = no fill / default text
const LOOK = {
  new: { bg: null, font: null },
  confirmed: { bg: '#e3f4ea', font: null },
  declined: { bg: '#eeeeee', font: '#888888' },
  // cancelled by the customer (free cancellation up to 48 hours before)
  cancelled: { bg: '#f6e3e1', font: '#9a5a52' },
};

// open the /exec URL in a browser: "alive" means this code really is the
// version being served. Apps Script keeps serving the old version until you
// deploy a NEW version, and a missing doPost is the usual symptom.
function doGet() {
  return ContentService.createTextOutput('alive');
}

// Two kinds of post, both carrying the secret:
//   default            a new booking -> append a row to its trip tab and the
//                      "All bookings" tab
//   action 'status'    { ref, status } -> set the Status cell and the row colour
//                      of every row with that ref, in every tab
function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (body.secret !== SECRET) {
    return ContentService.createTextOutput('no');
  }

  // two bookings (or a booking and a status change) at once must not sort or
  // edit the same tab over each other
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (body.action === 'status') {
      return ContentService.createTextOutput(setStatus(body.ref, body.status));
    }

    // bookings from before the site sent a category are kept
    if (body.category && KEEP.indexOf(body.category) === -1) {
      return ContentService.createTextOutput('ok');
    }

    const row = HEADERS.map(function (key) {
      return literal(body[key]);
    });
    addTo(tabFor(body.tour_title), row);
    addTo(tabFor(ALL_TAB), row);
  } finally {
    lock.releaseLock();
  }

  return ContentService.createTextOutput('ok');
}

// Finds every row whose Ref matches, in every tab, and sets its status and
// colour. Answers 'ok', 'not found' (rows from before the Ref column existed
// have no ref and are never found) or 'bad request'.
function setStatus(ref, status) {
  ref = String(ref || '').trim().toUpperCase();
  if (!ref || !LOOK[status]) return 'bad request';

  let found = 0;
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function (sheet) {
    const last = sheet.getLastRow();
    if (last < 2 || sheet.getMaxColumns() < STATUS_COL) return;

    const refs = sheet.getRange(2, REF_COL, last - 1, 1).getValues();
    refs.forEach(function (cell, i) {
      if (String(cell[0]).trim().toUpperCase() !== ref) return;
      sheet.getRange(i + 2, STATUS_COL).setValue(status);
      paintRow(sheet, i + 2, status);
      found += 1;
    });
  });
  return found ? 'ok' : 'not found';
}

function paintRow(sheet, r, status) {
  const look = LOOK[status] || LOOK.new;
  sheet.getRange(r, 1, 1, HEADERS.length)
    .setBackground(look.bg)
    .setFontColor(look.font);
}

// One tab per trip, made the first time that trip is booked, and named after
// it. Renaming a trip in the admin panel starts a new tab.
function tabFor(title) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const name = String(title || 'Other').replace(/[:\\\/?*\[\]']/g, ' ').trim().slice(0, 90) || 'Other';
  return book.getSheetByName(name) || book.insertSheet(name);
}

function addTo(sheet, row) {
  setUpSheet(sheet);   // also adds the Ref / Status headers to older tabs
  sheet.appendRow(row);
  dressRow(sheet, sheet.getLastRow(), row[STATUS_COL - 1]);
  sortTab(sheet);
}

// All bookings: newest request on top. Trip tabs: by the day of the service.
function sortTab(sheet) {
  if (sheet.getName() === ALL_TAB) sortNewestFirst(sheet);
  else sortByDate(sheet);
}

// Run this once by hand after pasting the new code: it re-sorts every tab the
// new way and shows dates without times. Nothing is deleted.
function resortAll() {
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function (sheet) {
    if (sheet.getName() === 'Sheet1' || sheet.getLastRow() < 2) return;
    // show only the date in Created at, on rows already there too
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).setNumberFormat(FORMATS.created_at);
    sortTab(sheet);
  });
}

// newest booking request (created_at) first
function sortNewestFirst(sheet) {
  const rows = sheet.getLastRow() - 1;
  if (rows < 2) return;
  sheet.getRange(2, 1, rows, HEADERS.length).sort({ column: 1, ascending: false });
}

// earliest date on top, then earliest time; requests with no date go last.
// The sort moves each row's colour with it.
function sortByDate(sheet) {
  const rows = sheet.getLastRow() - 1;
  if (rows < 2) return;
  sheet.getRange(2, 1, rows, HEADERS.length).sort([
    { column: 5, ascending: true },
    { column: 6, ascending: true },
  ]);
}

// Run this once by hand: it copies the rows already in Sheet1 into the new tabs.
// Sheet1 itself is left as it is. Those rows have no ref, so their status
// cell stays empty and Confirm / Decline will not colour them.
function splitOldRows() {
  const old = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  const cols = Math.min(HEADERS.length, old.getLastColumn());
  const rows = old.getRange(2, 1, old.getLastRow() - 1, cols).getValues();
  rows.forEach(function (row) {
    while (row.length < HEADERS.length) row.push('');
    addTo(tabFor(row[2]), row);
    addTo(tabFor(ALL_TAB), row);
  });
}

// A value starting with + = - or @ is read as a formula, so "+995 599..."
// lands as #ERROR!. A leading apostrophe tells Sheets to store it verbatim;
// the apostrophe is not part of the value and does not show in the cell.
// This also stops anything typed into the booking form being run as one.
function literal(value) {
  if (value === undefined || value === null) return '';
  return typeof value === 'string' && /^[-=+@]/.test(value) ? "'" + value : value;
}

const WIDTHS = {
  created_at: 150, kind: 90, tour_title: 230, tour_slug: 190, wanted_date: 110,
  lesson_time: 90, people: 70, skill_level: 110, lesson_type: 140, total: 90,
  name: 200, email: 220, phone: 150, ref: 130, status: 100,
};

// The phone column is forced to plain text: a number starting with "+" is
// read as a formula and lands as #ERROR!. Ref too, to be safe.
const FORMATS = {
  // the date only; the time is still stored, so newest-first sorting stays exact
  created_at: 'm/d/yyyy',
  total: '0 "GEL"',
  phone: '@',
  ref: '@',
};

// Header row, widths and formats. Safe to call on every booking: a brand-new
// tab gets the whole header row; a tab that already has one only gets the
// header cells it is missing (the Ref and Status columns on older tabs).
function setUpSheet(sheet) {
  const fresh = sheet.getLastRow() === 0;

  if (sheet.getMaxColumns() < HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), HEADERS.length - sheet.getMaxColumns());
  }

  const have = fresh ? [] : sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  let added = false;

  HEADERS.forEach(function (h, i) {
    if (have[i]) return;
    added = true;
    const col = i + 1;

    sheet.getRange(1, col)
      .setValue(h.replace(/_/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }))
      .setFontWeight('bold')
      .setFontSize(11)
      .setBackground('#4fb3a0')
      .setFontColor('#ffffff')
      .setVerticalAlignment('middle');

    sheet.setColumnWidth(col, WIDTHS[h]);
    if (FORMATS[h] && sheet.getMaxRows() > 1) {
      sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setNumberFormat(FORMATS[h]);
    }
  });

  if (fresh) {
    sheet.setRowHeight(1, 34);
    sheet.setFrozenRows(1);
  }
  return added;
}

function dressRow(sheet, r, status) {
  const range = sheet.getRange(r, 1, 1, HEADERS.length);
  range.setVerticalAlignment('middle').setFontSize(10);
  paintRow(sheet, r, status);

  // the timestamp arrives as an ISO string; store a real date so the column
  // sorts and filters as one
  const iso = sheet.getRange(r, 1).getValue();
  if (typeof iso === 'string' && iso.indexOf('T') > 0) {
    sheet.getRange(r, 1).setValue(new Date(iso));
  }
  sheet.getRange(r, 1).setNumberFormat(FORMATS.created_at);
}
```

3. Change `SECRET` to a long random string of your own. Keep a copy.

4. **Deploy -> New deployment -> Web app**. Set *Execute as* **Me**, and *Who has
   access* **Anyone**. Copy the **Web app URL**.

   "Anyone" is required for the site to be able to post to it. The secret is
   what actually protects it — without the matching string, the script writes
   nothing.

5. In Vercel -> **Settings -> Environment Variables**, add:

   | Name | Value |
   |---|---|
   | `SHEETS_WEBHOOK_URL` | the Web app URL |
   | `SHEETS_WEBHOOK_SECRET` | the same string you put in `SECRET` |

6. **Redeploy.**

**Already set up?** This is the update that adds the **Ref** and **Status**
columns, so that Confirm / Decline / Undo on `/admin/bookings` colours the sheet.

1. Open the sheet -> **Extensions -> Apps Script**, select all, and paste the
   new code over the old.
2. Put **your own existing `SECRET`** back on the first line. It must stay
   exactly the same as `SHEETS_WEBHOOK_SECRET` in Vercel; if the placeholder is
   left in, every post is refused with `no`.
3. **Save**, then **Deploy -> Manage deployments -> edit (pencil) -> Version:
   New version -> Deploy**. Do not make a *New deployment*: that gives a new URL
   and you would have to change `SHEETS_WEBHOOK_URL` in Vercel. A new
   *version* keeps the same URL, so nothing changes in Vercel and no redeploy
   is needed.
4. Check it: open the Web app URL in a browser. It should say `alive`.
5. The next booking adds **Ref** and **Status** header cells at the end of the
   tab it lands in (and of **All bookings**), then fills them in. Tabs nobody
   books keep their old layout until they are used.
6. To bring existing rows across from `Sheet1`, pick `splitOldRows` in the
   function menu and press **Run** once.

**Old rows have no ref.** Bookings added to the sheet before this update have
an empty Ref cell (the sheet never stored an id), so the script cannot find
them: pressing Confirm / Decline on those changes the site but not the sheet.
Only bookings made after the update are tracked. The site logs
`Sheet status update: no row with ref` for those; it is harmless.

**Status colours:** `new` has no fill, `confirmed` is light green, `declined`
is light grey with grey text. If the script is down, the admin page still
works; the failure is logged in Vercel Runtime Logs as
`Sheet status update failed`.

---

## Chat messages on Telegram (10 minutes)

Needs the bot from step 2. A visitor's chat message arrives on Telegram, and
replying to that alert answers them on the site.

1. Make up a long random string using only letters and digits. This is your
   chat secret.
2. In Vercel -> **Settings -> Environment Variables**, add these, then
   **Redeploy**:

   | Name | Value |
   |---|---|
   | `CHAT_WEBHOOK_SECRET` | the chat secret |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase -> Project Settings -> API keys -> service role. Never put this in a `NEXT_PUBLIC_` variable |

3. Supabase -> **Database -> Webhooks -> Create a new hook**:
   - Table `chat_messages`, event **Insert**
   - Type **HTTP Request**, method **POST**
   - URL `https://YOUR-SITE/api/chat-notify`
   - HTTP header `x-webhook-secret` set to the chat secret
4. To turn on replying, open this once in a browser with your values filled in:
   `https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://YOUR-SITE/api/telegram&secret_token=<CHAT_SECRET>`
   It should answer `Webhook was set`.

Reply with Telegram's own **Reply** on the alert. A plain message to the bot
does nothing, because it cannot tell which visitor you mean.

---

## 4. Customer confirmation email (10 minutes)

Every booking and waitlist request emails the customer a "request received"
message with their reference (for example `TOR-3F9A1C2B`), the details and a
link to **My bookings**. It goes only to the email on the customer's account.
It is sent through [Resend](https://resend.com); without it, bookings still
work and the dialog simply does not mention an email.

1. Create a Resend account and add your domain (e.g. `mtani.ge`) under
   **Domains**, then add the DNS records it shows. Until the domain is
   verified, Resend only delivers to your own address.
2. **API Keys -> Create API key** (sending access is enough).
3. In Vercel -> **Settings -> Environment Variables**, add:

   | Name | Value |
   |---|---|
   | `RESEND_API_KEY` | the key from step 2 |
   | `BOOKING_EMAIL_FROM` | e.g. `MTANI <bookings@mtani.ge>` — must be on the verified domain |
   | `BOOKING_EMAIL_REPLY_TO` | optional: where customer replies go, e.g. `info@mtani.ge` |

4. **Redeploy.** A failed send shows in Runtime Logs as `Confirmation email failed`.

## 5. Sign-up brings people back to their trip (2 minutes)

After someone creates an account from the Book button, the confirmation link
in Supabase's email brings them back to that trip with the booking dialog
open. Supabase only allows return addresses you list:

1. Supabase -> **Authentication -> URL Configuration**.
2. **Site URL**: your live address, e.g. `https://mtani.ge`.
3. **Redirect URLs**: add `https://mtani.ge/**` (and your `*.vercel.app`
   address, and `http://localhost:3000/**` for local testing).

Without this, the link still confirms the account but lands on the Site URL.

## 6. My bookings (1 minute, once)

Run `BOOKINGS-ACCOUNT.sql` in the Supabase SQL editor. It links requests made
before this change to their accounts by email, so they show on My bookings
too. New requests are linked automatically.

---

## Locally

Put the same values in `.env.local` (already gitignored) if you want to test on
your own machine, then restart `npm run dev`.

## Checking it works

Send a test request from the site. Then:

- **Supabase** → Table editor → `bookings` — the row is there
- **Telegram** — the message arrives within a second or two
- **Sheet** — a new row appears, with its Ref filled in and Status `new`
- **Sheet status** — on `/admin/bookings` press Confirm on that booking: its row turns light green and Status says `confirmed`

If the row is in Supabase but nothing arrives in Telegram or the sheet, the
failure is logged in Vercel → your deployment → **Runtime Logs**. Look for
`Telegram notify failed` or `Sheet append failed`.
