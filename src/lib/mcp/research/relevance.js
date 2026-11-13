const STOP = new Set(
  (
    "a an the this that for of to in on is are was were be and or what where when how who why " +
    "there any market markets hot pulse jarvis please pls going on actually right now which does did " +
    "will would could should whom whose next his her their our your about talking response nothing " +
    "with from into over after before than then also more most some these those have has had been " +
    "not but if so just still very can may might must shall do doing done impact affecting affected " +
    "listed closest related news headline article tweet post comment comments"
  ).split(" "),
);

const ALIASES = {
  nvda: "nvidia",
  nividia: "nvidia",
  nvdia: "nvidia",
  jensen: "nvidia",
  huang: "nvidia",
};

export function tokens(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => ALIASES[w] || w);
}

/** Topic words — interrogatives and glue already stripped by STOP. */
export function contentTokens(s) {
  return tokens(s).filter((w) => w.length > 3 || /^(ceo|fed|oil|gdp|ai|etf|ipo)$/.test(w));
}

const MONTHS = "january february march april may june july august september october november december".split(" ");

function fuzzyHit(word, haystack) {
  if (haystack.has(word)) return 1;
  if (word.length < 5) return 0;
  for (const x of haystack) {
    if (x.length < 5) continue;
    if (word.startsWith(x.slice(0, 5)) || x.startsWith(word.slice(0, 5))) return 0.7;
  }
  return 0;
}

/**
 * Title-vs-news score. Long headlines must not "match" a book just because they
 * share which/will/next. Distinctive tokens (nvidia, ceo, …) have to land.
 */
export function relevanceScore(query, title) {
  const q = contentTokens(query);
  const tArr = contentTokens(title);
  const t = new Set(tArr);
  if (!q.length || !t.size) return 0;

  let titleCover = 0;
  for (const w of tArr) titleCover += fuzzyHit(w, new Set(q));
  const cover = titleCover / tArr.length;

  const distinctive = q.filter((w) => w.length >= 5);
  let dHit = 0;
  for (const w of distinctive) {
    if (fuzzyHit(w, t) > 0) dHit += 1;
  }
  if (distinctive.length >= 2 && dHit === 0) return 0;
  if (q.some((w) => w.length >= 6) && dHit === 0 && titleCover < 0.34) return 0;

  const dRate = distinctive.length ? dHit / Math.min(distinctive.length, 8) : cover;
  let score = 0.5 * cover + 0.5 * Math.min(1, dRate * 1.5);

  const qYears = String(query).match(/\b20\d{2}\b/g) || [];
  const titleLower = String(title || "").toLowerCase();
  for (const y of qYears) {
    if (!String(title).includes(y)) score *= 0.35;
  }
  for (const m of MONTHS) {
    if (String(query).toLowerCase().includes(m) && !titleLower.includes(m) && !titleLower.includes(m.slice(0, 3))) {
      score *= 0.7;
    }
  }
  return Math.min(1, score);
}

/** Short Kalshi/Poly search string — proper nouns first, not the whole tweet. */
export function compactSearchQuery(raw, maxWords = 8) {
  const original = String(raw || "").trim();
  if (!original) return "";
  const seen = new Set();
  const out = [];
  const push = (w) => {
    const stripped = String(w || "").replace(/'s$/i, "");
    const aliased = ALIASES[stripped.toLowerCase()] || stripped;
    const k = aliased.toLowerCase();
    if (k.length < 2 || STOP.has(k) || seen.has(k)) return;
    seen.add(k);
    out.push(aliased);
  };
  for (const m of original.matchAll(/\b([A-Z][a-zA-Z]{2,}(?:'[sS])?|[A-Z]{2,6})\b/g)) {
    push(m[1]);
  }
  const byLen = [...new Set(contentTokens(original))].sort((a, b) => b.length - a.length);
  for (const w of byLen) {
    if (out.length >= maxWords) break;
    push(w);
  }
  return out.slice(0, maxWords).join(" ");
}
