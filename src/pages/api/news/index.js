import { archiveConfigured, fromArchive } from "@/lib/newsArchive";
import { cleanTerms } from "@/lib/newsQuery";
import {
  GDELT_REACH_MS,
  gdeltArticles,
  gdeltUrl,
  gdeltVolume,
  googleNewsUrl,
  parseGoogleNewsRss,
  readGdelt,
  withinWindow,
} from "@/lib/newsSources";

/**
 * GET /api/news?source=google|gdelt|volume&terms=…&terms=…&start=ms&end=ms
 *
 * Headlines (or, for `volume`, article counts over time) mentioning every term inside the window.
 * Answers `{ status, articles | volume, message? }` where status is ok, limited (GDELT asked us to
 * slow down), busy (too many GDELT lookups queued), unavailable (GDELT or the archive didn't
 * answer), out_of_range or error. The first three are worth retrying shortly.
 *
 * GDELT results come from the news archive in the data lake when it's configured, and from
 * GDELT's own rate-limited search API otherwise.
 */

const MINUTE = 60_000;
/** GDELT allows one request every five seconds per IP, and backs off harder when pushed. */
const GDELT_GAP_MS = 5_500;
const GDELT_COOLDOWN_MS = 60_000;
const GDELT_MAX_QUEUED = 6;
/** GDELT often takes 10 seconds or more to answer. */
const FETCH_TIMEOUT_MS = 30_000;
/** A window ending this close to now is live: GDELT refreshes every 15 minutes, Google News within minutes. */
const LIVE_EDGE_MS = 30 * MINUTE;
const TTL = {
  live: { google: 2 * MINUTE, gdelt: 5 * MINUTE, volume: 5 * MINUTE },
  past: 6 * 60 * MINUTE,
  limited: 45_000,
  error: MINUTE,
};
const MAX_CACHED = 400;
const USER_AGENT = "Lychee news lookup";

const cache = new Map();
const inflight = new Map();
let gdeltQueue = Promise.resolve();
let gdeltQueued = 0;
let gdeltNextAt = 0;

function remember(key, value, ttl) {
  cache.delete(key);
  cache.set(key, { value, expires: Date.now() + ttl });
  while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value);
}

function cached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One GDELT request at a time, spaced out, cooling off after it pushes back. */
function gdeltFetch(url) {
  if (gdeltQueued >= GDELT_MAX_QUEUED) return Promise.resolve({ busy: true });
  gdeltQueued += 1;
  const run = gdeltQueue.then(async () => {
    try {
      const wait = gdeltNextAt - Date.now();
      if (wait > 0) await sleep(wait);
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      const read = readGdelt(await res.text());
      gdeltNextAt = Date.now() + (read.limited ? GDELT_COOLDOWN_MS : GDELT_GAP_MS);
      return read;
    } catch (err) {
      gdeltNextAt = Date.now() + GDELT_GAP_MS;
      if (err?.name === "TimeoutError") return { message: "GDELT took too long to answer; trying again shortly.", retry: true };
      console.warn("GDELT request failed:", err?.cause?.code || err?.message);
      return { message: "Couldn't reach GDELT; trying again shortly.", retry: true };
    } finally {
      gdeltQueued -= 1;
    }
  });
  gdeltQueue = run.catch(() => {});
  return run;
}

async function fromGdelt(source, terms, start, end) {
  const reach = Date.now() - GDELT_REACH_MS;
  if (end < reach) return { status: "out_of_range", message: "GDELT only searches the last three months." };
  const from = Math.max(start, reach);
  const read = await gdeltFetch(gdeltUrl(source === "volume" ? "timelinevolraw" : "artlist", terms, from, end));
  if (read.busy) return { status: "busy", message: "Waiting for a turn with GDELT." };
  if (read.limited) return { status: "limited", message: "GDELT asked us to slow down; trying again shortly." };
  if (read.message) return { status: read.retry ? "unavailable" : "error", message: read.message };
  const clipped = from > start ? { message: "GDELT only searches the last three months, so earlier news is missing." } : {};
  if (source === "volume") return { status: "ok", volume: gdeltVolume(read.json), ...clipped };
  return { status: "ok", articles: withinWindow(gdeltArticles(read.json), start, end), ...clipped };
}

async function fromGdeltAnywhere(source, terms, start, end) {
  if (!archiveConfigured()) return fromGdelt(source, terms, start, end);
  try {
    return await fromArchive(source, terms, start, end);
  } catch (err) {
    if (err?.code === "CONFIG") return fromGdelt(source, terms, start, end);
    console.warn("News archive query failed:", err?.code || err?.name, err?.message);
    return { status: "unavailable", message: "The news archive didn't answer; trying again shortly." };
  }
}

async function fromGoogle(terms, start, end) {
  try {
    const res = await fetch(googleNewsUrl(terms, start, end), {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { status: "error", message: `Google News answered ${res.status}.` };
    return { status: "ok", articles: withinWindow(parseGoogleNewsRss(await res.text()), start, end) };
  } catch (err) {
    return { status: "error", message: err?.name === "TimeoutError" ? "Google News took too long to answer." : "Couldn't reach Google News." };
  }
}

function ttlFor(source, result, end) {
  if (result.status === "ok" || result.status === "out_of_range") {
    return end > Date.now() - LIVE_EDGE_MS ? TTL.live[source] : TTL.past;
  }
  return result.status === "error" ? TTL.error : TTL.limited;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Use GET" });
  }
  const source = String(req.query.source || "");
  if (!["google", "gdelt", "volume"].includes(source)) {
    return res.status(400).json({ message: "source must be google, gdelt or volume" });
  }
  const terms = cleanTerms(req.query.terms);
  if (!terms.length) return res.status(400).json({ message: "Add at least one search term" });
  const start = Number(req.query.start);
  const end = Math.min(Number(req.query.end), Date.now() + 5 * MINUTE);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return res.status(400).json({ message: "start and end must be epoch milliseconds with end after start" });
  }

  const key = `${source}|${terms.map((term) => term.toLowerCase()).join("\u0001")}|${start}|${end}`;
  let result = cached(key);
  if (!result) {
    let pending = inflight.get(key);
    if (!pending) {
      pending = (source === "google" ? fromGoogle(terms, start, end) : fromGdeltAnywhere(source, terms, start, end)).finally(() =>
        inflight.delete(key),
      );
      inflight.set(key, pending);
    }
    result = await pending;
    remember(key, result, ttlFor(source, result, end));
  }
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(result);
}
