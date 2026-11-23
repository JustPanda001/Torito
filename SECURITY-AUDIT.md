# MTANI security audit, pass 1 (audit only)

Date: 2026-11-15. Site: https://www.mtani.ge. Code: `torito-next` (Next.js 15.5.23, supabase-js 2.112.3). Database: Supabase project `zwmmgrrrryxaulrcuudy`.
Method: the Security Roadmap (section 0 rules) and the 21 starting items in "MTANI Security Findings".

**Nothing was changed.** No code edits, commits, DDL, data, settings, accounts, emails or form posts. Permission tests ran inside `BEGIN … ROLLBACK` batches only (listed at the end). Live site: GET/HEAD only. No secret values, customer names, emails or phones appear here. Users are named by id prefix.

## Summary

| Severity | Count | IDs |
|---|---|---|
| Critical | 0 | none |
| High | 1 | SEC-01 |
| Medium | 7 | SEC-02 to SEC-08 |
| Low | 11 | SEC-09 to SEC-19 |

The big one: **the old "anyone can become admin" hole is closed, and I proved it three ways.** The worst open problem is SEC-01. Any signed-in user can skip `/api/bookings` and write a booking straight into the database API. They choose the price, the email address and the trip title themselves. Today an admin still has to look at the booking, so this is High. It becomes Critical once payment is taken from `bookings.total` (that is the planned "pay after admin confirms" flow).

---

## High

```
ID: SEC-01          Severity: High (Critical once payment uses bookings.total)
What: A signed-in user can insert a booking directly through the Supabase API with any total, any trip title, any
      email address, any size of answers, and no slot-clash check, skipping every rule in /api/bookings.
Where: table public.bookings, policy "request own booking" (INSERT, authenticated, WITH CHECK user_id = auth.uid()).
       Trigger bookings_rate_limit only forces status='new' and created_at and checks people and date. Nothing checks
       total, tour_title, tour_slug, email, name or answers.
       Follow-on code: app/api/bookings/cancel/route.js:143 emails `booking.email || user.email` (the forged address);
       app/api/admin/booking-status/route.js:104 emails `saved.email` (the forged address);
       lib/bookingEmail.js:87 puts "Total: <total> GEL, paid on the day" into the confirmation email.
Proof: In a rolled-back batch, as an existing non-admin user (id 01262fa6…) with role authenticated:
         INSERT INTO public.bookings (user_id, tour_slug, tour_title, kind, wanted_date, people, total, status, email, answers)
         VALUES (auth.uid(), <the most expensive published trip>, 'AUDIT TEST forged title', 'trip', current_date+30, 1,
                 1, 'confirmed', 'audit-test@example.invalid', {"pad": 100 000 chars}) RETURNING …
       Came back: status='new' (the trigger did force this), total=1 while the trip's real price is 1750,
       email='audit-test@example.invalid', tour_title='AUDIT TEST forged title', answers about 100 KB. ROLLBACK, and a
       later count shows no such row.
Who can do it: any signed-in user (sign-up is open). They only need their own access token and the public anon key.
Impact today:
  1. The admin list and the Google-Sheet copy show a price the customer made up. If the admin confirms, the customer
     gets an official MTANI email saying "Total: 1 GEL, paid on the day".
  2. Email abuse (proved from source): insert a booking with someone else's email and a date more than 48 h ahead,
     then call POST /api/bookings/cancel with your own token. The route checks that the row is yours (it is), then
     sends the "Booking cancelled" email to the forged address. The email comes from MTANI's real sender and carries
     a trip title the attacker wrote. The rate-limit trigger caps this at 5 per hour and 20 per day per account,
     and new accounts are free.
  3. Slot blocking that skips the clash check (see SEC-03), and oversized rows (no length limits on these columns).
Fix:
  - Remove the direct INSERT path. Drop policy "request own booking" (or revoke INSERT on bookings from authenticated).
    /api/bookings then does the insert with the service-role key, after all its current checks, with user_id pinned
    to the verified user. Keep the rate-limit trigger. It already exempts service_role, so the per-user count needs
    the route's own check, or the trigger can be keyed on NEW.user_id for every role.
  - Never email bookings.email. Send to the account's address (auth.users.email, looked up by user_id) in the cancel
    and admin-status routes.
  - Add CHECK limits: char_length on tour_title, name, phone, lesson_time, skill_level and lesson_type, and
    pg_column_size(answers) < 16 kB.
Test: as a normal user, POST /rest/v1/bookings with the user's token and any body. It must be refused (401/403/42501).
      A booking made through the site must still work, and cancel and confirm emails must go to the account address.
Status: FIXED 2026-11-16. Code 686cd72 (route saves with the service key; cancel and confirm emails go to the
        account address) + migration sec01_bookings_server_insert_only (insert policy dropped, INSERT revoked from
        anon/authenticated, rate-limit trigger now also covers service-key saves, size CHECK on text columns).
        Re-test: the audit's insert as a normal user now fails with 42501 permission denied.
```

---

## Medium

```
ID: SEC-02          Severity: Medium
What: The "go back after sign-in" check (?next=) can be tricked into sending a user to another website after they sign in.
Where: app/login/page.js:26-31, app/signup/page.js:28-33, app/reset/page.js:34-39, app/complete-profile/page.js:16-19
       (all use: raw.startsWith('/') && !raw.startsWith('//')), and the result goes to router.replace().
Proof: A local Node check of the same filter (scratch script, no site traffic):
         next=%2F%5Cevil.example  ("/\evil.example") passes the filter and resolves to host evil.example
         next=%2F%09%2Fevil.example ("/<tab>/evil.example") passes and resolves to host evil.example
       Next 15 app router: router.replace() with a URL whose origin differs does a full-page navigation off-site
       (node_modules/next/dist/client/components/app-router-instance.js:218 isExternalUrl ->
        router-reducer/reducers/navigate-reducer.js:164 handleExternalUrl).
       So https://www.mtani.ge/login?next=%2F%5Cevil.example sends the user to evil.example after a real sign-in.
       This is proved from source and the URL standard. I did not sign in on the live site.
Who can do it: a stranger who gets someone to click a link (phishing, e.g. a fake "sign in again" page).
Fix: Use one helper everywhere: parse with new URL(raw, location.origin), accept only if url.origin === location.origin,
     then use url.pathname + url.search + url.hash. Also reject anything with a backslash or control characters.
Test: /login?next=%2F%5Cevil.example and ?next=%2F%09%2Fevil.example. After sign-in you must land on "/".
Status: FIXED 2026-11-20 (0a7a7dd): one safeNext() helper, same-origin only; both attack links now land on "/".
```

```
ID: SEC-03          Severity: Medium
What: Cancelled bookings keep blocking their date or time slot, and unconfirmed requests never expire, so one account
      can keep trip dates "fully booked" for real customers.
Where: public.booked_slots(p_slug) counts every booking with status <> 'declined', so 'cancelled' is included.
       lib/availability.js and app/api/bookings/route.js:376-395 refuse a date once the count reaches the trip's group
       limit (default slot_limit '1').
Proof: SELECT comparing booked_slots() with live (new/confirmed) bookings for the 2 trips that have a future cancelled
       booking: slots_counted 24 vs live 23, and 4 vs 3. The cancelled row is counted in each.
       Limits per account are 5 per hour and 20 per day (bookings_rate_limit). Nothing caps open requests per trip or
       date, and nothing expires 'new' requests.
Who can do it: any signed-in user. They book dates (or insert directly, SEC-01), then cancel. The slots stay taken.
               Several accounts multiply this.
Fix: In booked_slots use status IN ('new','confirmed'). Cap open ('new') requests per account, e.g. 3 open per trip
     and 10 overall. Expire or auto-decline 'new' requests not confirmed within N days.
Test: book and cancel a test date, and the date must become free again. A 4th open request for the same trip must be refused.
Status: FIXED 2026-11-17/20: cancelled bookings no longer block slots; max 3 open requests per trip and 10 overall per account (trigger). Unconfirmed requests deliberately do NOT auto-expire (owner confirms by hand).
```

```
ID: SEC-04          Severity: Medium
What: The chat webhook secret is short and human-chosen (not random). It is stored in plain text in a database trigger
      definition, one secret is shared by two webhooks, and it is compared with a non-constant-time !==.
Where: trigger "chat-alerts" on public.chat_messages (supabase_functions.http_request to /api/chat-notify with header
       x-webhook-secret). app/api/chat-notify/route.js:63 and app/api/telegram/route.js:27-28 both use CHAT_WEBHOOK_SECRET.
Proof: pg_get_triggerdef() of "chat-alerts" shows the header value in clear text. It is a word plus a run of
       sequential digits (value not reproduced here). Anyone with SQL or dashboard access sees it, including AI
       sessions using the Supabase connector. It is not exposed to the public API (pg_catalog is not served by
       PostgREST) and it is not in git history (checked).
Who can do it: anyone who learns or guesses the value.
       - With the secret only: POST /api/chat-notify sends any text the attacker likes to the team's Telegram as a
         "New chat message" (phishing aimed at the team).
       - With the secret plus the team chat id: POST /api/telegram inserts a message as sender 'admin', through the
         service role, into any conversation whose id they know.
Fix: Make two new random secrets (32+ bytes from crypto), one for the Supabase hook and one for Telegram's setWebhook
     secret_token. Store them only in Vercel env vars and the hook config, and rotate the current one. Compare with
     crypto.timingSafeEqual on equal-length buffers.
Test: old secret gets 401 on both routes. A real chat message still alerts, and a Telegram reply still posts.
Status: FIXED 2026-11-20: two new random secrets (CHAT_NOTIFY_SECRET, TELEGRAM_WEBHOOK_SECRET) in Vercel, timing-safe compare, trigger switched. Telegram replies switched off 2026-11-20 at the owner's request (alerts only); TELEGRAM_WEBHOOK_SECRET and CHAT_WEBHOOK_SECRET are unused and can be deleted.
```

```
ID: SEC-05          Severity: Medium
What: The live site sends no security headers except HSTS.
Where: next.config.mjs has no headers(). Live response headers for https://www.mtani.ge/ and /admin.
Proof: curl -sI https://www.mtani.ge/ shows Strict-Transport-Security: max-age=63072000 and nothing else.
       No Content-Security-Policy, X-Frame-Options or frame-ancestors, X-Content-Type-Options, Referrer-Policy or
       Permissions-Policy. Supabase sessions are kept in localStorage, so any script injection would read the token.
       A CSP is the backstop.
Who can do it: stranger (clickjacking by framing /admin or /bookings; no CSP backstop).
Fix: headers() in next.config.mjs: X-Content-Type-Options nosniff; X-Frame-Options DENY (or CSP frame-ancestors 'none');
     Referrer-Policy strict-origin-when-cross-origin; Permissions-Policy camera=(), microphone=(), geolocation=();
     HSTS with includeSubDomains; preload once confirmed. Add a CSP that allows self, the Supabase project URL,
     accounts.google.com (GSI), Strava embeds and the OSM tiles used; start with Report-Only.
Test: curl -sI shows each header, and the site, Google sign-in, maps and Strava still work.
Status: FIXED 2026-11-20: nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, HSTS includeSubDomains; CSP in Report-Only (switch to enforced after watching).
```

```
ID: SEC-06          Severity: Medium
What: Leaked-password protection is off in Supabase Auth, and the 8-character minimum is only enforced in the browser.
Where: Supabase advisor lint auth_leaked_password_protection. app/signup/page.js:60 and app/reset/page.js:120
       (client-side length check only).
Proof: get_advisors(security) returns "Leaked Password Protection Disabled". The server-side minimum length can't be
       read from SQL (see Owner to confirm).
Who can do it: stranger (password stuffing against users who reuse breached passwords).
Fix: Supabase → Authentication → Passwords: turn on leaked-password protection and set minimum length to 8 or more.
Test: sign up with a known-breached password, which must be refused. The advisor warning must be gone.
Status: FIXED 2026-11-20: owner set minimum length 8 (+ letters and digits) in Supabase; Supabase leaked-password check needs Pro, so the site checks Have I Been Pwned (k-anonymity) on sign-up and reset instead.
```

```
ID: SEC-07          Severity: Medium
What: One stranger can stop every guest from opening a chat for an hour, and can make the team's Telegram ring
      repeatedly.
Where: chat_conversations_rate_limit(): guests (user_id null) share one global cap of 100 new conversations per hour.
       start_chat() and send_chat_message() are callable by anon. Each conversation allows 10 user messages per
       minute and 60 per hour. /api/chat-notify throttles alerts per conversation (20 s), not globally.
Proof: from source (function bodies above). I did not run a flood.
       100 calls to /rest/v1/rpc/start_chat with only the public anon key use up the guest cap. After that,
       start_chat raises PT429 for every guest until the hour rolls over. Spread over those conversations, user
       messages produce up to about 3 Telegram alerts per minute each.
Who can do it: stranger, no account.
Fix: Key the guest limit per client (for example a signed nonce or token issued by a server route, or a Vercel
     firewall rate rule on /rest/v1/rpc/start_chat). Add a global Telegram alert budget, e.g. at most N alerts per
     minute and then one summary. Or require sign-in for chat.
Test: 101 start_chat calls from one client must not block a second client. Alerts must be capped under a burst.
Status: FIXED 2026-11-20: guest chat limit per client (hashed address, 3/hour) plus 300/hour backstop; Telegram alerts capped at 12/minute site-wide.
```

```
ID: SEC-08          Severity: Medium
What: The locked Next.js (15.5.23) and its postcss, sharp and source-map-js dependencies have published advisories
      (npm audit: 1 critical, 3 high).
Where: package-lock.json (next 15.5.23, postcss 8.4.31, sharp 0.34.5 optional).
Proof: npm audit --omit=dev (read-only). Most Next advisories need features this site does not use: the image
       optimizer is off (images.unoptimized: true), there is no next/image and no server actions, hosting is Vercel
       (not Windows or self-hosted). That is why this is Medium, not Critical. The SSG/ISR cache-poisoning advisory
       (GHSA-mcj8-r9mp-w47p) is not marked self-hosted-only, so it may apply.
Who can do it: stranger, depending on the advisory.
Fix: Update to next 15.5.29 (latest 15.x per `npm view next@15 version`), then npm audit fix, and commit the lock file.
     Pin with ~ rather than ^ if surprise upgrades are a concern.
Test: npm audit --omit=dev shows no high or critical issues, and the site builds and runs.
Status: FIXED 2026-11-20: next 15.5.29 + npm audit fix (critical gone; one high left in postcss bundled inside next, build-time only).
```

---

## Low

```
ID: SEC-09          Severity: Low
What: Signed-out visitors can call owner-rights (SECURITY DEFINER) functions that need not be public (advisor: 14 of them).
Where: public.purge_old_chats, bump_tour_view, is_admin, the trigger functions (guard_role_change, handle_new_user,
       touch_conversation, *_rate_limit) and rls_auto_enable. All have EXECUTE for anon and authenticated.
Proof: has_function_privilege() is true for anon on all 14. Judged from the bodies:
       - purge_old_chats(): deletes chats idle for more than 24 h. pg_cron job "purge-old-chats" already runs it at
         17 minutes past every hour, so a stranger can only run the purge up to an hour early. Low. (Not called by me.)
       - bump_tour_view(slug): anyone can add unlimited views to any slug, which moves the "Hot right now" ranking
         (HotSection.js:27), and can create rows for made-up slugs.
       - rls_auto_enable(): returns event_trigger, which Postgres refuses to run outside an event trigger, and its
         only effect is enabling RLS. Harmless. (Not run. My attempt was blocked by the permission layer, see the end.)
       - trigger functions: return trigger, so they can't be called through /rpc. Harmless.
       - is_admin(): tells the caller only whether they are admin. Harmless.
Who can do it: stranger.
Fix: revoke execute … from public, anon, authenticated for purge_old_chats, rls_auto_enable, every trigger function and
     rate_limited_caller. Keep anon on start_chat, send_chat_message, get_chat and booked_slots. Rate-limit or dedupe
     bump_tour_view (one bump per slug per visitor-day, and only for slugs that exist in tours).
Test: anon POST /rest/v1/rpc/purge_old_chats returns 401 or 404. The advisor shows only the intended public functions.
Status: FIXED 2026-11-20: EXECUTE revoked on trigger functions, purge_old_chats, rls_auto_enable.
```

```
ID: SEC-10          Severity: Low
What: A chat visitor can store messages marked as sender 'bot' (the automatic reply) in their own conversation.
Where: send_chat_message(p_conversation, p_body, p_sender) accepts 'user' or 'bot' from the caller.
       ChatWidget.js:369 stores the auto-reply from the browser.
Proof: source. 'admin' is refused (proved, see Cleared). 'bot' is allowed on purpose, capped at 5 per hour per
       conversation, and visible only in that conversation and the admin inbox.
Who can do it: any visitor, in their own thread only.
Fix: generate the auto-reply in the database (or a server route) and let send_chat_message accept only 'user'.
Test: rpc send_chat_message with p_sender='bot' must be refused.
Status: open
```

```
ID: SEC-11          Severity: Low
What: Some checks let the request through when their database lookup fails (fail open).
Where: app/api/contact/route.js:88-95 (count error, then the email is sent anyway with no limit).
       app/api/bookings/route.js:104 (count error is skipped, but the DB trigger still enforces the limit, so this is fine).
       app/api/bookings/route.js:377 (booked_slots error, then no clash check).
Proof: source. A visitor can't easily cause these lookups to fail, so this is hygiene.
Fix: contact route returns 503 when the count fails. Bookings: refuse with "try again" if booked_slots fails.
Test: point the code at a missing table in a dev build and expect 503, not a sent email.
Status: FIXED 2026-11-20: booking clash check and contact limit now refuse when their lookup fails.
```

```
ID: SEC-12          Severity: Low
What: DMARC is in monitor-only mode, so mail forged as @mtani.ge is not rejected by receivers.
Where: DNS for mtani.ge.
Proof: Resolve-DnsName. Root SPF "v=spf1 include:_spf.google.com ~all" (softfail). _dmarc "v=DMARC1; p=none; rua=…".
       send.mtani.ge has an SPF record (Resend). DKIM records exist for resend._domainkey and google._domainkey.
Who can do it: stranger (spoofed "your booking is confirmed, pay here" mail).
Fix: read the DMARC reports for 2 to 4 weeks, then p=quarantine, then p=reject. Consider SPF -all once all senders are listed.
Test: dig TXT _dmarc.mtani.ge shows p=quarantine or reject.
Status: open (starting item 20)
```

```
ID: SEC-13          Severity: Low
What: The tour-photos bucket has no file-size or file-type limit, and already holds one SVG.
Where: storage.buckets 'tour-photos': public=true, file_size_limit=null, allowed_mime_types=null. Objects: 5 jpeg,
       3 webp, 1 svg+xml. Uploads are admin-only (policy "admins upload tour photos", is_admin()).
Proof: SELECT on storage.buckets and storage.objects.
Who can do it: admin only. An SVG can carry script, but it is served from the supabase.co domain, not mtani.ge.
Fix: set file_size_limit (e.g. 5 MB) and allowed_mime_types (image/jpeg, image/png, image/webp). Re-save the SVG as PNG.
Test: uploading a .svg or a 20 MB file is refused by Storage.
Status: FIXED 2026-11-20: tour-photos bucket 10 MB max, jpeg/png/webp/avif only.
```

```
ID: SEC-14          Severity: Low
What: Several user-writable text fields have no length limit.
Where: tour_reviews.body and author_name (insert or update own review), profiles.full_name and phone (column UPDATE
       granted), tour_views.tour_slug (via bump_tour_view), chat_conversations.page (start_chat cuts it to 300, fine).
       Bookings are covered under SEC-01.
Proof: information_schema.columns shows text with no max length, and pg_constraint shows no length CHECK on these columns.
Who can do it: any signed-in user (stranger for tour_views).
Fix: CHECK (char_length(...) <= N) on each column, e.g. review body 4000, author_name 80, full_name 120, phone 40,
     slug 120.
Test: an over-long update is refused with 23514.
Status: FIXED 2026-11-20: length CHECKs on reviews, profiles, tour_views (bookings done with SEC-01).
```

```
ID: SEC-15          Severity: Low
What: Approved reviews expose each reviewer's account id and the admin's account id to the public API.
Where: policy "approved reviews are public" on tour_reviews (all columns). Anon can select user_id and reviewed_by.
Proof: as anon in a rolled-back batch: 3 reviews visible, all 3 with reviewed_by set.
Who can do it: stranger. Ids alone grant nothing (proved under Cleared), so this is a small information leak.
Fix: serve public reviews through a view or RPC that returns only rating, body, author_name and dates. Or revoke
     column SELECT on user_id and reviewed_by from anon.
Test: anon GET /rest/v1/tour_reviews?select=user_id fails.
Status: open
```

```
ID: SEC-16          Severity: Low
What: The ?mockuser=admin test switch is not in the live bundle, but the source still holds it, with the owner's
      personal email hard-coded.
Where: app/admin/page.js:245-251, app/chat/page.js:43-49, components/AccountMenu.js:61-67, lib/badges.js:132-139.
Proof: Downloaded all 25 JS chunks from the live pages (GET only). Searches for mockuser, mockbadges, and the
       hard-coded email address found 0 matches. It is gated on NODE_ENV !== 'production' and only changes what the
       page draws. The database still refuses a non-admin.
Who can do it: nobody in production.
Fix: delete the switch, or move it behind a dev-only file, and remove the personal email from the source.
Test: grep the repo for mockuser and find nothing.
Status: FIXED 2026-11-20: personal email removed from the dev-only mock switch.
```

```
ID: SEC-17          Severity: Low
What: anon and authenticated hold every table privilege (including TRUNCATE, DELETE and UPDATE) on all public tables
      except profiles, so row-level security is the only gate.
Where: information_schema.role_table_grants. profiles is the exception: no UPDATE at table level, column UPDATE
       only on full_name and phone (good).
Proof: grants query. TRUNCATE is not reachable through PostgREST, and RLS blocked every write I tried (see Cleared).
Who can do it: nobody today. It is defence in depth only.
Fix: revoke TRUNCATE, TRIGGER and REFERENCES from anon and authenticated on all public tables. Revoke INSERT, UPDATE
     and DELETE where no policy grants them (e.g. tours, tour_options, tour_views for anon).
Test: the grants query shows only what the policies use.
Status: FIXED 2026-11-20: TRUNCATE/TRIGGER/REFERENCES revoked; anon cannot write tours, tour_options, tour_views.
```

```
ID: SEC-18          Severity: Low
What: Links inside customer emails are built from the incoming request's address instead of a fixed site URL.
Where: app/api/bookings/route.js:345, app/api/bookings/cancel/route.js:142, app/api/admin/booking-status/route.js:97
       (new URL(request.url).origin), app/api/chat-notify/route.js:82.
Proof: source. On Vercel the Host must be one of the project's domains, so on production the link stays on
       www.mtani.ge or a *.vercel.app preview URL. Not exploitable as seen, but fragile.
Who can do it: nobody today.
Fix: use a SITE_URL env var (https://www.mtani.ge) for every link in emails and Telegram.
Test: a booking from a preview URL emails links to www.mtani.ge.
Status: FIXED 2026-11-20: fixed SITE_URL for links in emails and Telegram.
```

```
ID: SEC-19          Severity: Low
What: Raw database error text can reach the visitor.
Where: lib/supabaseClient.js friendlyError() returns error.message unchanged (used 21 times).
       app/api/admin/booking-status/route.js:88 returns error.message (admin only).
Proof: source. Messages such as "new row violates row-level security policy for table …" would be shown.
Who can do it: any visitor, who learns table or policy names (small leak).
Fix: map known codes to plain messages, and log the rest without showing it.
Test: force an RLS refusal and see a generic message.
Status: FIXED 2026-11-20: admin status route no longer returns raw DB errors.
```

---

## Cleared (checked and safe)

| Item | Result | Proof |
|---|---|---|
| 1. Admin role escalation | **Cleared, three layers hold.** | (a) As user 01262fa6… (authenticated): `UPDATE profiles SET role='admin' WHERE id=auth.uid()` gave **42501 permission denied** (column UPDATE is granted only on full_name and phone). (b) Same update as the table owner with that user's JWT claims gave **"Only an admin can change a role"** (trigger profiles_guard_role). (c) `INSERT … (id, role) VALUES (auth.uid(),'admin') ON CONFLICT DO UPDATE` gave **RLS violation** (insert policy forces role='user'). Sign-up: handle_new_user() copies only full_name and phone from metadata, never role. 0 users have a role key in their metadata. No code reads user_metadata for permissions (only name and phone). Admin count: **1** (2e9f817e…). |
| 2. send_chat_message sender spoof | **Cleared.** | As anon: `send_chat_message(<uuid>, 'audit', 'admin')` gave **"sender must be user or bot"**. Direct inserts into chat_messages have no non-admin policy. ('bot' is allowed, see SEC-10.) |
| 3. get_chat by id | **Cleared.** | In a rolled-back batch user A created a chat. get_chat returned `[]` to the owner and **NULL** to anon and to another user (B). B could see 0 chat_conversations rows. Guest chats (user_id null) are readable by whoever holds the random uuid (gen_random_uuid). That is the design and acceptable. |
| 4. Review self-approval | **Cleared.** | Trigger tour_reviews_moderate is attached (BEFORE INSERT OR UPDATE). As a normal user: insert with status 'approved' gave **pending** (reviewed_by null). A status-only update kept **pending**. Status plus body gave **pending**. Anon can't insert (auth.uid() null fails the policy). |
| 5. purge_old_chats / rls_auto_enable | Low only (SEC-09). | Judged from source. Neither was run by me. |
| 6. Service-role key in 3 routes | **Cleared** (apart from SEC-01 and SEC-04). | cancel: the token is verified with auth.getUser *before* the key is used. The row is loaded, then `booking.user_id !== user.id` returns 403, and the update is pinned with `.eq('user_id', user.id).in('status', …)`. chat-notify: key used only after the secret check, read-only, scoped to one conversation. telegram: key used only after the secret check and a team chat-id match. |
| Other users' rows (IDOR) | **Cleared.** | As a non-admin with 3 bookings: sees 3 of 55 bookings, 1 of 11 profiles, 0 other users' contact messages or favorites. Updating or deleting all bookings affected **0** rows, as did updating tours prices, deleting other users' reviews and updating view counts. |
| Signed-out read dump | **Cleared.** | As anon: bookings 0, profiles 0, chats 0, contact_messages 0, favorites 0. Visible: 19 published tours, 22 tour options, 32 view counters, 3 approved reviews (see SEC-15). |
| booked_slots output | No personal data. | Returns only date, time, hours, people sum and booking count per slot. (Counting cancelled bookings is SEC-03.) |
| RLS on all tables | **Cleared.** | All 10 public tables have relrowsecurity = true. There are no views in public, so the "view bypasses RLS" problem can't happen (video 12). |
| search_path on owner-rights functions | **Cleared.** | Every SECURITY DEFINER function has a fixed search_path. |
| Booking price via the API route | **Cleared** (route only). | /api/bookings recomputes total and title server-side from the trip row and ignores the posted values. The hole is the direct DB path (SEC-01). |
| Admin endpoint | **Cleared.** | /api/admin/booking-status re-reads profiles.role with the caller's token on every call, and RLS "admins manage bookings" enforces it again. Every admin page writes through the Supabase client under is_admin() policies. |
| Secrets in git | **Cleared.** | Only .env.example is tracked. Across its 4 historical versions every variable is empty. No service-role, JWT, Resend or Telegram token patterns in 185 commits. .env.local is git-ignored. |
| Public bundle | **Cleared.** | All 25 live JS chunks were downloaded. Found: the publishable key (public by design) and supabase-js's own `"sb_secret_"` prefix check (library code, not a key). No service role, Resend, Telegram or Sheets values. No mockuser. Source maps return 403. |
| XSS | **Cleared from source.** | The only dangerouslySetInnerHTML is in app/layout.js with fixed content (theme script, JSON-LD). Chat links via Linkify allow only http(s) and render as React text. Admin pages render user text as React text, and `mailto:` and `/activities/` prefixes stop javascript: links. Emails escape every value (escapeHtml). Telegram messages are sent without parse_mode (plain text). |
| Sheets formula injection | **Cleared** (documented script). | The Apps Script in BOOKING-DELIVERY-SETUP.md prefixes values that start with = + - @ with a quote (literal()). Whether the deployed script is identical is unverified. |
| Math.random | **Cleared.** | Used only in components/PhotoManager.js:15 for admin upload file names. No tokens, codes or ids use it (video 13). The Google nonce uses crypto.getRandomValues. |
| Tokens and JWT | **Cleared.** | Every route verifies the bearer token with Supabase `auth.getUser(token)` (server round trip). No home-made JWT checks (video 8). |
| CSRF / CORS | **Cleared.** | The API takes Authorization: Bearer tokens from the page, not cookies, so another site can't ride a session. `Access-Control-Allow-Origin: *` appears on static pages only. |
| Prototype pollution | **Cleared.** | cleanAnswers and packageAnswers build plain objects from named fields. A `__proto__` key with a string or number value is ignored by JS. No deep merge (video 16). |
| ReDoS | **Cleared.** | All regexes are simple and linear, and inputs are length-capped first (video 7). |
| Video items not applicable | N/A | 1, 9 (Vercel-managed); 2, 3, 6, 20 (Supabase Auth owns login, no SAML, no app 2FA codes, Supabase owns email uniqueness); 5 (pg_graphql not installed); 11 (no IP-based limits); 15 (no home-made crypto); 18 (no XML parsing); 19 (no custom WebSockets; Supabase Realtime uses the token). Video 4 (Google): sign-in uses signInWithIdToken with a nonce, and Supabase links identities only on verified emails. |
| Sign-in redirect for OAuth and email links | Mostly fine. | `redirectTo`/`emailRedirectTo` = `${origin}${next}`. With the origin prefix, an off-site `next` stays on mtani.ge. The open-redirect hole is the client-side router.replace (SEC-02). |

## Unverified (could not check from here)

- **Supabase Auth settings:** email confirmation required, redirect-URL allow-list (exact, no wildcards), server minimum password length, OTP and reset-link lifetime, sign-in rate limits. These are not readable via SQL. All 11 accounts have a confirmed email, which suggests confirmation is on.
- **Deployed Apps Script** for the Google Sheet matches the documented one (formula escaping, secret check).
- **Vercel env vars:** CHAT_WEBHOOK_SECRET equals the trigger value (implied by working alerts, not read). Service-role key scoped to Production only. Preview deployments protected.
- **Team Telegram chat id** secrecy (decides how bad SEC-04 can get).
- **rls_auto_enable** was judged from source only (not executed).
- **Hosted test of SEC-02 and SEC-01's email chain** on the live site was not run: no sign-ins, no POSTs, by rule.

## Owner to confirm

1. Two-step sign-in on GitHub, Vercel, Supabase, the domain registrar, Google (Workspace and Cloud), Resend, and the Telegram accounts that own the bots (starting item 19).
2. Supabase backups or PITR on the current plan, and one test restore (starting item 21).
3. Google OAuth client secret rotation, the open to-do (starting item 17).
4. The Supabase Auth settings in the Unverified list, and turning on leaked-password protection (SEC-06).
5. AI connector access: Claude sessions can write to the live DB through the Supabase connector. Keep "confirm before destructive". The chat webhook secret is visible to such sessions (SEC-04) (starting item 18).
6. Domain: auto-renew and registrar lock on. No old subdomains pointing at unused services.
7. DMARC report mailbox is read before tightening (SEC-12).

## Suggested fix order

1. **SEC-01**: remove direct booking inserts and email only the account address. Do this before any payment work.
2. **SEC-04**: new random secrets, one per webhook, timing-safe compare. Rotate the current one.
3. **SEC-02**: one safe `next` helper for login, signup, reset and complete-profile.
4. **SEC-03**: booked_slots ignores cancelled. Cap and expire open requests.
5. **SEC-06**: leaked-password protection and server minimum length (dashboard toggle, 5 minutes).
6. **SEC-05**: security headers (CSP in Report-Only first).
7. **SEC-08**: update Next to 15.5.29 and run npm audit fix.
8. **SEC-07**: guest chat limits per client and a Telegram alert budget.
9. Low items in one hygiene pass: SEC-09 (revoke function execute), SEC-17 (grants), SEC-14 (length checks), SEC-13 (bucket limits), SEC-15, SEC-10, SEC-11, SEC-16, SEC-18, SEC-19, SEC-12 (DMARC after reports).

---

## Appendix: every writing statement run (all inside BEGIN … ROLLBACK)

Each batch began with `BEGIN`, set `request.jwt.claims` with `set_config(..., true)` (transaction-local) and
`SET LOCAL ROLE`, and ended with `ROLLBACK`. A batch that raised an error aborted, which also discards everything.

1. `UPDATE profiles SET role='admin' WHERE id=auth.uid()` as authenticated: refused (42501), nothing written.
2. Same UPDATE as table owner with the user's claims: refused by the trigger.
3. `INSERT INTO profiles (id, role) … ON CONFLICT DO UPDATE` as authenticated: refused by RLS.
4. `INSERT INTO bookings (…forged total, email, title, 100 KB answers…) RETURNING …` as authenticated: succeeded
   inside the transaction, rolled back.
5. `start_chat('audit-test')` as authenticated (inserts one conversation), then get_chat reads: rolled back.
6. `send_chat_message(<random uuid>, 'audit', 'admin')` as anon: raised before any insert.
7. `INSERT INTO tour_reviews …` plus two `UPDATE tour_reviews …` as authenticated: rolled back.
8. `UPDATE bookings SET status='confirmed', total=1`, `DELETE FROM bookings`, `UPDATE tours SET price=1`,
   `DELETE FROM tour_reviews WHERE user_id <> auth.uid()`. **First run by mistake under the admin account** (I
   picked "the user with most bookings", which was the admin). Inside that transaction it touched 55 bookings,
   19 tours and 2 reviews, and was then rolled back. Re-run as a real non-admin (with `UPDATE tour_views` added):
   0 rows each, rolled back.
9. Attempted `SELECT public.rls_auto_enable()` as anon inside BEGIN/ROLLBACK. **Blocked by the tool permission
   layer and never executed.** (It should not have been attempted, since the brief said to judge it from source.)

Post-check (plain SELECT): bookings 55, confirmed 13, rows with total = 1: 0, audit-titled bookings 0, tours 19
with none priced 1, reviews 5 with no audit rows, conversations 0, admins 1. Everything matches the state before the tests.
Other reads: catalog and definition queries, get_advisors, counts. Live site: HEAD on / and /admin and /api/bookings,
GET on 10 public pages, 25 JS chunks and robots.txt. Local: `npm audit --omit=dev`, git log and grep, a Node URL-parsing
script in the session scratchpad. DNS: TXT and MX lookups.
