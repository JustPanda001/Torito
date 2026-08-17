// Instructor lessons are a different shape of product from a trip.
//
// A trip goes somewhere: it has a departure point, transport, an itinerary and
// a fixed departure time. A lesson does none of that — the visitor turns up at
// the slope and tells us when they want it, how many of them there are, what
// they can already do and what they want to learn. So the listing, the booking
// form and the admin form all drop the travel half for this category.

import { subtypeOf } from './catalog';

export const LESSON = 'lessons';
export const FREERIDE = 'freeride';

/** True for instructor lessons, which have no journey attached. */
export function isLesson(tour) {
  return subtypeOf(tour) === LESSON;
}

/** Freeride weeks do travel — several mountains, pickups and drop-offs. */
export function isFreeride(tour) {
  return subtypeOf(tour) === FREERIDE;
}

// what the visitor can already do
export const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

// what they want out of the lesson
export const LESSON_TYPES = ['Beginner lesson', 'Freestyle', 'Freeride'];

// Typical slots rather than a free-form clock: it is a request, and an
// instructor's day is blocked out in half-days anyway.
export const LESSON_TIMES = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
];
