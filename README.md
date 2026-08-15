# Torito — Georgian Ascent Tours

Next.js (App Router) rewrite of the original static site. Tours, hikes, ski and
camping trips across Georgia, with a Supabase backend for accounts and the
admin panel.

## Running it

You need [Node.js](https://nodejs.org) 18.18 or newer. Then:

```bash
npm install
npm run dev
```

The site runs at http://localhost:3000.

## Environment

`.env.local` holds the Supabase connection:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Both come from Supabase → Project Settings → API. Only the **publishable /
anon** key belongs here — `NEXT_PUBLIC_` values are compiled into the browser
bundle, so the `service_role` key must never go in. The data is protected by the
row-level security policies in `supabase-schema.sql`, not by hiding the key.

## Database

Run `supabase-schema.sql` once in the Supabase SQL editor. It creates the
`profiles` and `tours` tables, the trigger that gives every new account a
profile row, and the RLS policies. The commented block at the bottom promotes an
account to admin.

## Layout

```
app/
  page.js              home
  tours/page.js        listing, category + date filters
  tours/[slug]/page.js trip detail and booking
  login, signup, reset auth pages
  admin/page.js        add / edit / delete tours
components/
  Calendar.js          one month grid, used by the filter AND the booking modal
  DateFilter.js        "Any dates" range picker on the listing
  BookingModal.js      date, people, price
  TourCard.js, Gallery.js, SiteHeader.js, SiteFooter.js,
  AccountMenu.js, OfflineBanner.js
lib/
  tours-data.js        placeholder trips, shown until the database has rows
  season.js            recurring MM-DD season windows, shared by filter + booking
  supabaseClient.js    browser client, profile lookup, error wording
```

## Notes

- **Placeholder trips render first.** `lib/tours-data.js` paints immediately and
  is replaced by database rows when they exist, so the page is never blank and
  the site still works with no backend.
- **Seasons are recurring `MM-DD` windows** and may wrap the year
  (`12-01` → `04-15` for ski trips). `lib/season.js` is the single implementation
  used by both the listing filter and the booking calendar, so they cannot
  disagree about when a trip runs.
- **supabase-js is an npm dependency**, not a CDN import. The old site pulled it
  from esm.sh at runtime, which meant a ~15-file module waterfall before the
  first query could start.
