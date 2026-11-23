# Trip page (desktop): ideas for the empty corner and the moving booking card

Suggestions only, nothing built. Context: in `app/activities/[slug]/page.js` the page has a left column (gallery + place/map/weather blocks) and a right `<aside className="booking-card">`. The card is `position:sticky` (globals.css, `.booking-card`), so it slides with the scroll, and below it the right column is empty while the left column is tall.

1. **Keep the booking card fixed in place, and make it shorter.**
   Behaviour: stick it at a fixed top offset (just under the header) for the whole length of the left column, and cap its height to the screen (`max-height: calc(100dvh - var(--header-h) - 32px)`, scroll inside it only if it is taller). Move the long "Choose an option" list into a compact dropdown or two-line rows.
   Why: the card currently moves because it is taller or shorter than the screen at different moments; a card that always fits the screen does not jump.

2. **Put a "Good to know" block under the booking card (non-sticky, so it scrolls normally).**
   Show 3-4 short lines from data the trip already has: meeting point / start time, what is included, what to bring, and the cancellation rule. Only show lines that have content (same `filled()` rule as the specs).
   Why: it uses the empty space for the things people ask before booking, and it is the content that most reduces "Ask a question" messages.

3. **Move the weather block into the right column, under the booking card.**
   Behaviour: the 3-day forecast sits right below Book / Ask a question, and the map stays on the left under the gallery.
   Why: it balances the two columns and puts the weather next to the date decision; it needs no new content.

4. **Add a small "Reviews and rating" summary under the card.**
   Behaviour: average stars, count, and the two newest approved reviews with a "See all reviews" link to the reviews section further down the page. If there are none yet, show "Be the first to review" (only for signed-in users who booked).
   Why: social proof next to the Book button fills the corner and helps the decision; it reuses `Stars` and the review data already loaded.

Option to combine: 1 + 2 (steady card, then Good to know) is the lowest-risk pair; add 3 or 4 only if the left column is still much taller.

Note for the owner: the trip page still shows "people max" in the booking card (`book-capacity`). Your request was for the catalogue cards only, so that was left alone; say so if you want it gone there as well.
