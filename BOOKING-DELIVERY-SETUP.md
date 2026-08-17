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
// Torito booking requests -> this sheet
const SECRET = 'put-your-own-random-string-here';

const HEADERS = [
  'created_at', 'kind', 'tour_title', 'tour_slug', 'wanted_date',
  'lesson_time', 'people', 'skill_level', 'lesson_type', 'total',
  'name', 'email', 'phone',
];

// open the /exec URL in a browser: "alive" means this code really is the
// version being served. Apps Script keeps serving the old version until you
// deploy a NEW version, and a missing doPost is the usual symptom.
function doGet() {
  return ContentService.createTextOutput('alive');
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (body.secret !== SECRET) {
    return ContentService.createTextOutput('no');
  }

  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getLastRow() === 0) {
    setUpSheet(sheet);
  }

  const row = HEADERS.map(function (key) {
    return body[key] === undefined || body[key] === null ? '' : body[key];
  });

  sheet.appendRow(row);
  dressRow(sheet, sheet.getLastRow());

  return ContentService.createTextOutput('ok');
}

// Header row, widths and formats. The phone column is forced to plain text:
// a number starting with "+" is read as a formula and lands as #ERROR!
function setUpSheet(sheet) {
  sheet.appendRow(HEADERS.map(function (h) {
    return h.replace(/_/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); });
  }));

  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setFontSize(11)
    .setBackground('#4fb3a0')
    .setFontColor('#ffffff')
    .setVerticalAlignment('middle');

  sheet.setRowHeight(1, 34);
  sheet.setFrozenRows(1);

  const widths = [150, 90, 230, 190, 110, 90, 70, 110, 140, 90, 200, 220, 150];
  widths.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });

  sheet.getRange(2, 13, sheet.getMaxRows() - 1, 1).setNumberFormat('@');   // phone
  sheet.getRange(2, 10, sheet.getMaxRows() - 1, 1).setNumberFormat('0 "GEL"');
  sheet.getRange(2, 1, sheet.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm');
}

function dressRow(sheet, r) {
  const range = sheet.getRange(r, 1, 1, HEADERS.length);
  range.setVerticalAlignment('middle').setFontSize(10);
  if (r % 2 === 0) range.setBackground('#f2fbf7');

  // the timestamp arrives as an ISO string; store a real date so the column
  // sorts and filters as one
  const iso = sheet.getRange(r, 1).getValue();
  if (typeof iso === 'string' && iso.indexOf('T') > 0) {
    sheet.getRange(r, 1).setValue(new Date(iso));
  }
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

---|---|
   | `SHEETS_WEBHOOK_URL` | the Web app URL |
   | `SHEETS_WEBHOOK_SECRET` | the same string you put in `SECRET` |

6. **Redeploy.**

---

## Locally

Put the same values in `.env.local` (already gitignored) if you want to test on
your own machine, then restart `npm run dev`.

## Checking it works

Send a test request from the site. Then:

- **Supabase** → Table editor → `bookings` — the row is there
- **Telegram** — the message arrives within a second or two
- **Sheet** — a new row appears

If the row is in Supabase but nothing arrives in Telegram or the sheet, the
failure is logged in Vercel → your deployment → **Runtime Logs**. Look for
`Telegram notify failed` or `Sheet append failed`.
