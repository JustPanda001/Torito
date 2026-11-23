// Who teaches a lesson. Server only.
//
// The roster is the instructors table (edited on /admin/instructors) and the
// choice is made in the database by assign_instructor(), under a lock, so two
// bookings landing at once never get the same person for the same hour:
//
//   ski        Saba whenever he is free, then Luka, then Ski helper 1, 2, 3
//   snowboard  Sandro and Gio share equally (fewer hours this season first,
//              a tie goes to Sandro), then Snowboard helper 1, 2, 3
//
// In the roster that is "rank" (lower is asked first; the same rank shares
// equally) and "position" (the order inside a rank). Free means no live
// booking of theirs overlaps the lesson's hours on any of its days; cancelled
// and declined bookings free the instructor. Nobody free still takes the
// booking: it stays unassigned and the team gets a Telegram alert.
//
// Only trips with "Assign instructors" ticked in admin (tours.assign_instructors)
// are assigned; today that is the Gudauri lessons.

import { sendTelegram } from '@/lib/telegram';
import { HOURS_ANSWER, DAYS_ANSWER } from '@/lib/lessons';

export const DISCIPLINES = ['ski', 'snowboard'];

/** 'ski' / 'snowboard' from the booking's answers (the same reading as the database). */
export function disciplineOf(answers) {
  const values = Object.values(answers && typeof answers === 'object' ? answers : {}).map((v) => String(v));
  if (values.some((v) => /^\s*snow\s*board/i.test(v))) return 'snowboard';
  if (values.some((v) => /^\s*ski(s|ing|er)?\s*$/i.test(v))) return 'ski';
  return null;
}

/** Whole hours and days of a lesson, as stored in its answers (1 when missing). */
export function lessonShape(answers) {
  const num = (v, cap) => (/^[0-9]{1,2}$/.test(String(v ?? '')) ? Math.min(Math.max(Number(v), 1), cap) : 1);
  return { hours: num(answers?.[HOURS_ANSWER], 99), days: num(answers?.[DAYS_ANSWER], 30) };
}

/**
 * Picks and stores an instructor for a booking just saved. Resolves the
 * database's answer, { ok, instructor_id, name, discipline, reason }, or null
 * when the call itself failed (logged; the booking stands either way).
 */
export async function assignInstructor(admin, bookingId, force = false) {
  if (!admin || !bookingId) return null;
  const { data, error } = await admin.rpc('assign_instructor', { p_booking: bookingId, p_force: force });
  if (error) {
    console.error('Instructor assignment failed:', bookingId, error.message);
    return null;
  }
  return data ?? null;
}

/** The Telegram alert for a lesson nobody could take. */
export function unassignedText(row, discipline) {
  const { hours, days } = lessonShape(row.answers);
  return [
    `⚠️ Booking needs an instructor: ${row.tour_title ?? row.tour_slug}`,
    `${String(row.wanted_date ?? '—').slice(0, 10)}${row.lesson_time ? ` ${row.lesson_time}` : ''}`
      + ` · ${hours} h${days > 1 ? ` × ${days} days` : ''}`,
    `${discipline ? discipline.toUpperCase() : 'SKI/SNOWBOARD not given'} · ${row.people ?? 1} people`,
    row.ref ? `Ref: ${row.ref}` : null,
    'Assign one on /admin/bookings.',
  ].filter(Boolean).join('\n');
}

/** Sends the "needs an instructor" alert. */
export function alertUnassigned(row, discipline) {
  return sendTelegram(unassignedText(row, discipline));
}
