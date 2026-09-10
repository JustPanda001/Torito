// Questions a trip asks in its booking window.
//
// The lesson form used to hard-code three of these — what time, how much can
// you already do, what kind of lesson — which meant a new question needed a
// code change. They live on the trip now, written in the admin panel, so any
// trip can ask whatever it needs to.
//
// Stored on tours.booking_fields as a json array. Everything here tolerates a
// half-written or hand-edited value, because the column is plain json and the
// admin form is not the only thing that could ever write to it.

export const QUESTION_TYPES = [
  ['choice', 'Pick one', 'A row of buttons — the visitor taps one'],
  ['number', 'A number', 'Plus and minus around a count'],
  ['text', 'Free text', 'A single line they type'],
];

const TYPES = new Set(QUESTION_TYPES.map(([value]) => value));

/** A blank question, for the "+ Add question" button. */
export const blankQuestion = () => ({
  label: '', type: 'choice', options: [], required: false, hint: '',
});

/**
 * The questions a trip actually asks, ignoring anything malformed.
 *
 * A question with no label has nothing to render, and a choice with no options
 * would be a heading over an empty row — both are dropped rather than shown
 * broken to a visitor part-way through booking.
 */
export function bookingQuestions(tour) {
  const raw = tour?.booking_fields;
  const list = Array.isArray(raw) ? raw : [];

  return list
    .map((q) => ({
      label: String(q?.label ?? '').trim(),
      type: TYPES.has(q?.type) ? q.type : 'text',
      options: (Array.isArray(q?.options) ? q.options : [])
        .map((o) => String(o ?? '').trim())
        .filter(Boolean),
      required: Boolean(q?.required),
      hint: String(q?.hint ?? '').trim(),
    }))
    .filter((q) => q.label && (q.type !== 'choice' || q.options.length > 0));
}

/** The value a question starts on before the visitor touches it. */
export const initialAnswer = (q) => (q.type === 'number' ? 1 : '');

/** True once every required question has been answered. */
export function answersComplete(questions, answers) {
  return questions.every((q) => {
    if (!q.required) return true;
    const value = answers[q.label];
    return q.type === 'number' ? Number(value) > 0 : String(value ?? '').trim() !== '';
  });
}

/**
 * Answers as they are sent and stored: label -> value, with the blanks left
 * out so an unanswered optional question does not take up a line in the
 * confirmation or the Telegram message.
 */
export function packAnswers(questions, answers) {
  const out = {};
  for (const q of questions) {
    const value = answers[q.label];
    const text = q.type === 'number' ? String(value ?? '') : String(value ?? '').trim();
    if (text !== '' && text !== '0') out[q.label] = q.type === 'number' ? Number(value) : text;
  }
  return out;
}
