/**
 * Builds whole days of the GDELT news archive on an EC2 instance, checks each one, and reports
 * progress to S3. Started and watched from backfill-ec2.mjs; gkg.mjs is src/lib/gdeltGkg.js copied
 * in when the bundle is built.
 *
 *   node runner.mjs run              hand days to worker processes, retry failures, publish status
 *   node runner.mjs day 2020-03-01   build and check one day in this process (a canary)
 *   node runner.mjs worker           internal: build the days the coordinator sends
 *
 * Writes s3://NEWS_BUCKET/<ARTICLES_PREFIX>day=YYYY-MM-DD/day.json.gz, the same file the Lambda
 * writes, plus, under CONTROL_PREFIX:
 *   status.json        heartbeat every 30 seconds: progress, ETA, failures, what's in flight
 *   days/<day>.json    what each day holds and the checks it passed; a day counts as done only with this
 *   log.txt            the end of this machine's log
 *   stop               create it to stop gracefully after the days in flight
 *
 * Env: NEWS_BUCKET, AWS_REGION, FROM, TO (inclusive days), WORKERS, DOWNLOADS (per worker),
 * ARTICLES_PREFIX, CONTROL_PREFIX, LOG_FILE, INSTANCE_ID.
 */
/* eslint-disable no-console */
import { fork } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { gkgUrl, parseGkgZip, slotsForDay } from "./gkg.mjs";

const BUCKET = process.env.NEWS_BUCKET;
const ARTICLES = (process.env.ARTICLES_PREFIX || "news/gdelt/articles/").replace(/\/?$/, "/");
const CONTROL = (process.env.CONTROL_PREFIX || "news/gdelt/backfill/").replace(/\/?$/, "/");
const WORKERS = Math.max(1, Number(process.env.WORKERS) || Math.min(4, os.cpus().length));
const DOWNLOADS = Math.max(1, Number(process.env.DOWNLOADS) || 6);
const INSTANCE_ID = process.env.INSTANCE_ID || os.hostname();
const DAY_MS = 24 * 60 * 60_000;
const DAY_FILE = "day.json.gz";
const FETCH_TIMEOUT_MS = 60_000;
const SLOT_TRIES = 4;
const DAY_TRIES = 3;
/** On the last try a day is kept, and flagged, with up to this many slots GDELT wouldn't serve. */
const LAST_TRY_FAILED_SLOTS = 5;
/** Days below this many articles are flagged; GDELT logs tens of thousands of English articles a day. */
const FEW_ARTICLES = 5_000;
/** GDELT has outages; a day missing more slots than this is flagged. */
const MANY_MISSING_SLOTS = 8;
/** Stop instead of hammering GDELT when this many tries in a row fail. */
const STOP_AFTER_FAILURES_IN_A_ROW = 15;
const HEARTBEAT_MS = 30_000;
const LOG_UPLOAD_EVERY = 4;
const LOG_TAIL_BYTES = 512 * 1024;

const s3 = new S3Client({});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isoDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function daysBetween(from, to) {
  const out = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += DAY_MS) out.push(isoDay(t));
  return out;
}

async function putJson(key, value) {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: JSON.stringify(value, null, 2), ContentType: "application/json" }));
}

async function listKeys(prefix) {
  const keys = [];
  let token;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token }));
    for (const item of page.Contents || []) keys.push(item.Key);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

/** Listed rather than fetched: the instance may only list under news/gdelt/, so a missing key would read as access denied. */
async function exists(key) {
  const page = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: key, MaxKeys: 1 }));
  return (page.Contents || []).some((item) => item.Key === key);
}

async function fetchSlot(slot) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const res = await fetch(gkgUrl(slot), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseGkgZip(Buffer.from(await res.arrayBuffer()));
    } catch (err) {
      if (attempt >= SLOT_TRIES) throw new Error(`${slot}: ${err.message}`);
      await sleep(2 ** attempt * 1_000);
    }
  }
}

async function mapLimited(items, limit, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await fn(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/** Reads the uploaded file back and checks it holds exactly what was written. */
async function checkUpload(key, bytes, articles) {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = Buffer.from(await res.Body.transformToByteArray());
  if (body.length !== bytes) throw new Error(`uploaded ${bytes} bytes but read back ${body.length}`);
  const lines = zlib.gunzipSync(body).toString("utf8").split("\n").filter(Boolean);
  if (lines.length !== articles) throw new Error(`wrote ${articles} articles but read back ${lines.length}`);
  for (const line of [lines[0], lines.at(-1)].filter(Boolean)) {
    const article = JSON.parse(line);
    const shaped =
      Number.isFinite(article.t) && typeof article.url === "string" && typeof article.title === "string" && article.title && typeof article.text === "string";
    if (!shaped) throw new Error("read-back article is missing t, url, title or text");
  }
}

/** Every slot of `day` into one gzipped JSON-lines file, streamed so a busy day stays small in memory. */
async function buildDay(day, attempt) {
  const started = Date.now();
  const slots = slotsForDay(day);
  if (slots.length !== 96) throw new Error(`Bad day ${day}`);
  const dayStart = Date.parse(`${day}T00:00:00Z`);
  const gzip = zlib.createGzip({ level: 9 });
  const chunks = [];
  gzip.on("data", (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    gzip.on("end", resolve);
    gzip.on("error", reject);
  });
  const seen = new Set();
  const failed = [];
  let articles = 0;
  let duplicates = 0;
  let missing = 0;
  let outsideDay = 0;
  let badUrls = 0;
  let firstT = Infinity;
  let lastT = -Infinity;

  await mapLimited(slots, DOWNLOADS, async (slot) => {
    let batch;
    try {
      batch = await fetchSlot(slot);
    } catch (err) {
      failed.push(err.message);
      return;
    }
    if (!batch) {
      missing += 1;
      return;
    }
    let lines = "";
    for (const article of batch) {
      if (seen.has(article.url)) {
        duplicates += 1;
        continue;
      }
      seen.add(article.url);
      if (article.t < dayStart || article.t >= dayStart + DAY_MS) outsideDay += 1;
      if (!/^https?:\/\//i.test(article.url)) badUrls += 1;
      firstT = Math.min(firstT, article.t);
      lastT = Math.max(lastT, article.t);
      lines += `${JSON.stringify(article)}\n`;
      articles += 1;
    }
    if (lines) gzip.write(lines);
  });
  gzip.end();
  await finished;

  const lastTry = attempt >= DAY_TRIES;
  if (failed.length > (lastTry ? LAST_TRY_FAILED_SLOTS : 0)) {
    throw new Error(`${failed.length} slots failed to download, e.g. ${failed.slice(0, 2).join("; ")}`);
  }
  if (!articles) throw new Error("no articles with headlines");

  const body = Buffer.concat(chunks);
  const key = `${ARTICLES}day=${day}/${DAY_FILE}`;
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: "application/gzip" }));
  await checkUpload(key, body.length, articles);

  const flags = [];
  if (articles < FEW_ARTICLES) flags.push(`only ${articles} articles`);
  if (missing > MANY_MISSING_SLOTS) flags.push(`${missing} of 96 slots missing at GDELT`);
  if (failed.length) flags.push(`${failed.length} slots wouldn't download`);
  if (outsideDay) flags.push(`${outsideDay} articles timed outside the day`);
  if (badUrls) flags.push(`${badUrls} articles without a web URL`);
  const manifest = {
    day,
    status: flags.length ? "flagged" : "ok",
    flags,
    articles,
    duplicates,
    missingSlots: missing,
    failedSlots: failed.length,
    bytes: body.length,
    firstT: Number.isFinite(firstT) ? firstT : null,
    lastT: Number.isFinite(lastT) ? lastT : null,
    seconds: Math.round((Date.now() - started) / 1000),
    attempt,
    builtAt: new Date().toISOString(),
    builtBy: INSTANCE_ID,
  };
  await putJson(`${CONTROL}days/${day}.json`, manifest);
  return manifest;
}

function worker() {
  process.on("message", async ({ day, attempt }) => {
    try {
      process.send({ day, ok: true, manifest: await buildDay(day, attempt) });
    } catch (err) {
      process.send({ day, ok: false, error: String(err?.message || err).slice(0, 500) });
    }
  });
}

function logTail() {
  const file = process.env.LOG_FILE;
  if (!file || !fs.existsSync(file)) return null;
  const size = fs.statSync(file).size;
  const fd = fs.openSync(file, "r");
  const length = Math.min(size, LOG_TAIL_BYTES);
  const buf = Buffer.alloc(length);
  fs.readSync(fd, buf, 0, length, size - length);
  fs.closeSync(fd);
  return buf;
}

async function uploadLog() {
  const tail = logTail();
  if (tail) await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: `${CONTROL}log.txt`, Body: tail, ContentType: "text/plain" }));
}

async function run() {
  if (!BUCKET) throw new Error("NEWS_BUCKET is not set");
  const from = process.env.FROM;
  const to = process.env.TO;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(to || "") || from > to) {
    throw new Error(`FROM and TO must be days with FROM first (got ${from} and ${to})`);
  }
  const startedAt = new Date().toISOString();
  const done = new Set((await listKeys(`${CONTROL}days/`)).map((key) => /days\/(\d{4}-\d{2}-\d{2})\.json$/.exec(key)?.[1]).filter(Boolean));
  const range = daysBetween(from, to);
  const queue = range.filter((day) => !done.has(day)).reverse().map((day) => ({ day, attempt: 1 }));
  const total = queue.length;
  const stats = { built: 0, flagged: [], failed: [], retries: 0, articles: 0, bytes: 0 };
  const inFlight = new Map();
  let failuresInARow = 0;
  let stopReason = "";
  let lastError = "";
  console.log(`${range.length} days from ${from} to ${to}; ${range.length - total} already built; ${total} to go with ${WORKERS} workers × ${DOWNLOADS} downloads`);

  const status = (state) => {
    const elapsedH = (Date.now() - Date.parse(startedAt)) / 3_600_000;
    const perHour = elapsedH > 0.02 ? stats.built / elapsedH : null;
    const left = total - stats.built - stats.failed.length;
    return {
      state,
      instanceId: INSTANCE_ID,
      from,
      to,
      workers: WORKERS,
      downloadsPerWorker: DOWNLOADS,
      daysInRange: range.length,
      alreadyBuilt: range.length - total,
      toBuild: total,
      built: stats.built,
      left,
      flagged: stats.flagged,
      failed: stats.failed,
      retries: stats.retries,
      inFlight: [...inFlight.values()].map(({ day, attempt, since }) => ({ day, attempt, seconds: Math.round((Date.now() - since) / 1000) })),
      articles: stats.articles,
      gigabytes: Math.round(stats.bytes / 1e7) / 100,
      daysPerHour: perHour ? Math.round(perHour) : null,
      etaAt: perHour && left > 0 ? new Date(Date.now() + (left / perHour) * 3_600_000).toISOString() : null,
      lastError,
      stopReason,
      freeMemoryMb: Math.round(os.freemem() / 1e6),
      startedAt,
      updatedAt: new Date().toISOString(),
    };
  };

  await putJson(`${CONTROL}status.json`, status("running"));
  let beats = 0;
  const heartbeat = setInterval(async () => {
    beats += 1;
    try {
      if (!stopReason && (await exists(`${CONTROL}stop`))) {
        stopReason = "asked to stop";
        console.log("Stop requested; finishing the days in flight.");
      }
      await putJson(`${CONTROL}status.json`, status(stopReason ? "stopping" : "running"));
      if (beats % LOG_UPLOAD_EVERY === 0) await uploadLog();
    } catch (err) {
      console.log(`heartbeat failed: ${err.message}`);
    }
  }, HEARTBEAT_MS);

  await new Promise((resolve) => {
    const workers = new Set();
    const settleIfDone = () => {
      if (!inFlight.size && (!queue.length || stopReason)) {
        for (const child of workers) child.kill();
        resolve();
      }
    };
    const feed = (child) => {
      if (stopReason || !queue.length) return settleIfDone();
      const job = queue.shift();
      inFlight.set(child.pid, { ...job, since: Date.now() });
      child.send(job);
    };
    const failedTry = (job, error) => {
      lastError = `${job.day} (try ${job.attempt}): ${error}`;
      console.log(`  ${lastError}`);
      failuresInARow += 1;
      if (failuresInARow >= STOP_AFTER_FAILURES_IN_A_ROW && !stopReason) {
        stopReason = `${failuresInARow} tries failed in a row; last: ${error}`;
        console.log(`Stopping: ${stopReason}`);
      }
      if (job.attempt < DAY_TRIES) {
        stats.retries += 1;
        queue.push({ day: job.day, attempt: job.attempt + 1 });
      } else {
        stats.failed.push({ day: job.day, error });
      }
    };
    const spawn = () => {
      const child = fork(fileURLToPath(import.meta.url), ["worker"], { env: process.env });
      workers.add(child);
      child.on("message", (msg) => {
        const job = inFlight.get(child.pid);
        inFlight.delete(child.pid);
        if (msg.ok) {
          failuresInARow = 0;
          stats.built += 1;
          stats.articles += msg.manifest.articles;
          stats.bytes += msg.manifest.bytes;
          if (msg.manifest.status === "flagged") stats.flagged.push({ day: msg.day, flags: msg.manifest.flags });
          const m = msg.manifest;
          console.log(`  ${stats.built}/${total} ${m.day}: ${m.articles.toLocaleString()} articles, ${(m.bytes / 1e6).toFixed(1)} MB, ${m.seconds}s${m.flags.length ? ` — ${m.flags.join("; ")}` : ""}`);
        } else if (job) {
          failedTry(job, msg.error);
        }
        feed(child);
      });
      child.on("exit", (code, signal) => {
        workers.delete(child);
        const job = inFlight.get(child.pid);
        inFlight.delete(child.pid);
        if (!job) return settleIfDone();
        failedTry(job, `worker died (${signal || `exit ${code}`})`);
        if (!stopReason && queue.length) feed(spawn());
        else settleIfDone();
      });
      return child;
    };
    if (!queue.length) return resolve();
    for (let i = 0; i < Math.min(WORKERS, queue.length); i += 1) feed(spawn());
  });

  clearInterval(heartbeat);
  const state = stopReason ? (stopReason === "asked to stop" ? "stopped" : "aborted") : stats.failed.length ? "done_with_failures" : "done";
  await putJson(`${CONTROL}status.json`, status(state));
  console.log(`Finished: ${state}. Built ${stats.built} days, ${stats.flagged.length} flagged, ${stats.failed.length} failed.`);
  await uploadLog().catch(() => {});
  return state === "done" || state === "done_with_failures" || state === "stopped" ? 0 : 2;
}

const [command, arg] = process.argv.slice(2);
if (command === "worker") {
  worker();
} else if (command === "day") {
  buildDay(arg, 1)
    .then((manifest) => console.log(JSON.stringify(manifest, null, 2)))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
} else if (command === "run") {
  run()
    .then((code) => process.exit(code))
    .catch(async (err) => {
      console.error(`Runner failed: ${err.stack || err.message}`);
      await putJson(`${CONTROL}status.json`, { state: "failed", error: String(err.message), instanceId: INSTANCE_ID, updatedAt: new Date().toISOString() }).catch(() => {});
      await uploadLog().catch(() => {});
      process.exit(1);
    });
} else {
  console.log("Usage: node runner.mjs run | day YYYY-MM-DD");
  process.exit(1);
}
