/**
 * Rule-first intent router for @lychee_data mentions.
 * Natural language is enough; optional shortcuts map into the same schema.
 */

const SHORTCUTS = [
  { re: /\b(holders?|whales?|concentration)\b/i, mode: "holders" },
  { re: /\b(gap|arb|arbitrage|kalshi\s*vs|cross[- ]?venue)\b/i, mode: "gap" },
  { re: /\b(calibrat|brier|settled|closed markets?)\b/i, mode: "calibrate" },
  { re: /\b(pulse|what's hot|whats hot|scan|brief)\b/i, mode: "pulse" },
  { re: /\b(jarvis|research|dig|look into|analyze|analyse)\b/i, mode: "research" },
];

function extractTickers(text) {
  const out = [];
  const re = /\b([A-Z]{2,12}(?:-[A-Z0-9]{1,12}){0,3})\b/g;
  let m;
  while ((m = re.exec(text))) {
    const t = m[1];
    if (!["HTTP", "HTTPS", "HTML", "JSON", "API", "UTC", "CEO", "USA"].includes(t)) out.push(t);
  }
  return [...new Set(out)].slice(0, 3);
}

function extractUrls(text) {
  const urls = String(text || "").match(/https?:\/\/[^\s)]+/gi) || [];
  return urls.map((u) => u.replace(/[.,;!?)]+$/, "")).slice(0, 5);
}

function extractConditionId(text) {
  const m = String(text || "").match(/0x[a-fA-F0-9]{64}/);
  return m ? m[0] : "";
}

/**
 * @param {{ text: string, parent_text?: string, author_handle?: string, deliver_default?: string }} input
 */
export function parseMentionIntent(input = {}) {
  const text = String(input.text || "").trim();
  const parent = String(input.parent_text || "").trim();
  const combined = `${text}\n${parent}`.trim();
  const cleaned = text.replace(/@lychee_data/gi, " ").replace(/\s+/g, " ").trim();

  let mode = "research";
  for (const s of SHORTCUTS) {
    if (s.re.test(cleaned) || s.re.test(parent)) {
      mode = s.mode;
      break;
    }
  }
  if (!cleaned || /^(jarvis|this|please|pls)?[.!?]*$/i.test(cleaned)) {
    mode = parent ? "research" : "pulse";
  }

  const condition_id = extractConditionId(combined);
  const urls = extractUrls(combined);
  const tickers = extractTickers(cleaned || parent);
  const query =
    cleaned && !/^(jarvis|this|please|pls)$/i.test(cleaned)
      ? cleaned
      : parent.slice(0, 200) || "";

  // Pulse/scan needs no subject; only clarify when we still lack anything to research.
  const vague =
    mode !== "pulse" &&
    !condition_id &&
    !tickers.length &&
    !urls.length &&
    query.length < 8 &&
    !parent;

  return {
    mode: vague ? "clarify" : mode,
    subject: {
      query: query || null,
      condition_id: condition_id || null,
      ticker: tickers[0] || null,
      urls,
      parent_excerpt: parent.slice(0, 280) || null,
    },
    deliver: input.deliver_default || "public_reply",
    depth: mode === "pulse" ? "quick" : "standard",
    ask_user: vague
      ? "What market or theme should Jarvis dig into? (or reply under a market tweet and tag me again)"
      : null,
    author_handle: input.author_handle || null,
    raw_text: text,
  };
}
