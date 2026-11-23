# CODEMAP (written 2026-11-07 at commit 5df5bcf, plus uncommitted changes)

This map replaces exploring, not reading. Read every file you edit in full.
Purposes below come from file names and listings unless marked "seen". Check them before relying on them.

## Stack
Next.js 15 (App Router), React 19, Supabase JS, plain JS (no TypeScript), plain CSS. Dev server: `npm run dev`, port 3000 (`mtani` in `.claude/launch.json`).

## Where shared things live
- Design tokens: `:root` and `:root[data-theme="dark"]` at the top of `app/globals.css` (seen). Teal `--green-*`, blue `--blue-*`, `--ink`, `--surface*`, `--radius`, `--max`. Dark theme swaps the same variables.
- CSS: `app/globals.css` (2382 lines) plus `app/styles/{header,chat,catalog,footer,reviews,booking,trip,contrast,layout}.css`, imported in that order by `app/layout.js`. Order matters.
- Providers (seen, `app/layout.js`): `LanguageProvider`, `FavoritesProvider`, `RatingsProvider`. `ChatWidget` is mounted globally.
- Translations: `lib/i18n.js`, `lib/strings/{auth,booking,calendar,catalog,header,home,pages,trip}.js`, trip content in `lib/trip-translations.js`. The site has 4 languages (commit e10263e); any new text needs all of them.
- Data: Supabase, schema in `supabase-schema.sql`. Tables: `profiles`:10, `tours`:26, `favorites`:81, `tour_options`:94, `chat_conversations`:301, `chat_messages`:312, `bookings`:438, `tour_reviews`:582, `tour_views`:639. Fallback or seed data in `lib/tours-data.js` (confirm).
- One-off SQL at repo root: `RUN-THIS-IN-SUPABASE`, `BOOKINGS-ACCOUNT`, `REVIEWS-MODERATION`, `SERVICE-OPTIONS`, `SLOT-LIMIT`, `WINTER-INCLUDED-FIX`, `OUTDOOR-RELAUNCH`, `REPLACE-OUTDOOR-TRIPS`, `DELETE-OLD-OUTDOOR-TRIPS`, `SEED-SAMPLE-TOURS`.
- Env names: `.env.example`. Never read or print `.env.local`.

## Routes (app/)
- `page.js` home. `activities/page.js` listing. `activities/[slug]/page.js` trip page (498 lines).
- `admin/page.js` admin (661 lines), `admin/reviews/page.js` review moderation.
- `bookings/`, `chat/`, `contact/`, `faq/`, `about/`, `login/`, `signup/`, `reset/`.
- API: `api/bookings/route.js` (318 lines; booking delivery, see `BOOKING-DELIVERY-SETUP.md`), `api/chat-notify/route.js`, `api/telegram/route.js`.

## Components (components/)
- Site chrome: `SiteHeader`, `SiteFooter`, `HeaderToggles`, `AccountMenu`, `AccountPrompt`, `OfflineBanner`, `Flags`, `MtaniLogo` (untracked).
- Catalog: `TourCard`, `HotSection`, `DateFilter`, `FilterIcon`, `SearchSuggest`, `FavoriteButton`, `Stars`.
- Trip page: `Gallery`, `TripPlace`, `StravaEmbed`, `OptionSelect`, `Calendar`, `ReviewModal`.
- Booking: `BookingModal` (628 lines), `DialSelect`, `SignInGate`.
- Chat: `ChatWidget` (455 lines), `Linkify`.
- Admin: `AdminNav`, `AdminTripPreview`, `PhotoManager`, `PlaceSearch`, `InclusionEditor`, `OptionsEditor`, `PairListEditor`, `BookingQuestionsEditor`.

## Lib (lib/)
- Data and client: `supabaseClient`, `catalog`, `tours-data`, `search`, `views`, `ratings`, `favorites`.
- Trip logic: `availability`, `bookable`, `season`, `lessons`, `options`, `itinerary`, `requiredItems`, `coords`, `weather`, `filled`, `slug`.
- Booking and chat: `bookingQuestions`, `bookingRef`, `dial-codes`, `chatExpiry`.
- Content: `photo-credits`.

## Gotchas
- Two folders: this repo is the live app (GitHub `JustPanda001/Torito` `main`, served by Vercel). `Desktop\Tourism` is the old static site. In that clone, local `main` tracks `origin/static-site`.
- `main` has uncommitted work in 20 files, plus untracked `components/MtaniLogo.js`, `public/assets/mtani-logo.svg`, `public/assets/mtani-mark.svg` and `_team-test/`. It looks like a rename to MTANI. Do not overwrite or discard it.
- Three names are in play: MTANI in the code (51 uses, plus `package.json`), Torito (3 uses in code, plus the repo name), XNomads (presentation files in `Tourism\presentation`, none in code).
- Line endings: git warns LF will become CRLF on many files. Expect noisy diffs.
- `SUPABASE_SERVICE_ROLE_KEY` and other non-`NEXT_PUBLIC_` values stay server-only.
- `_team-test/` holds an earlier team run (BRIEF, DECISIONS, REPORT). Treat it as history, not current instructions.
