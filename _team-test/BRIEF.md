# BRIEF — Torito read-only audit

## Goal and success criteria
- Goal: find what is broken, confusing or improvable on the live Torito site (this Next.js app, deployed on Vercel), mainly from a first-time customer's point of view, **without changing anything**.
- Done when:
  1. Five reviews are done: (1) copy and tone, (2) image names and sizes, (3) layout/CSS consistency, (4) internal links and alt text, (5) customer journey.
  2. Every finding cites `file:line`, is placed under **Broken**, **Confusing** or **Could be better**, and is rated **High / Medium / Low**.
  3. All findings sit in `_team-test/REPORT.md`; judgment calls in `_team-test/DECISIONS.md`.
  4. No file outside `_team-test/` was created, edited, moved or deleted (checked with `git status` at the end).

## Hard rules (every agent)
- **Read only.** Do not edit, create, move, rename or delete any project file. No `npm`/`pnpm` install, build, dev server, lint `--fix`, formatter, git write command (commit, push, checkout, stash, reset) or deploy.
- Do not sign up, log in, submit forms, post reviews, call the Supabase database or the `/api/bookings` route. Do not open the live site in a browser.
- Do not read `.env.local` (it holds keys). `.env.example` is fine.
- Skip `node_modules/` and `.next/`. Do **not** audit `C:\Users\Mylaptop\Desktop\Tourism` (old unused copy).
- Write your findings only to your own notes file in the shared notes folder (see Ownership). Never write inside the repo.

## Audience
- Site visitors: international travellers (English UI, Georgian `ka` toggle in `lib/i18n.js`) looking for winter activities in Gudauri (ski/snowboard instructors, freeride, snowmobile, paragliding) and summer hikes, camping, mountaineering (Kazbek) and transfers across Georgia.
- Report readers: the site owner, non-specialist. Write plainly; explain the customer impact of each item in one sentence.

## Style / voice / design tokens (as found in the code)
- **Colors** (`app/globals.css:1-30`, light theme):
  - primary green `--green-500 #4fb3a0` (buttons `.hot-btn` `app/globals.css:1655`, `.btn-pill.btn-winter` `:1950`), dark green `--green-700 #3f8f80`, light greens `#eefaf3 / #d8f3e4 / #8fd6c4`
  - blues `--blue-50 #eef7fc`, `--blue-100 #d6eefa`, `--blue-300 #a9d9e8`
  - text `--ink #2f4a55`, secondary text `--ink-soft #5c7784`
  - surfaces `--surface #fff`, `--surface-2 #f7fafb`, `--page-bg #f4f7f8`
  - frequent hard-coded accents: `#e8a33d` (amber, 9×), `#d8574a` / `#b4462a` / `#d64b32` (reds), `#39707f` (tag text)
  - dark theme overrides at `app/globals.css:32-53` (`--ink #e6edf0`, `--page-bg #121a1d`, `--surface #182226`)
- **Fonts**: single system stack `"Segoe UI",system-ui,-apple-system,sans-serif`, body line-height 1.65 (`app/globals.css:62-67`). No web fonts loaded. Section titles `clamp(24px,2.4vw,32px)` weight 700 (`:240`). Logo text 800 weight, 16px, 1.5px tracking (`:96`).
- **Spacing / radius**: `--radius 20px`, `--radius-lg 28px`, pills `999px`; `--shadow 0 8px 24px rgba(47,74,85,.08)`; page max width `--max 1440px`; header height `80px`; `.section` padding `72px 28px` (`:239`). Buttons: `.btn-pill` 15px 40px, 600 weight, 16px (`:231`); `.hot-btn` 13px 26px (`:1655`). Tags: 12px uppercase, .08em tracking (`:313`).
- **Breakpoints in use** (many, not a fixed set): 380, 430, 480, 520, 560, 600, 640, 700, 760, 800, 820, 900, 1000, 1100, 1200 px.
- **Tone** (from `app/page.js`, `app/about/page.js`, `lib/i18n.js`): warm, plain, concrete, first-person plural ("we carry the tents, cook dinner on the fire"), second person to the reader, specific facts (Kazbek 5,054 m, Dec – Mar). Mostly no exclamation marks (exception: chat greeting `lib/i18n.js` "Hello! …"). Hero headline is all-caps "WINTER IS HERE".
  - Tone words: warm, local, practical, safe, unhurried.
  - Flag as off-tone: hype words ("unforgettable", "world-class", "breathtaking"), stacked exclamation marks, placeholder text, mixed English/Georgian mid-sentence, inconsistent names for the same thing.

## Decisions already made
- The audit is suggestions only; no fixes are applied (user instruction).
- Findings go to the notes folder first, then are merged by the orchestrator into REPORT.md (so only three files appear in the repo).
- Ratings: **High** = stops or seriously misleads a customer, or breaks a page; **Medium** = noticeable friction, inconsistency or trust problem; **Low** = polish.

## Naming conventions / canonical terms
- Use the site's own terms: "trip"/"tour" (both are used — report the inconsistency, don't pick one), "Winter" (category `ski`), "Hiking", "Camping", "Mountaineering", "Transfer", "Favorites", "Bookings".
- Cite files as repo-relative paths with line: `app/tours/[slug]/page.js:123`.

## File/folder layout (what exists)
```
app/            layout.js, page.js (home), globals.css (2332 lines, the only stylesheet)
  about/ contact/ faq/ login/ signup/ reset/ chat/ admin/   page.js each
  tours/page.js (listing)   tours/[slug]/page.js (tour detail)
  api/bookings/route.js
components/     35 components (SiteHeader, SiteFooter, TourCard, BookingModal, DateFilter,
                Calendar, ReviewModal, Stars, SignInGate, AccountPrompt, ChatWidget, ...)
lib/            i18n.js, tours-data.js, catalog.js, search.js, availability.js, ratings.js,
                supabaseClient.js, favorites.js, options.js, bookingQuestions.js, ...
public/assets/  28 images/svgs (photos .jpg/.jpe/.jpeg/.webp, icons .svg, torito-logo.png)
*.sql, README.md, BOOKING-DELIVERY-SETUP.md   (context only)
```

## Ownership
| Agent | Model | Owns (may write) | Reads only |
|---|---|---|---|
| orchestrator | opus | `_team-test/BRIEF.md`, `DECISIONS.md`, `REPORT.md` | everything |
| r1-copy | sonnet | `<notes>/r1-copy.md` | app/, components/, lib/i18n.js, lib/tours-data.js, lib/catalog.js |
| r2-images | haiku | `<notes>/r2-images.md` | public/, and grep of app/ components/ lib/ for image paths |
| r3-layout | sonnet | `<notes>/r3-layout.md` | app/globals.css, app/**/page.js, components/ |
| r4-links-alt | sonnet | `<notes>/r4-links-alt.md` | app/, components/, lib/, public/ |
| r5-customer | opus | `<notes>/r5-customer.md` | app/, components/, lib/, README.md, *.sql (schema context) |

`<notes>` = `C:\Users\Mylaptop\AppData\Roaming\Claude\side-session-notes\local_ec5a143f-c631-42a8-b76a-7ed10bd3836f`

## Interface contract — notes file format (every reviewer)
```markdown
# <agent-name> findings
## Broken
- [High] app/tours/[slug]/page.js:212 — <what is wrong>. Customer impact: <one sentence>. Suggestion: <one sentence, not applied>.
## Confusing
- [Medium] ...
## Could be better
- [Low] ...
## Decisions / assumptions
- [<agent-name>] DECISION|QUESTION: <text> (affects: <files>)
```
- One bullet per finding. Every bullet has a rating, a `file:line`, the impact and a suggestion.
- If a claim is uncertain from reading code alone (e.g. depends on database contents), say "likely" and why. Do not invent facts; mark unknowns as TODO.

## Out of scope
- Any code change, fix, PR, commit or deploy.
- `C:\Users\Mylaptop\Desktop\Tourism`.
- Admin-only screens (`app/admin`, `*Editor.js`, `PhotoManager.js`, `AdminNav.js`) except where they affect what customers see.
- Security/penetration testing of Supabase or the API.
