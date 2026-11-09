/**
 * Copies GDELT's 15-minute GKG files into the data lake as slim, searchable JSON lines.
 *
 * Layout under s3://NEWS_BUCKET/NEWS_PREFIX:
 *   day=YYYY-MM-DD/YYYYMMDDHHMMSS.json.gz   one slot, written by the 15-minute schedule
 *   day=YYYY-MM-DD/day.json.gz              the whole day in one file; replaces the slot files
 *
 * Events:
 *   { "slots"?: 12, "force"?: false }    catch up on the newest slots, then roll up yesterday once it's over
 *   { "action": "day", "day": "2026-08-10" }   (re)build one whole day
 *
 * Deployed by deploy.mjs. gkg.mjs is src/lib/gdeltGkg.js copied in at deploy time.
 */
import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { LAST_UPDATE_URL, dayOf, encodeArticles, gkgUrl, latestSlot, parseGkgZip, slotMs, slotOf, slotsForDay } from "./gkg.mjs";

const BUCKET = process.env.NEWS_BUCKET;
const PREFIX = (process.env.NEWS_PREFIX || "news/gdelt/articles/").replace(/\/?$/, "/");
const SLOT_MS = 15 * 60_000;
/** The schedule looks back this far, so a few missed runs fill themselves in. */
const RECENT_SLOTS = 12;
const MAX_LOOKBACK = 192;
/** Roll up a day only once its last slot has had time to publish. */
const ROLLUP_AFTER_MS = 60 * 60_000;
const DOWNLOADS_AT_ONCE = 4;
const FETCH_TIMEOUT_MS = 60_000;
const DAY_FILE = "day.json.gz";

const s3 = new S3Client({});

async function fetchSlot(slot) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(gkgUrl(slot), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseGkgZip(Buffer.from(await res.arrayBuffer()));
    } catch (err) {
      if (attempt === 3) throw new Error(`${slot}: ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
    }
  }
  return null;
}

async function mapLimited(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function listDay(day) {
  const keys = [];
  let token;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: `${PREFIX}day=${day}/`, ContinuationToken: token }));
    for (const item of page.Contents || []) keys.push(item.Key);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function put(key, articles) {
  const body = encodeArticles(articles);
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: "application/gzip" }));
  return body.length;
}

function unique(articles) {
  const seen = new Set();
  return articles.filter((article) => {
    if (seen.has(article.url)) return false;
    seen.add(article.url);
    return true;
  });
}

/** Every slot of `day` into one file, then the day's slot files go. */
async function buildDay(day) {
  const slots = slotsForDay(day);
  if (!slots.length) throw new Error(`Bad day ${day}`);
  const failed = [];
  const batches = await mapLimited(slots, DOWNLOADS_AT_ONCE, (slot) =>
    fetchSlot(slot).catch((err) => {
      failed.push(err.message);
      return null;
    }),
  );
  if (failed.length > slots.length / 4) throw new Error(`Too many slots failed for ${day}: ${failed.slice(0, 3).join("; ")}`);
  const articles = unique(batches.flatMap((batch) => batch || []));
  const bytes = await put(`${PREFIX}day=${day}/${DAY_FILE}`, articles);
  const stale = (await listDay(day)).filter((key) => !key.endsWith(`/${DAY_FILE}`));
  if (stale.length) {
    await s3.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: stale.map((Key) => ({ Key })), Quiet: true } }));
  }
  return {
    day,
    articles: articles.length,
    bytes,
    missing: batches.filter((batch) => batch == null).length - failed.length,
    failed: failed.length,
    removed: stale.length,
  };
}

/** The newest `lookback` slots not yet in the lake (or all of them with `force`), each as its own file. */
async function catchUp(lookback, force) {
  const res = await fetch(LAST_UPDATE_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  const newest = latestSlot(await res.text());
  if (!newest) throw new Error("GDELT's lastupdate.txt named no GKG file");
  const end = slotMs(newest);
  const wanted = Array.from({ length: lookback }, (_, i) => slotOf(end - i * SLOT_MS));
  const have = new Map();
  for (const day of new Set(wanted.map(dayOf))) have.set(day, new Set(await listDay(day)));
  const todo = wanted.filter((slot) => {
    const keys = have.get(dayOf(slot));
    if (keys.has(`${PREFIX}day=${dayOf(slot)}/${DAY_FILE}`)) return false;
    return force || !keys.has(`${PREFIX}day=${dayOf(slot)}/${slot}.json.gz`);
  });
  const written = await mapLimited(todo, DOWNLOADS_AT_ONCE, async (slot) => {
    const articles = await fetchSlot(slot);
    if (!articles) return { slot, articles: 0, missing: true };
    await put(`${PREFIX}day=${dayOf(slot)}/${slot}.json.gz`, articles);
    return { slot, articles: articles.length };
  });

  const yesterday = dayOf(Date.parse(`${dayOf(end)}T00:00:00Z`) - 1);
  let rollup = null;
  if (end - Date.parse(`${dayOf(end)}T00:00:00Z`) >= ROLLUP_AFTER_MS) {
    const keys = await listDay(yesterday);
    if (keys.length && !keys.some((key) => key.endsWith(`/${DAY_FILE}`))) rollup = await buildDay(yesterday);
  }
  return { newest, written, rollup };
}

export async function handler(event = {}) {
  if (!BUCKET) throw new Error("NEWS_BUCKET is not set");
  const lookback = Math.min(MAX_LOOKBACK, Math.max(1, Math.floor(Number(event.slots) || RECENT_SLOTS)));
  const result = event.action === "day" ? await buildDay(String(event.day || "")) : await catchUp(lookback, event.force === true);
  console.log(JSON.stringify(result));
  return result;
}
