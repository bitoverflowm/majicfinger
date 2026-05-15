/**
 * Lightweight Athena connectivity test (COUNT … LIMIT 1).
 * @param {{ lake: string; table: string }} params
 */
export async function pingAthenaLakeConnection({ lake, table }) {
  const res = await fetch("/api/data-lake/athena-query/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      lake,
      table,
      queryType: "count",
      countAlias: "count",
      limit: 1,
      caseSensitive: true,
      filters: null,
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || res.statusText || `Ping ${res.status}`);
}

/** @typedef {"idle" | "loading" | "ok" | "error"} AthenaPingState */

/**
 * @param {AthenaPingState} state
 */
export function athenaPingStateClassName(state) {
  if (state === "loading") return "bg-amber-500 animate-pulse";
  if (state === "ok") return "bg-emerald-500";
  if (state === "error") return "bg-red-500";
  return "bg-slate-300 dark:bg-slate-700";
}

/**
 * @param {AthenaPingState} state
 */
export function athenaPingStateLabel(state) {
  if (state === "loading") return "Checking connection…";
  if (state === "ok") return "Connected";
  if (state === "error") return "Connection issue";
  return "Not checked";
}
