// Country codes for the phone fields.
//
// Not the full ITU list: the countries Georgian mountain trips actually draw
// visitors from, with Georgia first because most bookings are local.
//
// [dial code, short code]. The short code is what the closed dropdown shows —
// a native select is as wide as its longest option, and spelling out
// "Russia / Kazakhstan" pushed the number field out of the card. Codes are
// ISO alpha-3, except where one dial code covers two countries and naming only
// one of them would be wrong.
export const DIAL_CODES = [
  ['+995', 'GEO'],
  ['+374', 'ARM'],
  ['+994', 'AZE'],
  ['+90', 'TUR'],
  ['+7', 'RU/KZ'],
  ['+380', 'UKR'],
  ['+972', 'ISR'],
  ['+971', 'UAE'],
  ['+966', 'SAU'],
  ['+48', 'POL'],
  ['+49', 'DEU'],
  ['+44', 'GBR'],
  ['+1', 'US/CA'],
  ['+33', 'FRA'],
  ['+39', 'ITA'],
  ['+34', 'ESP'],
  ['+31', 'NLD'],
  ['+41', 'CHE'],
  ['+43', 'AUT'],
  ['+46', 'SWE'],
  ['+47', 'NOR'],
  ['+45', 'DNK'],
  ['+358', 'FIN'],
  ['+420', 'CZE'],
  ['+36', 'HUN'],
  ['+40', 'ROU'],
  ['+30', 'GRC'],
  ['+351', 'PRT'],
  ['+353', 'IRL'],
  ['+32', 'BEL'],
  ['+372', 'EST'],
  ['+371', 'LVA'],
  ['+370', 'LTU'],
  ['+91', 'IND'],
  ['+86', 'CHN'],
  ['+81', 'JPN'],
  ['+82', 'KOR'],
  ['+61', 'AUS'],
  ['+64', 'NZL'],
  ['+27', 'ZAF'],
  ['+55', 'BRA'],
];

export const DEFAULT_DIAL = '+995';

/** Digits only, so "599 12 34 56" and "5991234 56" are the same nine digits. */
export function phoneDigits(value) {
  return (value ?? '').replace(/\D/g, '');
}
