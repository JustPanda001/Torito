# Torito site audit — REPORT

**Read-only.** Nothing in the site was changed. Every item below is a suggestion; none has been applied.
Audited: `C:\Users\Mylaptop\Desktop\torito-next` (the live Next.js app). Not audited: `C:\Users\Mylaptop\Desktop\Tourism`.
Method: code reading only. No dev server, no build, no visit to the live site, no database or API calls, `.env.local` not opened. Anything that depends on what is in the Supabase database or on how a screen actually renders is marked **likely**.

Ratings: **High** = stops or seriously misleads a customer, or breaks a page · **Medium** = noticeable friction, inconsistency or trust problem · **Low** = polish.
Source tags show which review found each item: `copy` (r1), `img` (r2), `css` (r3), `links` (r4), `cust` (r5). Items found by more than one review appear once, with every tag.

Totals after merging duplicates: **Broken 25 · Confusing 56 · Could be better 42** (123 items).

---

## Top 5 fixes from a customer's point of view

1. **Let people request a trip without creating an account first.** Today the Book button needs a full sign-up, likely followed by an email confirmation that does not bring them back to the trip. The database already accepts guest requests. — `app/tours/[slug]/page.js:252`, `components/SignInGate.js:74-80`, `app/signup/page.js:47-67`, `RUN-THIS-IN-SUPABASE.sql:184-186`
2. **Close the loop after booking.** Send an automatic "request received" email with a reference number, and make "My bookings" a real page. Today the customer gets no email, and "My bookings" goes to the catalogue. Bookings are also saved without the account's `user_id`. — `components/BookingModal.js:268`, `components/AccountMenu.js:144`, `app/api/bookings/route.js:68-83`
3. **Remove the placeholders a visitor can see.** That means the `+995 000 000 000` phone number, the terms and privacy links that go to /tours, the "Ask AI" alert, and placeholder cancellation and refund promises. Also make the contact form actually send. — `components/SiteFooter.js:25`, `app/contact/page.js:17,25-30`, `app/signup/page.js:114`, `components/SiteHeader.js:125`, `app/faq/page.js:3,17,21`
4. **Make prices clear and correct.** Show "from X GEL" on the listing cards. Use the right unit (per person, per slot or per vehicle), and put payment and cancellation terms next to the Book button. Fix the "What's included" lists that promise a hotel, lift pass and transfer on a 2-hour lesson. — `components/TourCard.js:46-99`, `app/tours/[slug]/page.js:215`, `components/BookingModal.js:412,462`, `lib/tours-data.js:51-58,235-247,413-417`
5. **Stop "Trip not found" from showing on real trips, and make the first page load faster.** Add a loading state on the trip page. Resize the hero photos: about 1.8 MB loads up front, and one 768px photo is stretched to full width. — `app/tours/[slug]/page.js:47,89-103`, `app/page.js:9-14,44-48`, `next.config.mjs:2-5`

---

## Broken

### High
- [High] `app/tours/[slug]/page.js:47` (shown at `:89-103`) — The trip page starts from the built-in sample list. A trip that exists only in the database shows "Trip not found" until Supabase answers, and keeps showing it if Supabase is slow or down. There is no loading state. **Impact:** a visitor opening a real trip from the listing, a shared link or Google first sees "not found" (likely, depending on which trips are database-only). **Suggestion:** show a loading skeleton, and say "not found" only after the fetch comes back empty. `links` `cust`
- [High] `components/SiteFooter.js:25`, `app/contact/page.js:17` — The phone and WhatsApp number is the placeholder `+995 000 000 000`, with a live `tel:` link. It is in the footer on every page. The file comment at `app/contact/page.js:3-4` calls these details placeholders, and it is not known whether `hello@torito.ge` works. **Impact:** a customer who calls before booking reaches nothing, and the site looks fake. **Suggestion:** put in the real number, or remove the line. `copy` `links` `cust`
- [High] `app/signup/page.js:114` — The "terms" and "privacy policy" links both go to `/tours`. No Terms or Privacy page exists, and the `nav.terms` key (`lib/i18n.js:30`) is unused. **Impact:** visitors are asked to agree to documents they cannot read, which hurts trust and leaves a legal gap. **Suggestion:** add /terms and /privacy pages and open them in a new tab. `copy` `links` `cust`
- [High] `components/AccountMenu.js:144` — "My bookings" links to the catalogue (`/tours`), and no page lists a customer's requests, even though the sign-in gate promises "Your requests in one place" (`lib/i18n.js:182`). **Impact:** after booking, a customer cannot check what they asked for. **Suggestion:** build the page, or hide the link and the promise. `copy` `links` `cust`
- [High] `app/api/bookings/route.js:68-83` — Saved bookings never set `user_id`, and the route uses the anon key with no user session. The "read own bookings" rule (`RUN-THIS-IN-SUPABASE.sql:188-189`) therefore never matches. **Impact:** bookings are not linked to accounts, so a "My bookings" page cannot work on today's data. **Suggestion:** pass the user's token to the route and store `user_id`. `cust`
- [High] `lib/tours-data.js:51-58`, `:235-247`, `:145-160` (fallback at `:388-389`, `:413-417`) — Trips with no `included` list of their own fall back to the category's default list. The 2-hour, 120 ₾ ski lesson therefore claims a lift pass, a resort hotel and a Tbilisi return transfer. The one-day Tavkvetili hike claims guesthouses and breakfast and dinner every day. This likely also affects database trips with empty lists. **Impact:** customers are promised things that don't exist, which will cause disputes when they pay on the day. **Suggestion:** give lessons and day hikes their own lists, or their own defaults. `copy`

### Medium
- [Medium] `components/SiteHeader.js:125` (style at `app/globals.css:151-155`) — The header's "Ask AI" button only calls `alert('AI assistant coming soon.')`. On phones it is a pulsing dot with no accessible name. In dark mode its text is about 1.3–1.9:1 contrast, which is nearly invisible. **Impact:** a prominent button that does nothing looks broken. **Suggestion:** hide it, or point it at the existing human chat as "Ask a question". `copy` `css` `links` `cust`
- [Medium] `app/signup/page.js:81`, `:113` — The form has `noValidate`, and the submit handler never checks the terms box, the name or the email. **Impact:** the "I agree" box means nothing, and an empty name later shows as "Traveller". **Suggestion:** check them in `onSubmit`, as the password already is. `links` `cust`
- [Medium] `app/tours/[slug]/page.js:65`, `:252` — While the account check is still running, `profile` is `undefined`, and the Book button treats that as signed out. **Impact:** a signed-in customer who taps Book quickly is told "Sign in to book". **Suggestion:** disable the button, or show "Checking…", until the check is done. `cust`
- [Medium] `components/ChatWidget.js:271` against the comment at `:222-227` — The comment says the automatic reply is off for the "I have a question about this trip" opener, but the call never passes `autoReply: false`. **Impact:** one tap on "Ask a question" posts a message in the visitor's name and gets a bot reply before they have typed anything. **Suggestion:** pre-fill the line in the input box, or pass `autoReply: false`. `cust`
- [Medium] `lib/catalog.js:140-145` — The Transfer "1 – 2 people" filter keeps only vehicles with at most 2 seats, so it hides the 4-seat car (`lib/tours-data.js:224`). "5+ people" matches nothing. **Impact:** a couple looking for an airport pickup is told there is nothing. **Suggestion:** match when the vehicle's capacity is at least the group size. `copy` `cust`
- [Medium] `app/tours/page.js:243-244`, `lib/i18n.js:90` — The empty listing always says "No trips match those dates", even when no date is set and a category or sub-filter is the cause. For example, "Freestyle" (`lib/catalog.js:56`) has no trips. There is no Clear button. **Impact:** visitors are sent to the wrong control. **Suggestion:** name the active filters and add "Clear filters". `copy` `cust`
- [Medium] app/ (no file) — There is no `app/not-found.js` or `error.js`. Unknown trip slugs return status 200 with a "not found" message (`app/tours/[slug]/page.js:89-99`). **Impact:** bad links reach Next's plain 404 with no header or way back, and search engines may index dead trip pages. **Suggestion:** add a branded 404 page and call `notFound()`. `links` `cust`
- [Medium] `app/globals.css:1186` against `:505` — The chat bubble and the dialog backdrop both use z-index 300, and the chat comes later in the page. **Impact:** likely the chat bubble sits over the booking and review dialogs, near their submit buttons, on phones. **Suggestion:** give the chat a lower z-index, or hide it while a dialog is open. `css`
- [Medium] `app/globals.css:566` against `:1186` — The offline banner (z-index 200) and the chat bubble share the bottom-right corner. **Impact:** likely the bubble covers the banner's "×", so it cannot be closed. **Suggestion:** move the banner up or to the top. `css`
- [Medium] `app/globals.css:774-779` — In dark mode the gallery arrows on the trip page are near-white on a near-white circle. **Impact:** dark-mode visitors cannot see the photo arrows. **Suggestion:** use a theme-aware background or arrow colour. `css`
- [Medium] `components/SiteHeader.js:79-87`, `components/AccountMenu.js:104-115` — Below 900px the Menu and account buttons lose their visible text and have no `aria-label`. **Impact:** screen-reader users on phones hear unnamed buttons for the main menu. **Suggestion:** add `aria-label`s. `css` `links`
- [Medium] `app/faq/page.js:11` against `lib/tours-data.js:205,240,254` and `components/BookingModal.js:278` — The FAQ says lifts may run into April, but every winter season ends on 03-31 and April can't be picked. **Impact:** an April visitor is told it may be possible, then can't select a date. **Suggestion:** align the two (for example, "April by request in chat"). `copy`
- [Medium] `app/page.js:175-181` against `lib/tours-data.js:220-233` and `app/faq/page.js:24-25` — The home page says Transfer is "Coming soon", while the listing sells a "Private Transfer" at 90 ₾ and the FAQ says "Yes — ask for a transfer". **Impact:** three conflicting messages about whether the service exists. **Suggestion:** pick one state. `copy` `cust`
- [Medium] `app/page.js:178` against `lib/tours-data.js:225,231` — The home page promises "a pair to a full minibus", but the only transfer seats 4. **Impact:** a group of 8 finds nothing. **Suggestion:** match the promise to the real vehicles. `copy`
- [Medium] `app/tours/[slug]/page.js:169` — "{views} views" shows invented numbers (for example `lib/tours-data.js:112`), and database trips show "0 views". **Impact:** fake or weak social proof hurts trust. **Suggestion:** hide the count below a threshold, or remove it. `copy` `cust`

### Low
- [Low] `components/TripPlace.js:147` — When the weather request fails, the popup shows "Checking the forecast…" forever. **Suggestion:** show "Forecast unavailable". `cust`
- [Low] `app/tours/[slug]/page.js:135` against `lib/tours-data.js:210` — The label "Walking per day" sits on the value "Riding days, 5 – 6 hours". **Suggestion:** use a neutral label. `copy`
- [Low] `app/page.js:11` (styled at `app/globals.css:206`) — Hero slide 2 is a 768×512 photo stretched to full width, so it looks soft on desktop. **Suggestion:** use a source at least 1920px wide. `img`
- [Low] `app/chat/page.js:138` (admin inbox) — The page lacks the `.subpage-shell` wrapper, so the fixed header likely covers its title. Only the owner sees this. `css`

---

## Confusing

### High
- [High] `components/TourCard.js:46-99` — Listing cards show no price at all. **Impact:** visitors can't compare trips without opening each one, a common reason to leave a listing page. **Suggestion:** show "from X ₾ / person" on each card. `cust`
- [High] `components/BookingModal.js:268`, `BOOKING-DELIVERY-SETUP.md:3-6`, `app/api/bookings/route.js:106` — The success screen says "will confirm by email shortly", but no email goes to the customer (only to staff, via Telegram and Sheets), and there is no reference number. **Impact:** the customer has nothing in their inbox and can't tell whether the request is real. **Suggestion:** send an automatic "request received" email with a reference, and say when they will hear back. `cust`
- [High] `app/faq/page.js:3,17,21`, `app/about/page.js:3,10`, `app/contact/page.js:3-4,40`, `lib/tours-data.js:3` — These files call themselves placeholder copy, but they publish firm promises: free cancellation up to 48 hours, money back for bad weather, every guide certified and first-aid trained, and replies within a few hours. **Impact:** customers will treat these as binding terms. **Suggestion:** have the owner confirm or replace each one before relying on it. `copy` `cust`

### Medium
- [Medium] `app/tours/[slug]/page.js:214-215`, `lib/season.js:49`, `components/BookingModal.js:196,408-414,462` — The price is always "₾ per person", even for the private transfer (a vehicle). Snowmobile and paragliding slots say "the whole slot is yours" but still multiply by the number of people. "All inclusions listed below" points at nothing. **Impact:** the customer can't tell what they pay, and international visitors may not recognise ₾. **Suggestion:** confirm the unit for each product, write "GEL" with an approximate EUR/USD, and make the hint and the total agree. `copy` `cust`
- [Medium] `app/faq/page.js:20-21` against `app/tours/[slug]/page.js:186-257` — Cancellation and payment terms appear only in the FAQ, not on the trip page or in the booking dialog. **Suggestion:** add a short "Payment & cancellation" line near the Book button. `cust`
- [Medium] `app/tours/[slug]/page.js:106,188-198` against `components/BookingModal.js:198-200` — "Fully booked" and "N spots left" come from one manual `spots_left` number per trip (Black Rock Lake is 0, `lib/tours-data.js:185`), while the dialog counts per date. **Impact:** a whole season can read as fully booked, and the two numbers disagree. **Suggestion:** work out availability per date. `cust`
- [Medium] `components/BookingModal.js:142,225-251` — The waitlist asks only for a phone number: no date and no group size. **Impact:** staff can't tell which departure the customer wants. **Suggestion:** ask for the date and the number of people. `cust`
- [Medium] `components/Calendar.js:20-23`, `components/BookingModal.js:275-280` — For a Dec–Mar product opened in October, the booking calendar opens on October with every day greyed out. **Impact:** the customer thinks nothing is available. **Suggestion:** open on the first month of the season and show "Season: December – March". `cust`
- [Medium] `app/tours/page.js:52,95-96`, `components/OfflineBanner.js:16-25,45-46` — The listing first shows the sample trips, then swaps in the database rows. If the database is empty, the samples (invented guides, views, "TOP" badges) likely stay up looking real. **Suggestion:** show skeleton cards while loading, and hide the samples in production. `cust`
- [Medium] `app/tours/[slug]/page.js:47`, `lib/tours-data.js:344-347,409-418`, `app/api/bookings/route.js:124-138` — Sample and demo trips (snowmobile, paragliding, `demo: true`) can still be opened and booked. For a slug it can't find in the database, the booking route skips the capacity check. **Impact:** likely, requests for products that aren't really on sale. **Suggestion:** owner to confirm the demo products are real, or stop showing them. `copy` `cust`
- [Medium] `RUN-THIS-IN-SUPABASE.sql:321-322`, `components/ReviewModal.js:90` — Any signed-in account can rate any trip without booking it, and the review goes live at once. **Impact:** ratings can be faked, so they carry less weight. **Suggestion:** limit reviews to confirmed bookings, or moderate them and add a "verified" mark. `cust`
- [Medium] `components/Stars.js:27-37`, `components/TourCard.js:75-77`, `app/tours/[slug]/page.js:164,396` — Trips with no reviews show five empty stars plus "No ratings yet", on every card and twice on the trip page. **Impact:** a new site looks unvisited. **Suggestion:** hide the stars until there is a first review, and show a "New" badge instead. `cust`
- [Medium] `app/contact/page.js:6-7,25-30,54-73` — "Send →" only opens the visitor's own mail app (`mailto:`). There is no email field and no confirmation. **Impact:** on devices with no mail app nothing happens, and the visitor may think the message was sent. **Suggestion:** post it to a small route, like bookings, and confirm on screen. `copy` `cust`
- [Medium] `app/contact/page.js:18` against `components/SiteFooter.js:26` — The contact page says "Gudauri — winter base", the footer says "Tbilisi", and trips meet at Tbilisi Liberty Square. **Impact:** unclear where the business is. **Suggestion:** list the bases the same way everywhere (owner to confirm). `copy` `cust`
- [Medium] `app/page.js:53`, `lib/i18n.js:54-55,69` — The headline "WINTER IS HERE" shows all year, right under "Winter season · Dec – Mar". **Suggestion:** make it seasonal, or use wording that is true all year. `copy`
- [Medium] `app/page.js:128-133` — The hiking blurb uses hype words ("passionate", "raw beauty", "grandest landscapes", "finest trails") unlike the plain voice elsewhere. **Suggestion:** rewrite it in the concrete style of the camping blurb. `copy`
- [Medium] `app/page.js:132`, `app/about/page.js:12` — The copy names Tusheti, but no Tusheti trip exists in the code data (the database is unknown, TODO). **Suggestion:** add a trip or drop the name. `copy`
- [Medium] `app/about/page.js:11` against `lib/tours-data.js:112,132,150` — The site claims "small groups", but hikes take 8–16 and 8–20 people. **Suggestion:** state the real group sizes. `copy`
- [Medium] Language switch is half done — the Georgian toggle (`components/HeaderToggles.js:63`) works, but these are hard-coded English: the trip page, booking dialog, review dialog, login, signup, reset, About, FAQ, Contact, the home "What we do" blocks (`app/page.js:109-182`), menu and footer links (`components/SiteHeader.js:178-186`, `components/SiteFooter.js:16-26`) and the filter chips (`lib/catalog.js:53-100`). About 75 Georgian strings exist but are never used. **Impact:** Georgian readers get mixed-language screens. **Suggestion:** wire in the existing keys. `copy`
- [Medium] Terms used inconsistently — "Log in" (`lib/i18n.js:18`) vs "Sign in" (`app/login/page.js:48,69`). "Favorites" vs "favourites" (`lib/i18n.js:19,174-175`). Trip, tour, activity and adventure are all used (`lib/i18n.js:60,72,88`; `lib/catalog.js:70`). "Hikes" vs "Hiking" (`components/SiteFooter.js:16`). Spots vs places (`components/BookingModal.js:413,481`). **Suggestion:** settle on one set: Sign in / Create account, trip(s), spots, Hiking, and one spelling style. `copy` `links`
- [Medium] `app/tours/[slug]/page.js:249-261`, `components/BookingModal.js:218,254,472-481` — "Book a spot" and "Request 2 places" are used for what is really a request. **Impact:** unclear whether the trip is booked. **Suggestion:** use "Request a spot" and add "Not confirmed until we reply". `copy`
- [Medium] `app/globals.css:1754-1755` against the comments at `app/tours/page.js:59-60,148-150,171-174` — Filters are hidden at every width. A visitor arriving from a home-page category card sees no sign of which category is applied, apart from a small badge. **Suggestion:** show the active filters as chips or in the heading. `css`
- [Medium] `app/globals.css:232,719,827,960,963,967,1655,2077` — The same "go on" action is drawn in seven button styles (pill, hot-btn, outlined link, tour-btn, book-btn, square auth-btn, text link). **Suggestion:** use one primary and one secondary button style. `css`
- [Medium] `app/globals.css:88,239,363,744,1021` — There are five content widths and gutters (1440/28, 1180/24, 1300/24, 980/24, header 1440/32). **Impact:** the header and the content don't line up on inner pages. **Suggestion:** use one container and one gutter. `css`
- [Medium] `app/signup/page.js:92-97`, `components/ReviewModal.js:117-146` — The phone input and review textarea have no `<label>` or `aria-label`, and the yes/no chips have no group label. **Suggestion:** add labels. `links`
- [Medium] `components/Gallery.js:35-42` — Thumbnail buttons have no accessible name. **Suggestion:** add `aria-label="Photo N"`. `links`
- [Medium] `components/TourCard.js:49` — Card photo alt is `tour.title`, and four winter trips are all titled "Gudauri" (`lib/tours-data.js:199,235,249,281`). **Suggestion:** use the title plus the subtitle. `links`
- [Medium] `components/Calendar.js:51-59` — Day buttons are just a number, with no full date and no "unavailable" hint. **Suggestion:** add an `aria-label` with the full date. `links`
- [Medium] Image naming and duplicates: `public/assets/kaxeti.jpe`, `.jpeg` and `.jpg` (about 1.2 MB, likely one photo; `SEED-SAMPLE-TOURS.sql:14-15`). `gudauri.jpe`, `gudauri 1.jpe` and `gudauri.webp` are likely the same shoot (`lib/tours-data.js:208,289`). `gudauri 1.jpe` is spelled two ways (`lib/tours-data.js:208` uses `%201`). **Suggestion:** keep one master per photo, with lower-case hyphenated names. `img`
- [Medium] `app/page.js:30` against `:156` — Mountaineering uses `sameba.webp` (474×634 portrait, 24 KB) on one card and `sameba.jpe` (1800×1200) on another. **Suggestion:** use one landscape master. `img`
- [Medium] `lib/tours-data.js:147,223`, `SEED-SAMPLE-TOURS.sql:14-15` — SVG icons (`hiking.svg`, `transfer.svg`, `mtskheta.svg`, `wine.svg`) are used as trip cover photos. **Suggestion:** use real photos. `img`
- [Medium] `app/page.js:28`, `lib/tours-data.js:136,154,189` — `Svaneti-history.jpg` is used for the Kazbegi, Tsalka and Racha trips. Likely mismatched (judged by name). **Suggestion:** check and swap it. `img`

### Low
- [Low] `app/login/page.js:62-64` — "Remember me" does nothing. `cust`
- [Low] `app/login/page.js:36`, `lib/supabaseClient.js:80-83` — Raw Supabase errors are shown, there is no "resend confirmation" option, and any network blip says "not connected to its database yet". **Suggestion:** use plain wording and add a resend link. `cust`
- [Low] `components/OfflineBanner.js:45-46` — "Not connected to the database … sample data" is technical wording for a customer. `copy`
- [Low] `lib/i18n.js:89` — The count reads "1 trips available" and "0 trips available". `copy` `cust`
- [Low] `app/faq/page.js:17` against `:19` — "Money back" sits next to "pay on the day". **Suggestion:** say "you won't be charged". `cust`
- [Low] `lib/i18n.js:57` — "Book winter" is a vague call to action. **Suggestion:** "See winter activities". `copy`
- [Low] `lib/tours-data.js:145` — The Georgian-script subtitle თავკვეთილი shows in English mode. `copy`
- [Low] `lib/tours-data.js:114` — Languages are shown as "EN · GE · RU". "GE" may read as German. **Suggestion:** spell out the language names. `copy`
- [Low] `lib/tours-data.js:180-197` — Black Rock Lake is placed in "Racha", but its coordinates point to Khevsureti. Likely wrong (owner TODO). `copy`
- [Low] `lib/lessons.js:34,37` — Two near-identical "level" questions mean a beginner answers "beginner" twice. `copy`
- [Low] `components/ChatWidget.js:29` — "this ski trip" for lessons. **Suggestion:** "this winter activity". `copy`
- [Low] `app/layout.js:10` — The page title is the same on every page. **Suggestion:** give each page its own title. `copy`
- [Low] `components/SiteHeader.js:76`, `app/login/page.js:44` — The logo alt "Torito — Georgian Ascent Tours" uses a name seen nowhere else, and it duplicates the visible "TORITO" text. `copy` `links`
- [Low] `app/tours/[slug]/page.js:411` — Review dates use the browser's date format, unlike the rest of the site. `copy`
- [Low] `app/page.js:123,140,156` — Alt text doesn't match the pictures: `svaneti(1).webp` shows Svan towers, not hiking (viewed). `camping.jpg` is a lowland meadow (viewed). `sameba.jpe` is likely the Gergeti church below Kazbek. `links`
- [Low] `components/Gallery.js:22` — Gallery alts are generic ("photo N"), and slides that are off screen are still read aloud. `links`
- [Low] `components/BookingModal.js:371,380,404,406` — The "One more" / "One fewer" buttons don't say what they count. `links`
- [Low] `app/globals.css:222` against `:1136` — On phones the hero text is indented 12px more than the content below it. `css`
- [Low] `app/globals.css:1447` — The weather facts are hidden between 561px and 1100px although there is room for them. `css`
- [Low] `app/globals.css:919` — The login, signup and reset pages are a white card on a white page, and the unused `.auth-body` background shows the intended look. `css`
- [Low] `app/tours/page.js:32` — The loading fallback is blank with no header. `css`
- [Low] `app/tours/[slug]/page.js:95` — "Trip not found" text uses an unstyled `.lead` (the rule is scoped at `app/globals.css:856`). `css`
- [Low] `app/globals.css:1399` — `.chip.small` is the same size as `.chip`. `css`
- [Low] Other image files: `camping fier.webp` (likely a typo of "fire"), names with spaces and brackets, mixed case (`Svaneti.jpe`), the `.jpe` extension, two logo files, and a favicon that is an 81 KB non-square PNG (`app/layout.js:12`). `img`

---

## Could be better

### High
- [High] `app/tours/[slug]/page.js:252`, `components/SignInGate.js:74-80`, `components/BookingModal.js:66` — Booking and the waitlist need a full account first, although the database accepts guest requests (`RUN-THIS-IN-SUPABASE.sql:184-186`). **Impact:** this is the biggest drop-off for a first-time visitor. **Suggestion:** take name, email and phone in the dialog, and offer an account afterwards. `cust`
- [High] `app/signup/page.js:47-67`, `:124` — `signUp` sets no `emailRedirectTo`, and the "Sign in" link drops `?next=`. **Impact:** likely, after confirming their email the customer lands away from the trip they were booking. **Suggestion:** pass the `next` path through every step. `cust`
- [High] `app/page.js:9-14`, `:44-48` — The home hero loads five full-size slides up front, about 1.8 MB (`svaneti.jpg` alone is 870 KB). **Impact:** a slow first paint on phones and mobile data. **Suggestion:** resize to about 1920px and under 300 KB, WebP if possible, and lazy-load the slides after the first. `img`
- [High] `next.config.mjs:2-5` — The comment says the photos are "already sized for the layout", but `images.unoptimized: true` and nine files over 300 KB (`svaneti.jpg` 870 KB, `camping.jpg` 486 KB, `Svaneti.jpe` 461 KB, `sameba.jpe` 444 KB, `kaxeti.jpg` 437 KB, `kaxeti.jpeg` 428 KB, `kaxeti.jpe` 404 KB, `gudauri 1.jpe` 311 KB, `svaneti(1).webp` 296 KB) mean full-size photos load everywhere. **Suggestion:** resize the photos, or turn on the image optimiser. `img`

### Medium
- [Medium] `components/AccountPrompt.js:64,69`, `app/login/page.js:75`, `app/reset/page.js:91`, `app/tours/page.js:232` — These sign-in links drop `?next=`. **Impact:** after signing in, the visitor lands on the home page instead of where they were. **Suggestion:** carry `next` through, as `SignInGate` already does. `cust`
- [Medium] `components/ChatWidget.js:73,200-211`, `lib/i18n.js:39` — A signed-out visitor's chat lives only in that browser, no contact details are asked for, and there is no "we're offline" notice. **Impact:** the reply is lost if they leave. **Suggestion:** ask for an email or WhatsApp number after the first message. `cust`
- [Medium] `app/page.js:34-190`, `components/HotSection.js:55` — The home page shows no trips, prices, reviews or trust signals. A "Hot right now" component exists but is never used. **Suggestion:** add featured trips with prices and a short "why book with us" block. `cust`
- [Medium] `components/BookingModal.js:252-270` — The success screen has no next step: no reference, no "add to calendar", no WhatsApp link and no reply time. `cust`
- [Medium] `app/tours/[slug]/page.js:180-258`, `app/globals.css:906-907` — On phones the booking card falls below the gallery, weather and map. **Impact:** likely the Book button is several screens down. **Suggestion:** add a sticky price and Book bar. `css`
- [Medium] `app/globals.css:594,707,719-721,829,960-961,968,1221,1255,1646,1655-1659,1950,2080,2138` — White text on `#4fb3a0` (and green text on white) is about 2.5:1 contrast, below the 4.5:1 minimum. This covers the main "View trip", "Book a spot" and "Sign in" buttons. Elsewhere the code already uses dark text `#10231f` on the same green (`:380`, `:1746`). **Suggestion:** use one readable treatment for all of them. `css`
- [Medium] `app/globals.css:315,882` — Tags and "Day N" labels use a hard-coded `#39707f`, which is about 2.5:1 in dark mode. `css`
- [Medium] `app/globals.css:448,698,988,1020,1383` — Error text `#b4462a` and the pink error box have no dark-mode version, and the "NEW" badge is about 2:1. **Suggestion:** add `--danger` and `--danger-bg` tokens. `css`
- [Medium] `app/globals.css:102-106,477-483,525-528,542-546,577-580,1231-1235,1897,2141-2145` — Several tap targets are under 40px: the dialog "×", chat close, banner "×", menu, heart and +/- buttons. **Suggestion:** give them a hit area of at least 40–44px. `css`
- [Medium] `app/page.js:106,123,140,156,172` — The home feature images have no `loading="lazy"` and no width or height, which causes layout shift. Card and tile photos are 300–490 KB. **Suggestion:** about 800px wide and under 150 KB for cards. `img`
- [Medium] `app/faq/page.js:8-26` — There are only eight questions, none on group size, what to bring, age limits, insurance or how chat works. `copy`
- [Medium] `app/page.js:109-175` — The section tags mix seasons, products and status, and Mountaineering is tagged "Summer season" while Hiking and Camping have no season tag. `copy`
- [Medium] `components/SiteHeader.js:179-182`, `app/tours/page.js:50,56` — Invalid `?type=` values are silently ignored or leave a filter applied that can't be seen. **Suggestion:** check `type` against the category's options. `links`

### Low
- [Low] `components/Calendar.js:19,39` — "Today" uses the visitor's clock, not Tbilisi time. `cust`
- [Low] `components/DateFilter.js:11-19` — The date range shows no year, and the filter checks only the season window, not real free places. `cust`
- [Low] `app/tours/[slug]/page.js:210-211` — The price row reuses the clock icon. **Suggestion:** use a price icon, and make the price large at the top of the booking card. `copy` `cust`
- [Low] `app/tours/page.js:119-121`, `:44-50` — A new search keeps an old date range, and dates aren't saved in the URL, so a refresh loses them. `cust` `links`
- [Low] `lib/ratings.js:47` — Every page loads all review rows to work out the averages. **Suggestion:** use a database view that returns the average and count. `cust`
- [Low] `components/SiteFooter.js:16-17` — The footer has no Transfer link. `links`
- [Low] `lib/i18n.js:16` — The search placeholder leaves out camping and transfers. `copy`
- [Low] `lib/i18n.js:71` — "Lock in your dates" is the only salesy phrase on the site. `copy`
- [Low] `lib/i18n.js:168-171` — The Favorites page uses both "Favorites" and "saved". `copy`
- [Low] `components/TripPlace.js:83,105` — "2-week forecast" and "Next two weeks" describe the same thing. `copy`
- [Low] `app/globals.css:398-416,456-485,1202,1299,1558-1714` — Amber and four different reds are hard-coded, so status colours mean different things in different places. **Suggestion:** add `--amber`, `--danger` and `--warn` tokens. `css`
- [Low] `app/globals.css:820,878,949,972,980` — Hard-coded light hairlines cut across the dark theme. **Suggestion:** use `var(--line)`. `css`
- [Low] `app/globals.css:596-646` — The date calendar is always dark grey with Google blues, unlike the rest of the site. `css`
- [Low] `app/globals.css:746,1071-1080` — Footer links and breadcrumbs are small touch targets, and footer text is about 4:1 contrast. `css`
- [Low] `app/globals.css:1823-1827` — The 16px input rule stops at 760px, so iOS likely zooms into fields on landscape phones. `css`
- [Low] `app/globals.css:129-132` and others — Fields use `outline:none` with only a weak border change. **Suggestion:** add a global `:focus-visible` ring. `css`
- [Low] `app/globals.css:349-354` — Reduced-motion settings miss the pulse dots, dialog pop-ins and hover lifts, and the hero slider can't be paused. `css`
- [Low] `app/globals.css:194,361,512,924,1210` — `100vh` on iOS cuts off the hero and dialogs. **Suggestion:** use `svh` or `dvh`. `css`
- [Low] `app/globals.css` — There are 15 breakpoints, and parts of the layout disagree between 760px and 820px. There are also duplicate rules, `@media all{}` no-op blocks and dead rules (HotSection, `.reveal` on the home page, `.tour-id`, `.guide-*`). `.strava-wrap` has no CSS. `css`
- [Low] `app/globals.css:240,365,755,940,1964,2027` — Page titles use six unrelated size scales. `css`
- [Low] `app/layout.js:15-18` — There is no skip-to-content link and no `themeColor`. `css`
- [Low] `public/assets/camp.svg`, `logo.svg`, `svaneti.svg` — Unused (6.5 KB). They could be removed once the owner confirms. `img`
- [Low] `components/TourCard.js:49` and others — The `hero.svg` drawing is the fallback for trips with no photo. `img`
- [Low] `components/HotSection.js:23,31,35,115,118` — The unused component mentions Bakuriani, rafting and wine, which Torito doesn't offer, so fix it before using it. `copy`
- [Low] `lib/i18n.js` (Georgian strings, e.g. `:283,338-350`) — Formal and informal register are mixed. Needs a native-speaker review (TODO). `copy`

---

## Checked and fine (no action)
- Every internal `href` and `router.push` target is a route that exists, apart from the cases listed above. The `next=` parameter is encoded and checked safely. External links use `rel="noreferrer"`. `links`
- Every image path referenced in code exists in `public/assets`, and no two image files are byte-for-byte identical. `img` `links`
- Decorative images correctly use `alt=""`, and most icon-only buttons have labels. `links`
- There are no missing Georgian keys: every English key has a Georgian twin. `copy`
- The iOS 16px input rule covers portrait phones. `css`
- Facts that match across pages: Kazbek 5,054 m, the Dec–Mar winter season, pay on the day. `copy`

## Open questions for the owner
1. Is the real phone number known, and is `hello@torito.ge` a working inbox?
2. Are the FAQ's cancellation and refund terms and the About page's "all guides certified" real policy?
3. Is each price per person, per slot or per vehicle (lessons, snowmobile, paragliding, transfer)?
4. Are the snowmobile and paragliding demo trips, the guide names and the view counts real?
5. Is Supabase email confirmation turned on? This changes how serious the sign-up redirect problem is.
6. Are the SQL seed files applied to the live database? Several "likely" items depend on it.
7. Should the About, FAQ, Contact and trip pages be in Georgian too, or only the menus and buttons?
