/** Shared time-bucket interval options for sheet bucketing (grid + server replay). */
export const BUCKET_TIME_INTERVALS = [
  { value: "second", label: "Seconds", ms: 1000 },
  { value: "minute", label: "Minutes", ms: 60 * 1000 },
  { value: "15_minutes", label: "15 mins", ms: 15 * 60 * 1000 },
  { value: "hour", label: "Hour", ms: 60 * 60 * 1000 },
  { value: "day", label: "Day", ms: 24 * 60 * 60 * 1000 },
  { value: "week", label: "Week", ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "month", label: "Month", calendar: "month" },
  { value: "year", label: "Year", calendar: "year" },
];
