/** Charting every row on each page would stall a big pull, so the gap widens as the rows add up. */
function gapFor(count, gapMs) {
  if (count > 200_000) return Math.max(gapMs, 3000);
  if (count > 50_000) return Math.max(gapMs, 1500);
  return gapMs;
}

/**
 * Paces a trade history pull's partial results. `send(build)` calls `onRows(build())` at most
 * once per gap (600ms, longer once the result is large), so merging the rows so far only runs
 * when it will be shown. The first page goes out at once; the pull's final result follows
 * whatever the last send was.
 */
export function pacedRows(onRows, gapMs = 600) {
  if (typeof onRows !== "function") return () => {};
  let last = 0;
  let gap = gapMs;
  return (build) => {
    const now = Date.now();
    if (last && now - last < gap) return;
    last = now;
    const partial = build();
    gap = gapFor(partial?.rows?.length || 0, gapMs);
    onRows(partial);
  };
}
