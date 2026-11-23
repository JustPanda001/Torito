// MTANI booking requests -> this sheet (Google Apps Script, bound to the
// booking-log spreadsheet). The site posts here from:
//   app/api/bookings/route.js             a new booking (append a row)
//   lib/bookingStatus.js                  { action: 'status' } Confirm / Decline / Undo / auto-confirm
//   app/api/bookings/cancel/route.js      { action: 'status', status: 'cancelled' }
//   app/api/admin/booking-instructor      { action: 'instructor' } the admin changed the instructor
//
// This is the whole script: paste it over the old one in Extensions -> Apps
// Script, put your own SECRET (and SECOND_SHEET_ID) back, then Deploy ->
// Manage deployments -> edit -> Version: New version -> Deploy. Steps in
// BOOKING-DELIVERY-SETUP.md, "Instructors tab".

const SECRET = 'put-your-own-random-string-here';

// The separate spreadsheet that also gets every instructor assignment: the
// long id in its address, docs.google.com/spreadsheets/d/<THIS PART>/edit.
// Leave the placeholder to skip it.
const SECOND_SHEET_ID = 'PASTE-SECOND-SPREADSHEET-ID-HERE';

// every booking is also copied here, so one tab shows what is coming up next
const ALL_TAB = 'All bookings';

// who teaches which lesson, one row per lesson that assigns instructors
// (Gudauri lessons); the same tab is kept in the second spreadsheet
const INSTRUCTORS_TAB = 'Instructors';
const INSTRUCTOR_HEADERS = ['Date', 'Time', 'Hours', 'Days', 'Discipline', 'Instructor', 'People', 'Booking id', 'Status'];
const I_INSTRUCTOR_COL = 6;
const I_REF_COL = 8;
const I_STATUS_COL = 9;

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
  'name', 'email', 'phone', 'ref', 'status', 'instructor',
];
const REF_COL = HEADERS.indexOf('ref') + 1;               // 14
const STATUS_COL = HEADERS.indexOf('status') + 1;         // 15
const INSTRUCTOR_COL = HEADERS.indexOf('instructor') + 1; // 16

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

// Three kinds of post, all carrying the secret:
//   default              a new booking -> append a row to its trip tab and the
//                        "All bookings" tab (+ the Instructors tabs when the
//                        booking carries instructor_row)
//   action 'status'      { ref, status } -> set the Status cell and the row
//                        colour of every row with that ref, in every tab
//   action 'instructor'  { ref, instructor } -> set the Instructor cell of
//                        every row with that ref
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
    if (body.action === 'instructor') {
      return ContentService.createTextOutput(setInstructor(body.ref, body.instructor));
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

    if (body.instructor_row) {
      const irow = [
        body.wanted_date || '',
        literal(body.lesson_time),
        body.hours || '',
        body.days || 1,
        body.discipline ? String(body.discipline).toUpperCase() : '',
        literal(body.instructor || 'UNASSIGNED'),
        body.people || '',
        literal(body.ref),
        body.status || 'new',
      ];
      instructorBooks().forEach(function (book) {
        addInstructorRow(instructorTab(book), irow);
      });
    }
  } finally {
    lock.releaseLock();
  }

  return ContentService.createTextOutput('ok');
}

// Finds every row whose Ref matches, in every tab (and in the second
// spreadsheet's Instructors tab), and sets its status and colour. Answers
// 'ok', 'not found' (rows from before the Ref column existed have no ref and
// are never found) or 'bad request'.
function setStatus(ref, status) {
  ref = String(ref || '').trim().toUpperCase();
  if (!ref || !LOOK[status]) return 'bad request';

  let found = 0;
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function (sheet) {
    if (sheet.getName() === INSTRUCTORS_TAB) return;
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

  instructorBooks().forEach(function (book) {
    const sheet = book.getSheetByName(INSTRUCTORS_TAB);
    if (!sheet) return;
    eachInstructorRow(sheet, ref, function (r) {
      sheet.getRange(r, I_STATUS_COL).setValue(status);
      paintInstructorRow(sheet, r, status);
      found += 1;
    });
  });
  return found ? 'ok' : 'not found';
}

// The admin changed who teaches a booking: the Instructor cell of every row
// with that ref, in the trip tabs, All bookings and both Instructors tabs.
function setInstructor(ref, name) {
  ref = String(ref || '').trim().toUpperCase();
  if (!ref) return 'bad request';
  const value = literal(name || 'UNASSIGNED');

  let found = 0;
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function (sheet) {
    if (sheet.getName() === INSTRUCTORS_TAB) return;
    const last = sheet.getLastRow();
    if (last < 2 || sheet.getMaxColumns() < INSTRUCTOR_COL) return;
    const refs = sheet.getRange(2, REF_COL, last - 1, 1).getValues();
    refs.forEach(function (cell, i) {
      if (String(cell[0]).trim().toUpperCase() !== ref) return;
      sheet.getRange(i + 2, INSTRUCTOR_COL).setValue(value);
      found += 1;
    });
  });

  instructorBooks().forEach(function (book) {
    const sheet = book.getSheetByName(INSTRUCTORS_TAB);
    if (!sheet) return;
    eachInstructorRow(sheet, ref, function (r) {
      sheet.getRange(r, I_INSTRUCTOR_COL).setValue(value);
      found += 1;
    });
  });
  return found ? 'ok' : 'not found';
}

// ---- the Instructors tabs ----

// this spreadsheet, plus the second one when SECOND_SHEET_ID is filled in
function instructorBooks() {
  const books = [SpreadsheetApp.getActiveSpreadsheet()];
  if (SECOND_SHEET_ID && SECOND_SHEET_ID.indexOf('PASTE-') !== 0) {
    try {
      books.push(SpreadsheetApp.openById(SECOND_SHEET_ID));
    } catch (err) {
      // a wrong id or no access: the main sheet still gets its rows
      console.error('Second spreadsheet not reachable: ' + err);
    }
  }
  return books;
}

function instructorTab(book) {
  const sheet = book.getSheetByName(INSTRUCTORS_TAB) || book.insertSheet(INSTRUCTORS_TAB);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, INSTRUCTOR_HEADERS.length)
      .setValues([INSTRUCTOR_HEADERS])
      .setFontWeight('bold')
      .setFontSize(11)
      .setBackground('#4fb3a0')
      .setFontColor('#ffffff')
      .setVerticalAlignment('middle');
    sheet.setRowHeight(1, 34);
    sheet.setFrozenRows(1);
    [110, 70, 60, 60, 110, 170, 70, 130, 100].forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });
    if (sheet.getMaxRows() > 1) {
      sheet.getRange(2, 2, sheet.getMaxRows() - 1, 1).setNumberFormat('@');   // Time as text
      sheet.getRange(2, I_REF_COL, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
    }
  }
  return sheet;
}

function addInstructorRow(sheet, row) {
  sheet.appendRow(row);
  const r = sheet.getLastRow();
  sheet.getRange(r, 1, 1, INSTRUCTOR_HEADERS.length).setVerticalAlignment('middle').setFontSize(10);
  paintInstructorRow(sheet, r, row[I_STATUS_COL - 1]);
  sortInstructors(sheet);
}

function eachInstructorRow(sheet, ref, fn) {
  const last = sheet.getLastRow();
  if (last < 2) return;
  const refs = sheet.getRange(2, I_REF_COL, last - 1, 1).getValues();
  refs.forEach(function (cell, i) {
    if (String(cell[0]).trim().toUpperCase() === ref) fn(i + 2);
  });
}

function paintInstructorRow(sheet, r, status) {
  const look = LOOK[status] || LOOK.new;
  sheet.getRange(r, 1, 1, INSTRUCTOR_HEADERS.length).setBackground(look.bg).setFontColor(look.font);
  // an unassigned lesson stands out until someone is picked
  const who = sheet.getRange(r, I_INSTRUCTOR_COL);
  if (String(who.getValue()) === 'UNASSIGNED') who.setFontColor('#b4534a').setFontWeight('bold');
  else who.setFontWeight('normal');
}

// earliest lesson on top, then earliest time
function sortInstructors(sheet) {
  const rows = sheet.getLastRow() - 1;
  if (rows < 2) return;
  sheet.getRange(2, 1, rows, INSTRUCTOR_HEADERS.length).sort([
    { column: 1, ascending: true },
    { column: 2, ascending: true },
  ]);
}

// Run this once by hand after pasting, from the function menu: it asks Google
// for permission to open the second spreadsheet and adds its Instructors tab.
function setUpInstructorTabs() {
  instructorBooks().forEach(function (book) { instructorTab(book); });
}

// ---- the booking tabs (unchanged, apart from the Instructor column) ----

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
  setUpSheet(sheet);   // also adds the Ref / Status / Instructor headers to older tabs
  sheet.appendRow(row);
  dressRow(sheet, sheet.getLastRow(), row[STATUS_COL - 1]);
  sortTab(sheet);
}

// All bookings: newest request on top. Trip tabs: by the day of the service.
function sortTab(sheet) {
  if (sheet.getName() === INSTRUCTORS_TAB) sortInstructors(sheet);
  else if (sheet.getName() === ALL_TAB) sortNewestFirst(sheet);
  else sortByDate(sheet);
}

// Run this once by hand after pasting the new code: it re-sorts every tab the
// new way and shows dates without times. Nothing is deleted.
function resortAll() {
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function (sheet) {
    if (sheet.getName() === 'Sheet1' || sheet.getLastRow() < 2) return;
    if (sheet.getName() !== INSTRUCTORS_TAB) {
      // show only the date in Created at, on rows already there too
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).setNumberFormat(FORMATS.created_at);
    }
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
  name: 200, email: 220, phone: 150, ref: 130, status: 100, instructor: 150,
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
// header cells it is missing (the Ref, Status and Instructor columns on older tabs).
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
