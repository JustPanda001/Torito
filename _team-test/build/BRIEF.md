# BRIEF — xnomads site fixes (October 2026)

Project root: `C:\Users\Mylaptop\Desktop\torito-next` (Next.js App Router, Supabase, deployed on Vercel at https://www.xnomads.ge).
Never touch `C:\Users\Mylaptop\Desktop\Tourism` (old copy).

## Goal and success criteria
- Goal: apply the owner's 11 requests below without breaking anything that works today.
- Done when:
  1. Each request assigned to you is implemented in the files you own, and works in light and dark theme, desktop and phone (375px wide).
  2. No file outside your ownership row was edited.
  3. Your reply lists files written, how to test it, and any SQL the owner must run.
  4. Any new user-facing text is in English, and every new UI string key you used is listed in `DECISIONS.md` (the translator adds Georgian, Russian and Chinese later).

## Hard rules (every agent)
- Do NOT run `npm install`, `npm run build`, `npm run dev`, any dev server, git write commands (commit, push, stash, checkout, reset), or deploy. The orchestrator builds and tests at the end.
- Do NOT read `.env.local`. Do NOT call Supabase or any live API. Database changes go into a `.sql` file the owner runs by hand in the Supabase SQL editor; make it safe to re-run.
- Do not download anything from the internet unless your scope says so.
- Match the surrounding code: plain JS (no TypeScript), function components, short comments that explain *why*, same naming style. Read a file before editing it.
- Do not invent business facts (phone numbers, emails, legal text). Trip content is the one exception, see the trips scope.

## Audience
International travellers (many from China and Russia from this winter) booking winter activities in Gudauri and transfers. The owner is not a developer: write replies plainly.

## Style / design tokens (from `app/globals.css:1-53`)
- Colors: primary green `--green-500 #4fb3a0`, dark green `--green-700 #3f8f80`, light greens `--green-50 #eefaf3`, `--green-100 #d8f3e4`, `--green-300 #8fd6c4`; text `--ink #2f4a55`, soft text `--ink-soft #5c7784`; surfaces `--surface #fff`, `--surface-2 #f7fafb`, page `--page-bg #f4f7f8`; `--line`. Dark theme overrides at `:root[data-theme="dark"]` — always use the variables, never hard-code a light colour.
- Fonts: system stack `"Segoe UI",system-ui,-apple-system,sans-serif`, body line-height 1.65.
- Radius `--radius 20px`, `--radius-lg 28px`, pills `999px`; shadow `--shadow`. Header height `--header-h 80px`.
- Tone: warm, plain, concrete, "we" for the team, "you" for the reader. No hype words ("unforgettable", "world-class", "breathtaking"), no exclamation marks.

## Decisions already made
- The catalogue route is now `/activities` (was `/tours`); `/tours` and `/tours/:slug` redirect permanently (`next.config.mjs`). Always link to `/activities...`. The Supabase table is still called `tours` — do not rename it.
- Only winter (`category: 'ski'`) and `transfer` can be booked this season. Use `isBookable(tour)` from `lib/bookable.js` (already exists). Non-bookable trips stay visible but show "Unavailable for now" instead of a booking button.
- Hiking, camping and mountaineering trips are replaced by new ones; old ones are deleted by SQL the owner runs.
- Reviews must be approved by an admin before the public sees them.
- Languages: English (default), Georgian `ka`, Russian `ru`, Chinese `zh` (Simplified).
- Each area has its own stylesheet, already imported in `app/layout.js` after `globals.css`: `app/styles/header.css`, `chat.css`, `catalog.css`, `footer.css`, `reviews.css`. Put new CSS in yours; to change an existing rule, override it there rather than editing `globals.css`.

## Naming conventions / canonical terms
- "activity" / "activities" in new UI text, not "tour". (Existing code identifiers like `tour`, `TourCard` stay as they are.)
- Categories: Winter (`ski`), Hiking (`hiking`), Camping (`camping`), Mountaineering (`mountaineering`), Transfer (`transfer`).
- New i18n keys: `area.name` dotted, lower camelCase, e.g. `reviews.pending`.
- CSS classes: kebab-case, prefixed by area for new ones (`chat-…`, `menu-…`, `rev-…`).

## Ownership
| Agent | Model | Owns (may write) | Reads only |
|---|---|---|---|
| orchestrator | opus | `_team-test/build/*`, `next.config.mjs`, `app/layout.js`, `lib/bookable.js`, final integration | all |
| nav-header | sonnet | `components/SiteHeader.js`, `components/HeaderToggles.js`, `components/AccountMenu.js`, `components/Flags.js`, `app/styles/header.css`, in `lib/i18n.js` ONLY `LOCALES` and the `LanguageProvider` / `setLang` code (not the `STRINGS` tables) | rest |
| chat-mobile | opus | `components/ChatWidget.js`, `app/chat/page.js`, `app/styles/chat.css` | rest |
| catalog-ui | sonnet | `components/TourCard.js`, `components/SiteFooter.js`, `app/activities/page.js`, `components/DateFilter.js`, `lib/catalog.js`, `app/styles/catalog.css`, `app/styles/footer.css` | rest |
| reviews-mod | opus | `REVIEWS-MODERATION.sql` (new), `app/admin/reviews/page.js` (new), `components/ReviewModal.js`, `lib/ratings.js`, `components/Stars.js`, `app/styles/reviews.css` | rest |
| trips-content | sonnet | `lib/tours-data.js`, `app/activities/[slug]/page.js`, `components/BookingModal.js`, `REPLACE-OUTDOOR-TRIPS.sql` (new), `_team-test/build/photos.md` (new) | rest |
| translator | sonnet | `lib/i18n.js` `STRINGS` tables (runs after everyone else) | rest |

`app/globals.css` belongs to nobody during the build: do not edit it.

## Interface contracts
1. **Bookable**: `import { isBookable } from '@/lib/bookable';` → `isBookable(tour) === false` means: card shows a small "Unavailable for now" label (catalog-ui); trip page replaces Book / Join waitlist with a disabled "Unavailable for now" button and a line "We are focused on winter this season. Ask us a question if you would like this trip later." — the Ask a question button stays (trips-content).
2. **Chat open state**: while the chat panel is open, ChatWidget sets `document.documentElement.classList.add('chat-open')` and removes it on close/unmount. Anyone with a floating/sticky bar (e.g. the trip page booking bar) may hide it with `.chat-open .their-bar { display:none }` in their own stylesheet.
3. **Admin Reviews link**: AccountMenu (nav-header) shows, for `profile.role === 'admin'`, a menu item "Reviews" linking to `/admin/reviews`, next to the existing admin link. reviews-mod builds that page and checks admin itself (same way `app/admin/page.js` does).
4. **Review status**: `public.tour_reviews.status text not null default 'pending' check (status in ('pending','approved','rejected'))`. Public reads see only `approved`; the author can read their own row at any status; admins read/update all. Existing reviews become `approved`.
5. **Language picker**: `LOCALES = ['en','ka','ru','zh']`; `setLang(code)` saves to `localStorage.lang` as today. The picker lives in the profile/account menu (like the phone dial-code picker style) and also works for signed-out visitors.
6. **New i18n keys**: anyone adding UI text uses `t('key')` and adds the English string as a fallback in their reply + a line in DECISIONS.md: `- [agent] KEY: reviews.pending = "Waiting for approval"`. Until the translator runs, `t()` returns `STRINGS.en[key] ?? key`, so also pass visible English where the key is missing — simplest: hard-code the English string in JSX only if the translator will replace it; prefer listing keys.

## Out of scope
- Renaming the brand "Torito" → "xnomads" in logo/titles (separate decision for the owner).
- Fake phone number, terms/privacy pages, image compression of existing photos.
- Any change to bookings/API/auth flows beyond what your scope says.

---
# WAVE 2 (owner feedback, 21 Oct 2026) — overrides anything above that conflicts

## New decisions
- Header order, left → right after the search box: [Ask AI] · Menu · Dark-mode toggle · Favorites (heart) · Profile. Profile is the far-right item. NO language flag in the header at all — language lives only in the profile/account menu (signed-in and signed-out).
- The Menu opens the old full-width mega menu (as in commit HEAD: `.mega-menu` full width directly under the header, `.mega-inner` 3 columns Catalog / Winter / Info, 2 columns ≤1000px). It must still close on link click, route change, Escape and outside click.
- Every visible UI string goes through `t()`. Area tables live in `lib/strings/<area>.js` (`{ en, ka, ru, zh }`), already merged by `lib/i18n.js`. Each agent writes ONLY its own area file(s). Keys: `<area>.<name>`. Georgian, Russian and Simplified Chinese must be natural, travel-site quality, consistent with existing terms in lib/i18n.js STRINGS (read it). Dates/numbers: use `Intl.DateTimeFormat(locale)` with locale map en→'en-GB', ka→'ka-GE', ru→'ru-RU', zh→'zh-CN'.
- Trip text (title, subtitle, summary, itinerary, included, excluded, stay, duration, difficulty, departure_point, return_info, transport, group_size, walking_per_day) is translated through `localizeTour(tour, lang)` from `lib/trip-translations.js`. Anywhere a trip is rendered (trip page, cards, hot strip, search suggestions, booking dialog), call `const view = localizeTour(tour, lang)` (lang from `useT()`), and render from `view`. Never use the translated text for logic (slugs, categories, prices).
- Language auto-detect from the browser is done (lib/i18n.js); visitor choice in profile wins.
- Booking time zone is Asia/Tbilisi (UTC+4, no DST).
- Contrast: the orchestrator handles button colours in `app/styles/contrast.css`; do not restyle the green buttons yourselves. The disabled "Unavailable for now" button styling is the trip-i18n agent's job (in `app/styles/trip.css`).

## Wave 2 ownership (replaces the earlier table for these files)
| Agent | Model | Owns |
|---|---|---|
| header2 | sonnet | components/SiteHeader.js, HeaderToggles.js, AccountMenu.js, Flags.js, app/styles/header.css, lib/strings/header.js |
| cal-booking | opus | components/Calendar.js, components/BookingModal.js, components/DateFilter.js, components/OptionSelect.js, components/DialSelect.js, lib/availability.js, lib/season.js, lib/lessons.js, app/styles/booking.css (new), lib/strings/booking.js, lib/strings/calendar.js |
| trip-i18n | sonnet | app/activities/[slug]/page.js, components/TripPlace.js, components/Gallery.js, components/StravaEmbed.js, components/ReviewModal.js, components/Stars.js, components/FavoriteButton.js, app/styles/trip.css (new), lib/strings/trip.js |
| auth-pages-i18n | sonnet | app/login, app/signup, app/reset, app/about, app/faq, app/contact, app/bookings (page.js each), lib/strings/auth.js, lib/strings/pages.js |
| site-i18n | sonnet | app/page.js, app/activities/page.js, components/TourCard.js, HotSection.js, SearchSuggest.js, SiteFooter.js, SignInGate.js, AccountPrompt.js, OfflineBanner.js, ChatWidget.js (strings only), lib/catalog.js, lib/strings/home.js, lib/strings/catalog.js |
| trips-content | sonnet | lib/tours-data.js, REPLACE-OUTDOOR-TRIPS.sql, _team-test/build/photos.md |
| trip-text-i18n | sonnet | lib/trip-translations.js (TRIP_TEXT only; keep localizeTour's signature) |
| orchestrator | opus | lib/i18n.js, app/styles/contrast.css, app/layout.js, SQL runs, QA |
Admin pages (app/admin/**, app/chat) stay English — owner-only.
