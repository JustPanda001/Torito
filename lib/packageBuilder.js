// Build-your-own package (the vault's "Custom Package Builder").
//
// A trip can carry steps — Stay, Transport, Guide, Extras — and every step
// offers partner options from ₾₾₾ premium to ₾ economy, each with a short
// "more info" summary and tags. The visitor picks one per step (optional steps
// can be skipped) and the total follows.
//
// No column of its own: the steps ride in tours.booking_fields as one hidden
// entry, { type: 'package', steps: [...] }, like the lesson rate table. The
// admin panel edits them; bookingQuestions() ignores the entry (no label).
//
// Price rule: the trip's own price per person is the base week. An option
// priced 'person' is added per person, one priced 'group' is added once.
// Used by the trip page, the booking dialog AND the bookings API, so the
// browser's total and the stored one cannot drift.

export const PACKAGE = 'package';

export const LEVELS = [
  [3, '₾₾₾', 'Premium'],
  [2, '₾₾', 'Standard'],
  [1, '₾', 'Economy'],
];
export const levelMark = (n) => (LEVELS.find(([v]) => v === Number(n)) ?? LEVELS[1])[1];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** The hidden entry in booking_fields, or null. */
function packageEntry(fields) {
  return (Array.isArray(fields) ? fields : []).find((q) => q?.type === PACKAGE) ?? null;
}

/** Cleaned steps, or null when the trip has no builder. */
export function packageSteps(tour) {
  const raw = packageEntry(tour?.booking_fields)?.steps;
  if (!Array.isArray(raw)) return null;
  const steps = raw
    .map((s) => ({
      title: String(s?.title ?? '').trim(),
      note: String(s?.note ?? '').trim(),
      optional: Boolean(s?.optional),
      options: (Array.isArray(s?.options) ? s.options : [])
        .map((o) => ({
          name: String(o?.name ?? '').trim(),
          level: [1, 2, 3].includes(Number(o?.level)) ? Number(o.level) : 2,
          price: num(o?.price),
          per: o?.per === 'group' ? 'group' : 'person',
          summary: String(o?.summary ?? '').trim(),
          tags: (Array.isArray(o?.tags) ? o.tags : String(o?.tags ?? '').split(','))
            .map((x) => String(x).trim()).filter(Boolean).slice(0, 8),
        }))
        .filter((o) => o.name),
    }))
    .filter((s) => s.title && s.options.length);
  return steps.length ? steps : null;
}

/** What the page picks before the visitor touches anything: the first option of every required step. */
export function defaultChoices(steps) {
  const out = {};
  for (const s of steps ?? []) if (!s.optional) out[s.title] = s.options[0].name;
  return out;
}

/**
 * Picked options per step, or null when the choice is not valid (unknown
 * option, or a required step left empty). `choices` is { stepTitle: optionName }.
 */
export function resolveChoices(steps, choices) {
  const picked = [];
  const c = choices && typeof choices === 'object' ? choices : {};
  for (const s of steps) {
    const name = c[s.title];
    if (name == null || name === '') {
      if (!s.optional) return null;
      continue;
    }
    const o = s.options.find((x) => x.name === name);
    if (!o) return null;
    picked.push({ step: s, option: o });
  }
  return picked;
}

/** Added cost of the picked options for this many people, or null when invalid. */
export function packageExtra(steps, choices, people) {
  const picked = resolveChoices(steps, choices);
  if (!picked) return null;
  return picked.reduce((sum, { option }) => sum + option.price * (option.per === 'group' ? 1 : people), 0);
}

/** The plan as answers the team reads: { 'Stay': 'Hotel X (₾₾₾)' }. */
export function packageAnswers(steps, choices) {
  const out = {};
  for (const { step, option } of resolveChoices(steps, choices) ?? []) {
    out[step.title] = `${option.name} (${levelMark(option.level)})`;
  }
  return out;
}
