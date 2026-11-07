// The reference a customer sees for a booking request: in the "request
// received" email, on the dialog's success screen and on My bookings.
//
// It is read straight off the row's uuid rather than stored, so every booking
// already has one — including requests made before references existed.

// The 8 characters after the prefix never change, so a customer quoting an
// old "TOR-3F9A1C2B" reference is the same booking as "MT-3F9A1C2B".
/** "MT-3F9A1C2B" for a booking id. */
export function bookingRef(id) {
  return `MT-${String(id ?? '').replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

/** What each status means to the customer, not to the admin panel. */
export const STATUS_LABEL = {
  new: 'Waiting for confirmation',
  confirmed: 'Confirmed',
  declined: 'Declined',
};
