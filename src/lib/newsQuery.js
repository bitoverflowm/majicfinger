/**
 * Turning a prediction market's title into a news search, and lining news up against trades.
 * Shared by the news API route and the client.
 */

const STOP = new Set(
  (
    "a an and any are as at be been before between by can could did do does during each end ends ending ever every " +
    "for from get gets had has have he her his how if in into is it its least less more most much next no not of off " +
    "on or our out over says say said she so than that the their them there these they this those through to under " +
    "until up upon vs v was we were what when which who whom will with would yes you your " +
    "above below hit hits reach reaches reached win wins won lose loses happen happens announce announces announced " +
    "remain remains stay stays still again another other top first last second third final price prices market " +
    "markets close closes closed high higher low lower day days week weeks month months year years today tomorrow tonight " +
    "increase increases decrease decreases rise rises fall falls drop drops bps percent official officially round " +
    "game games match matches series new largest biggest best worst number total both team teams score scores " +
    "goal goals spread winner draw half map maps handicap moneyline"
  ).split(" "),
);
const MONTHS = new Set(
  (
    "january february march april may june july august september october november december " +
    "jan feb mar apr jun jul aug sep sept oct nov dec monday tuesday wednesday thursday friday saturday sunday"
  ).split(" "),
);
/** Short connectors kept inside a name, as in "Secretary of Defense" or "Bank of England". */
const JOINERS = new Set(["of", "the", "de", "la", "del", "von", "van", "&"]);
/** Club suffixes headlines usually leave off: "Sutton United FC" is written "Sutton United". */
const CLUB_TAGS = /^(fc|afc|cf|sc|fk|bk)$/i;
const TOKEN = /[A-Za-z0-9$][A-Za-z0-9'’&.$-]*/g;
const MIN_TERM = 3;
const MAX_TERMS = 5;
const MAX_SUGGESTIONS = 8;

function clean(token) {
  return token.replace(/['’]s$/i, "").replace(/[.'’-]+$/g, "");
}

function skippable(word) {
  const lower = word.toLowerCase();
  return !lower || STOP.has(lower) || MONTHS.has(lower) || /^\$|^\d[\d.,%kmb]*$/i.test(lower) || /^q[1-4]$/i.test(lower);
}

function proper(word) {
  return /[A-Z]/.test(word) && !skippable(word);
}

/** Names (runs of capitalised words) and plain words, in title order. */
function pieces(text) {
  const names = [];
  const words = [];
  const tokens = [];
  const source = String(text || "").replace(/^\s*will\s+/i, "");
  for (const match of source.matchAll(TOKEN)) tokens.push({ word: clean(match[0]), start: match.index, end: match.index + match[0].length });
  let run = [];
  const flush = () => {
    if (run.length > 1) run = run.filter((word) => !CLUB_TAGS.test(word));
    while (run.length && JOINERS.has(run.at(-1).toLowerCase())) run.pop();
    if (run.length) names.push(run.join(" "));
    run = [];
  };
  tokens.forEach((token, index) => {
    const gap = index ? source.slice(tokens[index - 1].end, token.start) : "";
    if (run.length && gap.trim()) flush();
    const lower = token.word.toLowerCase();
    if (proper(token.word)) run.push(token.word);
    else if (run.length && JOINERS.has(lower) && tokens[index + 1] && proper(tokens[index + 1].word)) run.push(token.word);
    else {
      flush();
      if (token.word.length >= 4 && !skippable(token.word) && !/[A-Z]/.test(token.word)) words.push(lower);
    }
  });
  flush();
  return { names, words };
}

function addUnique(list, term) {
  const lower = term.toLowerCase();
  if (term && !list.some((item) => item.toLowerCase() === lower)) list.push(term);
}

/**
 * Starting search terms for a market, every one of which an article should mention, plus related
 * terms to offer. The first name in the title leads; a one-word lead gets a second term to narrow it.
 */
export function marketNewsTerms(title, subtitle = "") {
  const main = pieces(title);
  const extra = pieces(subtitle);
  const names = [];
  for (const name of [...main.names, ...extra.names]) addUnique(names, name);
  const words = [];
  for (const word of [...main.words, ...extra.words]) addUnique(words, word);
  const usable = names.filter((name) => name.length >= MIN_TERM);
  const terms = [];
  const matchup = /\s(vs?\.?|versus)\s/i.test(String(title || "")) && usable.length >= 2;
  if (matchup) {
    terms.push(usable[0], usable[1]);
  } else if (usable[0]) {
    terms.push(usable[0]);
    if (!usable[0].includes(" ")) {
      const next = usable[1] || words[0];
      if (next) terms.push(next);
    }
  } else {
    for (const word of words.slice(0, 2)) terms.push(word);
  }
  const suggestions = [];
  for (const name of names) {
    if (name.length >= MIN_TERM) addUnique(suggestions, name);
    const parts = name.split(" ").filter((part) => part.length >= 4 && !JOINERS.has(part.toLowerCase()));
    if (parts.length > 1) addUnique(suggestions, parts.at(-1));
  }
  for (const word of words) addUnique(suggestions, word);
  const taken = new Set(terms.map((term) => term.toLowerCase()));
  return { terms, suggestions: suggestions.filter((item) => !taken.has(item.toLowerCase())).slice(0, MAX_SUGGESTIONS) };
}

/** User-typed terms trimmed, de-duplicated and capped. */
export function cleanTerms(list) {
  const out = [];
  for (const raw of Array.isArray(list) ? list : [list]) {
    const term = String(raw ?? "").replace(/["()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    if (term.length >= 2) addUnique(out, term);
    if (out.length >= MAX_TERMS) break;
  }
  return out;
}

/** Every term must appear; anything that isn't a single plain word is searched as an exact phrase. */
export function newsQuery(terms) {
  return cleanTerms(terms)
    .map((term) => (/^[A-Za-z0-9]+$/.test(term) ? term : `"${term}"`))
    .join(" ");
}

/** Same story from two sources, or the same wire story on two sites, collapses to one key. */
export function articleKey(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 90);
}

/** How many terms the headline itself mentions. A name counts if its last word appears. */
export function headlineHits(title, terms) {
  const text = ` ${articleKey(title)} `;
  let hits = 0;
  for (const term of terms) {
    const key = articleKey(term);
    const last = key.split(" ").at(-1);
    if (key && (text.includes(` ${key} `) || (last.length >= 4 && text.includes(` ${last} `)))) hits += 1;
  }
  return hits;
}

/**
 * The same article from several sources becomes one, keeping the most precise time, the direct
 * link over a redirect and the publisher's display name. Newest first.
 */
export function mergeArticles(lists) {
  const byKey = new Map();
  for (const article of lists.flat()) {
    if (!article?.title || !Number.isFinite(article.t)) continue;
    const key = articleKey(article.title);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...article, id: key, providers: [article.provider] });
      continue;
    }
    if (!prev.providers.includes(article.provider)) prev.providers.push(article.provider);
    const sharper = prev.precision === "day" && article.precision !== "day";
    if (sharper || (article.precision !== "day" && article.t < prev.t)) {
      prev.t = article.t;
      prev.precision = article.precision;
    }
    if (article.provider === "gdelt") prev.url = article.url;
    if (article.provider === "google" && article.source) prev.source = article.source;
  }
  return [...byKey.values()].sort((a, b) => b.t - a.t);
}

/** The closest timed articles before and after `t`, within `withinMs`. Day-only dates don't count. */
export function newsAround(articles, t, withinMs) {
  let before = null;
  let after = null;
  for (const article of articles) {
    if (article.precision === "day") continue;
    const gap = article.t - t;
    if (Math.abs(gap) > withinMs) continue;
    if (gap < 0 && (!before || article.t > before.t)) before = article;
    if (gap >= 0 && (!after || article.t < after.t)) after = article;
  }
  return { before, after };
}

/** "42 min", "3 h 10 min", "2 days". */
export function gapLabel(ms) {
  const minutes = Math.round(Math.abs(ms) / 60_000);
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}
