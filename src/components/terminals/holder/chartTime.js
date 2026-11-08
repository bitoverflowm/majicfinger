export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY_MS = 24 * HOUR;

const TIME_STEPS = [
  MINUTE, 5 * MINUTE, 15 * MINUTE, 30 * MINUTE, HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR,
  DAY_MS, 2 * DAY_MS, 7 * DAY_MS, 14 * DAY_MS, 30 * DAY_MS, 91 * DAY_MS, 182 * DAY_MS, 365 * DAY_MS,
];
const TARGET_TICKS = 6;

export const DAY = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
export const DAY_HOUR = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric" });
export const CLOCK = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
export const DAY_YEAR = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
export const DAY_CLOCK = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
export const FULL_TIME = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

/** Round local-time ticks for [start, end], about six of them, with a label format to match. */
export function timeTicks(start, end) {
  const span = Math.max(1, end - start);
  const step = TIME_STEPS.reduce((best, size) =>
    Math.abs(Math.log(span / size / TARGET_TICKS)) < Math.abs(Math.log(span / best / TARGET_TICKS)) ? size : best,
  );
  const offset = new Date(start).getTimezoneOffset() * MINUTE;
  const ticks = [];
  for (let t = Math.ceil((start - offset) / step) * step + offset; t <= end && ticks.length < 50; t += step) ticks.push(t);
  const format = step >= DAY_MS ? DAY : span <= DAY_MS ? CLOCK : DAY_HOUR;
  return { ticks, format: (t) => format.format(t) };
}
