/**
 * Attach a seeded or unseeded random sample to a Kalshi Historical compose request.
 * Athena applies it as ORDER BY random() or a seeded hash, then LIMIT n.
 * The ordinary row limit is removed so the sample size is the cap.
 */
export function attachRandomSample(request, { size, mode, seed } = {}) {
  if (!request || typeof request !== "object") return request;
  const n = Math.floor(Number(size));
  if (!Number.isFinite(n) || n < 1) return request;
  const seeded = mode !== "unseeded";
  const randomSample = seeded
    ? { enabled: true, size: n, mode: "seeded", seed: String(seed || "") }
    : { enabled: true, size: n, mode: "unseeded" };
  const next = {
    ...request,
    compose: {
      ...(request.compose || {}),
      randomSample,
    },
  };
  delete next.limit;
  return next;
}

function sampleRank(mode, seed, index, row) {
  if (mode === "unseeded") return Math.random();
  const text = `${seed}:${index}:${row?.ticker || ""}:${row?.trade_id || ""}`;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Shuffle the rows already on screen. The full draw happens in Athena on run. */
export function previewRandomSample(rows, { size, mode, seed } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const n = Math.floor(Number(size));
  if (!Number.isFinite(n) || n < 1 || !list.length) return [];
  const ranked = list.map((row, index) => ({
    row,
    index,
    rank: sampleRank(mode, seed, index, row),
  }));
  ranked.sort((a, b) => a.rank - b.rank || a.index - b.index);
  return ranked.slice(0, Math.min(n, list.length)).map((item) => item.row);
}
