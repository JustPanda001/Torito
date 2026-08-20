// Country codes for the phone field on the booking form.
//
// Not the full ITU list: the countries Georgian mountain trips actually draw
// visitors from, with Georgia first because most bookings are local. "Other"
// is deliberately absent — a number we cannot dial is no use, and the list
// below covers the rest of the world's common origins well enough that adding
// one is a smaller change than maintaining 200 entries.
export const DIAL_CODES = [
  ['+995', 'Georgia'],
  ['+374', 'Armenia'],
  ['+994', 'Azerbaijan'],
  ['+90', 'Türkiye'],
  ['+7', 'Russia / Kazakhstan'],
  ['+380', 'Ukraine'],
  ['+972', 'Israel'],
  ['+971', 'UAE'],
  ['+966', 'Saudi Arabia'],
  ['+48', 'Poland'],
  ['+49', 'Germany'],
  ['+44', 'United Kingdom'],
  ['+1', 'USA / Canada'],
  ['+33', 'France'],
  ['+39', 'Italy'],
  ['+34', 'Spain'],
  ['+31', 'Netherlands'],
  ['+41', 'Switzerland'],
  ['+43', 'Austria'],
  ['+46', 'Sweden'],
  ['+47', 'Norway'],
  ['+45', 'Denmark'],
  ['+358', 'Finland'],
  ['+420', 'Czechia'],
  ['+36', 'Hungary'],
  ['+40', 'Romania'],
  ['+30', 'Greece'],
  ['+351', 'Portugal'],
  ['+353', 'Ireland'],
  ['+32', 'Belgium'],
  ['+372', 'Estonia'],
  ['+371', 'Latvia'],
  ['+370', 'Lithuania'],
  ['+91', 'India'],
  ['+86', 'China'],
  ['+81', 'Japan'],
  ['+82', 'South Korea'],
  ['+61', 'Australia'],
  ['+64', 'New Zealand'],
  ['+27', 'South Africa'],
  ['+55', 'Brazil'],
];

export const DEFAULT_DIAL = '+995';

/** Digits only, so "599 12 34 56" and "5991234 56" are the same nine digits. */
export function phoneDigits(value) {
  return (value ?? '').replace(/\D/g, '');
}
