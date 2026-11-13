/**
 * Shared Jarvis intent — MCP chat and X mentions use the same router.
 */

const SHORTCUTS = [
  { re: /\b(holders?|whales?|concentration|whale\s*move)\b/i, mode: "holders" },
  { re: /\b(gap|arb|arbitrage|kalshi\s*vs|cross[- ]?venue)\b/i, mode: "gap" },
  { re: /\b(calibrat|brier|settled|closed markets?)\b/i, mode: "calibrate" },
  { re: /\b(pulse|what's hot|whats hot|scan|brief)\b/i, mode: "pulse" },
  {
    re: /\b((what|which) markets?\b|\bmarkets? (does|do|is|are) this\b|\bdoes this impact\b|\bthis impact\b|markets? (for|on) this news|this (headline|article|news))\b/i,
    mode: "news_impact",
  },
  { re: /\b(is there a market|any market for|market for this)\b/i, mode: "market_for" },
  { re: /\b(lookalike|similar markets?|same (event|series)|related deadline)\b/i, mode: "lookalikes" },
  { re: /\b(accurate|backed by|does (the )?data|is (this|that) true|check (this|that)|evidence)\b/i, mode: "verify" },
  { re: /\b(jarvis|research|dig|look into|analyze|analyse)\b/i, mode: "research" },
];

const FILLER =
  /\b(is there a market( for this)?|any market for this|(what|which) markets?( (is|are|does|do) this( affecting| impact)?)?|does this impact|jarvis|please|pls)\b/gi;

const META_COMPLAINT =
  /\b(your response|you('re| are) wrong|nothing to do with|unrelated|not even close|try again|that('s| is) (wrong|unrelated))\b[^.!?\n]*/gi;

function stripAsk(text) {
  return String(text || "")
    .replace(FILLER, " ")
    .replace(META_COMPLAINT, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isThinFollowUp(mention) {
  const c = stripAsk(mention);
  if (c.length < 12) return true;
  return /^(this|that|the above|the (tweet|post|headline))[.!?]*$/i.test(c);
}

function extractTickers(text) {
  const out = [];
  const re = /\b([A-Z]{2,12}(?:-[A-Z0-9]{1,12}){0,3})\b/g;
  let m;
  while ((m = re.exec(text))) {
    const t = m[1];
    if (!["HTTP", "HTTPS", "HTML", "JSON", "API", "UTC", "CEO", "USA", "YES", "THE"].includes(t)) out.push(t);
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

function extractWallet(text) {
  const m = String(text || "").match(/0x[a-fA-F0-9]{40}(?![a-fA-F0-9])/);
  return m ? m[0].toLowerCase() : "";
}

function extractHandle(text) {
  const m = String(text || "").match(/@([A-Za-z0-9_]{2,15})/);
  if (!m) return "";
  const h = m[1];
  if (/^lychee_data$/i.test(h)) return "";
  return h;
}

function looksLikeNews(text) {
  return (
    /\b(news|headline|breaking|article|reported|reports that)\b/i.test(text) ||
    /https?:\/\/(www\.)?(nytimes|wsj|reuters|bloomberg|cnn|bbc|coindesk|theblock)/i.test(text)
  );
}

/**
 * @param {{ text: string, parent_text?: string, author_handle?: string, deliver_default?: string }} input
 */
export function parseResearchIntent(input = {}) {
  const text = String(input.text || "").trim();
  const parent = String(input.parent_text || "").trim();
  const combined = `${text}\n${parent}`.trim();
  const cleaned = text.replace(/@lychee_data/gi, " ").replace(/\s+/g, " ").trim();

  let mode = parent ? "market_for" : "research";
  for (const s of SHORTCUTS) {
    if (s.re.test(cleaned)) {
      mode = s.mode;
      break;
    }
  }
  if (mode === "market_for" || mode === "research") {
    for (const s of SHORTCUTS) {
      if (s.mode === "pulse") continue;
      if (s.re.test(parent)) {
        mode = s.mode;
        break;
      }
    }
  }
  if (extractWallet(combined) && mode === "market_for") mode = "verify";
  if (looksLikeNews(combined) && (mode === "market_for" || mode === "research")) mode = "news_impact";
  if (!cleaned || /^(jarvis|this|please|pls)?[.!?]*$/i.test(cleaned)) {
    mode = parent ? (mode === "pulse" ? "pulse" : "market_for") : "clarify";
  }

  const condition_id = extractConditionId(combined);
  const wallet = extractWallet(combined);
  const urls = extractUrls(combined);
  const tickers = extractTickers(cleaned || parent);
  const handle = extractHandle(`${cleaned} ${parent}`);

  const mentionBody = stripAsk(cleaned);
  const parentBody = stripAsk(parent).slice(0, 400);
  let query = mentionBody;
  if (parentBody && (isThinFollowUp(cleaned) || mentionBody.length < 8)) {
    query = parentBody;
  } else if (parentBody && mentionBody) {
    query = `${parentBody} ${mentionBody}`.slice(0, 400);
  } else {
    query = mentionBody || parentBody;
  }

  const vague =
    mode !== "pulse" &&
    !condition_id &&
    !wallet &&
    !tickers.length &&
    !urls.length &&
    !parent &&
    query.length < 8;

  return {
    mode: vague ? "clarify" : mode,
    subject: {
      query: query || null,
      condition_id: condition_id || null,
      ticker: tickers[0] || null,
      wallet: wallet || null,
      handle: handle || null,
      urls,
      parent_excerpt: parent.slice(0, 400) || null,
    },
    deliver: input.deliver_default || "public_reply",
    depth: mode === "pulse" ? "quick" : "standard",
    ask_user: vague
      ? "Reply under the tweet (or paste a market / wallet) and tag me again — I need a subject to pull from Lychee."
      : null,
    author_handle: input.author_handle || null,
    raw_text: text,
  };
}

/** @deprecated alias — X and MCP share parseResearchIntent */
export function parseMentionIntent(input) {
  return parseResearchIntent(input);
}
