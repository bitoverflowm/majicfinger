"use client";

import { RANDOM_LOADING_SNIPPETS } from "./connectProgressMessages";

function pickRandom(arr) {
  if (!arr.length) return "";
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Status line updates while a Parquet → DuckDB → sheet load runs. */
export const PARQUET_LOAD_PHASE_MESSAGES = [
  { delayMs: 0, text: "Preparing your request…" },
  { delayMs: 450, text: "Fetching Parquet from your data repository…" },
  { delayMs: 1100, text: "Loading bytes in the browser…" },
  { delayMs: 1850, text: "Registering data with DuckDB…" },
  { delayMs: 2650, text: "Executing query…" },
];

/**
 * Runs `loadFn()` (e.g. queryRemoteParquet) while animating the same label/progress pattern as Connect.
 * @param {{ signal?: AbortSignal; onLabel: (s: string | ((p: string) => string)) => void; onProgress: (n: number | ((p: number) => number)) => void; loadFn: () => Promise<unknown> }} opts
 */
export async function runParquetSheetLoadWithProgress({ signal, onLabel, onProgress, loadFn }) {
  const aborted = () => signal?.aborted;

  onLabel(PARQUET_LOAD_PHASE_MESSAGES[0].text);
  onProgress(5);

  const timeoutIds = [];
  let randomIntervalId = null;
  let progressIntervalId = null;

  const after = (ms, fn) => {
    const id = setTimeout(() => {
      if (!aborted()) fn();
    }, ms);
    timeoutIds.push(id);
  };

  PARQUET_LOAD_PHASE_MESSAGES.forEach(({ delayMs, text }) => {
    if (delayMs > 0) {
      after(delayMs, () => onLabel(text));
    }
  });

  after(3400, () => {
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
    const result = await loadFn();
    if (aborted()) return result;
    clearAll();
    onLabel("Writing results to your sheet…");
    onProgress(100);
    await new Promise((r) => setTimeout(r, 220));
    return result;
  } catch (e) {
    clearAll();
    throw e;
  }
}
