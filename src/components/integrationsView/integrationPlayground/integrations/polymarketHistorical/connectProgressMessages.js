/** Ordered status copy shown after Connect (before / during DuckDB warm). */
export const CONNECT_PHASE_MESSAGES = [
  { delayMs: 0, text: "Connecting to your data repository…" },
  { delayMs: 900, text: "Connection made to data repo" },
  { delayMs: 2200, text: "Preparing your personal DuckDB database…" },
];

/** Shown on long pauses (single rotating label line). */
export const RANDOM_LOADING_SNIPPETS = [
  "Indexing column statistics in the browser…",
  "Warming up the WASM query engine…",
  "Fetching bundle assets from the CDN…",
  "Spinning up a private in-memory database…",
  "Tip: Use a smaller row limit first to preview schema quickly.",
  "Tip: Parquet is columnar — DuckDB only reads the columns your SQL needs.",
  "Tip: Proxied S3 keeps your bucket private while still loading in the sheet.",
  "Tip: Join markets and trades on stable ids from the manifest.",
  "Tip: Filter early with WHERE to keep browser memory happy.",
  "Almost there — optimizing worker threads…",
  "Still loading — large WASM binaries can take a few seconds…",
  "Patience, data friend: first init is the slowest; repeats are faster.",
  "Did you know? DuckDB runs entirely in your tab — nothing leaves your machine except HTTPS fetches you request.",
  "Random fact: Prediction-market history compresses beautifully in Parquet.",
  "Stretch suggestion: perfect time for a sip of water ☕",
];
