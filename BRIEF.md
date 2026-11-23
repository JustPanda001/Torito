# BRIEF (run 4, 2026-11-08)

## Goal and success criteria
1. badges: replace number counters with a single "!" dot that means "something new you haven't looked at":
   - Favorites (header heart): today shows a count "1". New rule: when the visitor adds a favorite, the heart shows "!"; once they open the favorites view, the "!" disappears; adding another favorite shows it again. Removing never shows it. Persist "seen" in localStorage (wrap in try/catch).
   - Admin (account menu links "Chat" and "Booking requests", and the account/avatar button itself): "!" when there are unread chat conversations (chat_conversations.admin_unread = true) or bookings with status 'new' that the admin hasn't opened yet. Opening /chat or /admin/bookings clears that link's "!" (bookings: store last-seen newest created_at in localStorage; chat: admin_unread already exists).
   - Customer (account menu "My bookings" link + avatar button): "!" right after they make a booking request, and again when any of their bookings changes status (confirmed/declined). Opening /bookings clears it. Store a map {bookingId: status} last seen in localStorage and compare with their bookings (RLS lets them read their own).
   - Light polling only (e.g. on page load + every 60s while tab visible); no heavy realtime.
2. seo: the site is known by search engines as "Torito" (old cached title). Make the site clearly MTANI to search engines and link previews, for the new domain https://mtani.ge:
   - metadataBase https://mtani.ge, default title "MTANI — Ski, Hikes, Camping & Climbs in Georgia" with template "%s · MTANI", description, Open Graph + Twitter tags (siteName MTANI, an OG image 1200x630 generated or a static file in public/), app/robots.js, app/sitemap.js (static pages + all published trip slugs from Supabase with the anon key, falling back to lib/tours-data.js), per-trip metadata via generateMetadata in app/activities/[slug]/layout.js (exists, server component), JSON-LD Organization/TravelAgency with name MTANI.
   - Per-page titles for static pages via small layout.js files where pages are client components.
3. Hidden rename: chat storage key 'torito.chat.conversation' -> 'mtani.chat.conversation' with migration (read old key once, move it, delete old), event 'torito:chat-open' -> 'mtani:chat-open' (update all dispatchers).

## Decisions
- Name is MTANI, final. New domain: mtani.ge (www.mtani.ge redirects to it or vice versa — use apex https://mtani.ge as canonical).
- Use existing CSS variables; "!" badge = same visual slot as the current count badge, small round, accent colour, white "!". Works in light and dark.
- No new DB columns unless unavoidable (log in DECISIONS.md if so; don't run SQL).

## Ownership
| Agent | Model | Owns |
|---|---|---|
| badges | sonnet | components/SiteHeader.js, components/AccountMenu.js, components/HeaderToggles.js (only if needed), lib/favorites.js, new lib/badges.js, app/bookings/page.js (only to mark seen), app/admin/bookings/page.js (only to mark seen), app/chat/page.js (only if needed), components/ChatWidget.js (only the key/event rename), any file dispatching 'torito:chat-open', CSS appended at end of app/globals.css under /* ---- badges ---- */ |
| seo | sonnet | app/layout.js (metadata only), app/robots.js, app/sitemap.js, app/activities/[slug]/layout.js (add generateMetadata, keep the notFound logic), new app/<page>/layout.js metadata files for static pages, public/og-image.png (generate with sharp from existing photo + logo), lib/seo.js |

## Rules
- Nobody commits/pushes/stages/reverts. Never read .env.local or print secrets. Don't run next build (dev server on :3000; you may use it). Read every file you edit in full.
