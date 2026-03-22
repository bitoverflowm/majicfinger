"use client";

import { CONNECT_PHASE_MESSAGES, RANDOM_LOADING_SNIPPETS } from "./connectProgressMessages";

function pickRandom(arr) {
  if (!arr.length) return "";
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Runs DuckDB warm + panel chunk preload with the same labels/progress as the sidebar boot.
 * @param {{ signal?: AbortSignal; onLabel: (s: string) => void; onProgress: (n: number | ((p: number) => number)) => void }} opts
 */
export async function warmBeckerParquetConnect({ signal, onLabel, onProgress }) {
  const aborted = () => signal?.aborted;

  onLabel(CONNECT_PHASE_MESSAGES[0].text);
  onProgress(4);

  const timeoutIds = [];
  let randomIntervalId = null;
  let progressIntervalId = null;

  const after = (ms, fn) => {
    const id = setTimeout(() => {
      if (!aborted()) fn();
    }, ms);
    timeoutIds.push(id);
  };

  CONNECT_PHASE_MESSAGES.forEach(({ delayMs, text }) => {
    if (delayMs > 0) {
      after(delayMs, () => onLabel(text));
    }
  });

  after(3600, () => {
    if (aborted()) return;
    randomIntervalId = setInterval(() => {
      if (aborted()) return;
      onLabel(pickRandom(RANDOM_LOADING_SNIPPETS));
    }, 4200);
  });

  progressIntervalId = setInterval(() => {
    if (aborted()) return;
    onProgress((p) => {
      if (p >= 92) return p;
      return Math.min(92, p + 2 + Math.random() * 7);
    });
  }, 550);

  const clearAll = () => {
    timeoutIds.forEach(clearTimeout);
    if (progressIntervalId) clearInterval(progressIntervalId);
    if (randomIntervalId) clearInterval(randomIntervalId);
  };

  if (signal) {
    signal.addEventListener("abort", clearAll, { once: true });
  }

  try {
    const { warmDuckDbWasm } = await import("@/lib/duckdb/duckdbWasmClient");
    await Promise.all([warmDuckDbWasm(), import("./DataLakeParquetPanel")]);
    if (aborted()) return;
    clearAll();
    onLabel("Opening workspace…");
    onProgress(100);
    await new Promise((r) => setTimeout(r, 280));
  } finally {
    clearAll();
  }
}

/** @deprecated use warmBeckerParquetConnect */
export const warmPolymarketHistoricalConnect = warmBeckerParquetConnect;
