// Weather for a trip's location, from Open-Meteo: no API key, no account, no
// billing, and free for this kind of use.
//
// Two different questions, depending on when the trip runs. Inside the forecast
// window the visitor wants to know what it will actually be like; outside it,
// a forecast does not exist and inventing one would be worse than useless, so
// we answer with what that place is typically like in that month, taken from
// the same provider's archive of past years.

import { inSeason } from './season';

const FORECAST_DAYS = 14;
// how many past years to average for the typical case; three is enough to
// smooth out one odd year without the request getting slow
const TYPICAL_YEARS = 3;

// WMO weather codes, grouped to the handful of states worth drawing
export const CONDITIONS = {
  clear: { label: 'Clear', codes: [0, 1] },
  cloudy: { label: 'Cloudy', codes: [2, 3, 45, 48] },
  rain: { label: 'Rain', codes: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82] },
  snow: { label: 'Snow', codes: [71, 73, 75, 77, 85, 86] },
  storm: { label: 'Storms', codes: [95, 96, 99] },
};

export function conditionOf(code) {
  for (const [key, { codes }] of Object.entries(CONDITIONS)) {
    if (codes.includes(code)) return key;
  }
  return 'cloudy';
}

const ok = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
  return res.json();
};

/**
 * What it is doing there now, and the fortnight ahead — one request, because
 * the tile shows the first and its popup shows the second.
 */
export async function currentWeather(lat, lng) {
  const data = await ok(
    'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${lat}&longitude=${lng}`
    + '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
    + `&forecast_days=${FORECAST_DAYS}&timezone=auto`,
  );

  return {
    now: {
      temp: Math.round(data.current.temperature_2m),
      feels: Math.round(data.current.apparent_temperature),
      wind: Math.round(data.current.wind_speed_10m),
      code: data.current.weather_code,
      // today's swing and rain chance, which is what someone packing wants
      high: Math.round(data.daily.temperature_2m_max[0]),
      low: Math.round(data.daily.temperature_2m_min[0]),
      rainChance: data.daily.precipitation_probability_max?.[0] ?? null,
    },
    days: data.daily.time.map((date, i) => ({
      date,
      code: data.daily.weather_code[i],
      max: Math.round(data.daily.temperature_2m_max[i]),
      min: Math.round(data.daily.temperature_2m_min[i]),
      rainChance: data.daily.precipitation_probability_max?.[i] ?? null,
    })),
  };
}

/** The next few days, for a trip whose season is open now. */
async function forecast(lat, lng) {
  const data = await ok(
    'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${lat}&longitude=${lng}`
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum'
    + `&forecast_days=${FORECAST_DAYS}&timezone=auto`,
  );

  return {
    kind: 'forecast',
    days: data.daily.time.map((date, i) => ({
      date,
      code: data.daily.weather_code[i],
      max: Math.round(data.daily.temperature_2m_max[i]),
      min: Math.round(data.daily.temperature_2m_min[i]),
      rain: data.daily.precipitation_sum[i],
    })),
  };
}

/**
 * What the place is usually like in the month the season starts, averaged over
 * the last few years. Labelled as typical, never as a forecast.
 */
async function typical(lat, lng, month) {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: TYPICAL_YEARS }, (_, i) => thisYear - 1 - i);
  const mm = String(month).padStart(2, '0');

  const runs = await Promise.all(years.map((year) => ok(
    'https://archive-api.open-meteo.com/v1/archive'
    + `?latitude=${lat}&longitude=${lng}`
    + `&start_date=${year}-${mm}-01&end_date=${year}-${mm}-28`
    + '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto',
  )));

  const mean = (values) => {
    const real = values.filter((v) => typeof v === 'number');
    return real.length ? real.reduce((a, b) => a + b, 0) / real.length : null;
  };

  const maxes = runs.flatMap((r) => r.daily.temperature_2m_max);
  const mins = runs.flatMap((r) => r.daily.temperature_2m_min);
  const rains = runs.flatMap((r) => r.daily.precipitation_sum);
  const wetDays = rains.filter((v) => v >= 1).length;

  return {
    kind: 'typical',
    month,
    max: Math.round(mean(maxes)),
    min: Math.round(mean(mins)),
    // days with rain or snow, as a share of the days we looked at
    wetShare: rains.length ? Math.round((wetDays / rains.length) * 100) : null,
    years: years.length,
  };
}

/** Picks whichever of the two actually answers something today. */
export function tripWeather(tour) {
  const { lat, lng } = tour;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  if (inSeason(tour, new Date())) return forecast(lat, lng);

  // the month the season opens is the one a visitor is planning for
  const start = Number((tour.season_from ?? '06-01').slice(0, 2)) || 6;
  return typical(lat, lng, start);
}
