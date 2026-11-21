/**
 * Evidence timeline: sort by source time, stable tie-break, idempotent upserts,
 * delayed attribution enriches the original fill, quotes never regress.
 */

function ts(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Date.parse(String(value));
  return Number.isFinite(n) ? n : 0;
}

function cmpId(a, b) {
  return String(a || "").localeCompare(String(b || ""));
}

/**
 * Meaningful source timestamp first, then observed time, then stable id.
 * @param {{ occurredAt?: string; observedAt?: string; id?: string }} a
 * @param {{ occurredAt?: string; observedAt?: string; id?: string }} b
 */
export function compareSignals(a, b) {
  const occurred = ts(a?.occurredAt) - ts(b?.occurredAt);
  if (occurred) return occurred;
  const observed = ts(a?.observedAt) - ts(b?.observedAt);
  if (observed) return observed;
  return cmpId(a?.id, b?.id);
}

/**
 * @param {Array<Record<string, unknown>>} signals
 */
export function sortSignals(signals) {
  return [...(Array.isArray(signals) ? signals : [])].sort(compareSignals);
}

/**
 * Merge a signal into the timeline. Same id replaces in place (enrichment).
 * Delayed wallet attribution with `enrichesId` copies wallet fields onto the fill.
 *
 * @param {Array<Record<string, unknown>>} current
 * @param {Record<string, unknown>} incoming
 */
export function upsertSignal(current, incoming) {
  const list = Array.isArray(current) ? [...current] : [];
  if (!incoming || typeof incoming !== "object") return list;
  const id = String(incoming.id || "").trim();
  if (!id) return list;

  const enrichesId = String(incoming.enrichesId || incoming.data?.enrichesId || "").trim();
  if (enrichesId) {
    const idx = list.findIndex((row) => String(row.id) === enrichesId);
    if (idx >= 0) {
      const prev = list[idx];
      const prevData = prev.data && typeof prev.data === "object" ? prev.data : {};
      const nextData = incoming.data && typeof incoming.data === "object" ? incoming.data : {};
      list[idx] = {
        ...prev,
        ...incoming,
        id: prev.id,
        kind: prev.kind,
        occurredAt: prev.occurredAt,
        observedAt: incoming.observedAt || prev.observedAt,
        summary: incoming.summary || prev.summary,
        data: {
          ...prevData,
          ...nextData,
          attributed: true,
          wallet: nextData.wallet || prevData.wallet,
        },
      };
      return sortSignals(list);
    }
  }

  const existing = list.findIndex((row) => String(row.id) === id);
  if (existing >= 0) {
    const prev = list[existing];
    list[existing] = {
      ...prev,
      ...incoming,
      id: prev.id,
      occurredAt: prev.occurredAt || incoming.occurredAt,
      observedAt: incoming.observedAt || prev.observedAt,
      data: {
        ...(prev.data && typeof prev.data === "object" ? prev.data : {}),
        ...(incoming.data && typeof incoming.data === "object" ? incoming.data : {}),
      },
    };
    return sortSignals(list);
  }

  list.push(incoming);
  return sortSignals(list);
}

/**
 * Apply a quote only if it is not older than the current quote for that market+outcome.
 * @param {Record<string, unknown> | null} current
 * @param {Record<string, unknown>} incoming
 */
export function applyQuote(current, incoming) {
  if (!incoming || typeof incoming !== "object") return current;
  if (!current) return incoming;
  const curSource = ts(current.sourceTs);
  const nextSource = ts(incoming.sourceTs);
  if (nextSource && curSource && nextSource < curSource) return current;
  if (nextSource === curSource) {
    const curObs = ts(current.observedTs);
    const nextObs = ts(incoming.observedTs);
    if (nextObs < curObs) return current;
  }
  return incoming;
}

export function signalTimestampMs(signal) {
  return ts(signal?.occurredAt) || ts(signal?.observedAt);
}
