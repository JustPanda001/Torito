# DECISIONS

Format: `- [agent-name] DECISION|QUESTION: <text> (affects: <files>)`

- [orchestrator] DECISION: Reviewers write their raw findings to their own files in the shared notes folder (outside the repo), not to this file, so parallel agents never write the same file and the repo gets exactly the three allowed files. The orchestrator merges their decisions here. (affects: _team-test/*)
- [orchestrator] DECISION: `.env.local` is not read by anyone — it holds keys, and the audit does not need them. (affects: .env.local)
- [orchestrator] DECISION: No dev server, build or browser visit of the live site. The customer journey is walked through the code only; anything that depends on what is in the database is marked "likely". (affects: REPORT.md)
- [orchestrator] DECISION: Model routing — image inventory is mechanical (haiku); copy, layout and links/alt reviews are standard reading (sonnet); the customer journey needs reasoning across many files (opus); merging and de-duplication done by the orchestrator (opus). (affects: all reviews)
- [orchestrator] DECISION: Admin screens are out of scope except where they change what customers see. (affects: app/admin, *Editor.js)

## Merged from reviewers (raw notes kept in the shared notes folder: r1-copy.md … r5-customer.md)
- [r1-copy] DECISION: app/chat and app/admin copy treated as admin-only and out of scope. (affects: app/chat/page.js)
- [r1-copy] DECISION: did not pick a winner for trip/tour/activity/adventure; only a proposed set is given. (affects: lib/i18n.js)
- [r1-copy] DECISION: "placeholder promises" rated High because they cover cancellation and refund terms. (affects: app/faq/page.js, app/about/page.js)
- [r1-copy] QUESTION: are the trips in lib/tours-data.js real offers or samples? Is each price per person, per slot or per vehicle? Should About, FAQ and trip pages be translated? (affects: lib/tours-data.js, components/BookingModal.js)
- [r2-images] DECISION: "referenced" means a literal path in app/, components/, lib/ or *.sql. Admin uploads were not checked, so "unused" may be wrong for images an admin chose. (affects: public/assets)
- [r2-images] DECISION: duplicate and content judgements are based on names, sizes and dimensions; no picture was viewed by this reviewer. "Over 300 KB" means more than 300,000 bytes. The folder holds 25 files, not 28 as BRIEF said. (affects: public/assets)
- [r2-images] QUESTION: are the SEED/OUTDOOR SQL files applied to the live database? (affects: lib/tours-data.js, *.sql)
- [r3-layout] DECISION: contrast ratios were calculated from hex values, not measured. Overlap and z-index findings are "likely". The missing footer on auth pages is treated as a design choice. (affects: app/globals.css)
- [r4-links-alt] ASSUMPTION: .jpe files couldn't be viewed, so their alt checks are by filename. svaneti(1).webp and camping.jpg were viewed. (affects: app/page.js)
- [r4-links-alt] DECISION: home winter and activity card images with alt="" count as correct, because their label is inside the link. (affects: app/page.js:80,95)
- [r5-customer] DECISION: today is taken as 2026-10-19 (winter off-season), which is why the calendar issue is rated Medium. Supabase email confirmation is assumed to be on (the default). (affects: components/Calendar.js, app/signup/page.js)
- [r5-customer] DECISION: security of /api/bookings (it trusts the total sent by the browser and has no rate limit) is outside BRIEF scope, so it was noted but not rated. (affects: app/api/bookings/route.js)

## Orchestrator integration decisions
- [orchestrator] DECISION: duplicates across reviews are merged into one item that carries every reviewer's tag. Where the ratings differed, the higher rating was kept when a customer is directly affected: placeholder phone, terms links and "My bookings" are High; "Ask AI" is Medium. (affects: REPORT.md)
- [orchestrator] DECISION: several claims were spot-checked against the code before merging, and all were confirmed: the Ask AI alert(), the shared z-index 300, terms links going to /tours, no app/not-found.js, the included-list fallback, no user_id in the booking route, the transfer seat filter, the chat autoReply mismatch, the trip page starting from findTour, and no emailRedirectTo. (affects: REPORT.md)
- [orchestrator] DECISION: the r5 note that /api/bookings trusts the price total sent by the browser is mentioned here only. It is a possible pricing-integrity issue worth a separate security look. (affects: app/api/bookings/route.js)
- [orchestrator] DECISION: no separate verifier agent was used. The output is a findings report with no code changes, so the orchestrator's spot-check and integration pass were judged enough. (affects: REPORT.md)
