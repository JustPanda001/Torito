// Country codes for the phone fields.
//
// Not the full ITU list: the countries Georgian mountain trips actually draw
// visitors from, with Georgia first because most bookings are local.
//
// [dial code, short code, country]. The short code is what the closed control
// shows, so it stays narrow enough to leave the number field room; the country
// name is what the open list shows, because nobody should have to know that
// LVA is Latvia to pick it.
export const DIAL_CODES = [
  ['+995', 'GEO', 'Georgia'],
  ['+374', 'ARM', 'Armenia'],
  ['+994', 'AZE', 'Azerbaijan'],
  ['+90', 'TUR', 'Türkiye'],
  ['+7', 'RU/KZ', 'Russia / Kazakhstan'],
  ['+380', 'UKR', 'Ukraine'],
  ['+972', 'ISR', 'Israel'],
  ['+971', 'UAE', 'United Arab Emirates'],
  ['+966', 'SAU', 'Saudi Arabia'],
  ['+48', 'POL', 'Poland'],
  ['+49', 'DEU', 'Germany'],
  ['+44', 'GBR', 'United Kingdom'],
  ['+1', 'US/CA', 'USA / Canada'],
  ['+33', 'FRA', 'France'],
  ['+39', 'ITA', 'Italy'],
  ['+34', 'ESP', 'Spain'],
  ['+31', 'NLD', 'Netherlands'],
  ['+41', 'CHE', 'Switzerland'],
  ['+43', 'AUT', 'Austria'],
  ['+46', 'SWE', 'Sweden'],
  ['+47', 'NOR', 'Norway'],
  ['+45', 'DNK', 'Denmark'],
  ['+358', 'FIN', 'Finland'],
  ['+420', 'CZE', 'Czechia'],
  ['+36', 'HUN', 'Hungary'],
  ['+40', 'ROU', 'Romania'],
  ['+30', 'GRC', 'Greece'],
  ['+351', 'PRT', 'Portugal'],
  ['+353', 'IRL', 'Ireland'],
  ['+32', 'BEL', 'Belgium'],
  ['+372', 'EST', 'Estonia'],
  ['+371', 'LVA', 'Latvia'],
  ['+370', 'LTU', 'Lithuania'],
  ['+91', 'IND', 'India'],
  ['+86', 'CHN', 'China'],
  ['+81', 'JPN', 'Japan'],
  ['+82', 'KOR', 'South Korea'],
  ['+61', 'AUS', 'Australia'],
  ['+64', 'NZL', 'New Zealand'],
  ['+27', 'ZAF', 'South Africa'],
  ['+55', 'BRA', 'Brazil'],
];

export const DEFAULT_DIAL = '+995';

/** Digits only, so "599 12 34 56" and "5991234 56" are the same nine digits. */
export function phoneDigits(value) {
  return (value ?? '').replace(/\D/g, '');
}
