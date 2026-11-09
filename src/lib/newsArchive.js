/**
 * The GDELT news archive in the data lake (see infra/gdelt-news): every English article GDELT has
 * crawled since the backfill began, refreshed every 15 minutes, searchable through Athena.
 * Server only.
 */
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getS3Client } from "@/lib/awsClients";
import { runAthenaSqlQuery } from "@/lib/dataLake/runAthenaSelect";
import { searchKey } from "@/lib/gdeltGkg";

export const ARCHIVE_TABLE = "gdelt_news_articles";
const ARCHIVE_PREFIX = "news/gdelt/articles/";
const MINUTE = 60_000;
const SLOT_MS = 15 * MINUTE;
export const ARCHIVE_MAX_ARTICLES = 300;
const VOLUME_BUCKETS = 96;
const FIRST_DAY_TTL_MS = 60 * MINUTE;
const QUERY_WAIT_MS = 25_000;

let firstDay = { value: null, expires: 0 };

export function archiveConfigured() {
  return Boolean(
    String(process.env.DATA_LAKE_S3_BUCKET || "").trim() &&
      String(process.env.DATA_LAKE_ATHENA_DATABASE || "").trim() &&
      String(process.env.DATA_LAKE_ATHENA_OUTPUT_S3_URI || "").trim(),
  );
}

function isoDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Midnight UTC of the archive's oldest day, or null while it's empty. S3 lists keys in order, so the first one is the oldest. */
export async function archiveStart() {
  if (firstDay.expires > Date.now()) return firstDay.value;
  const page = await getS3Client().send(
    new ListObjectsV2Command({ Bucket: process.env.DATA_LAKE_S3_BUCKET.trim(), Prefix: `${ARCHIVE_PREFIX}day=`, MaxKeys: 1 }),
  );
  const day = /day=(\d{4}-\d{2}-\d{2})\//.exec(page.Contents?.[0]?.Key || "")?.[1];
  firstDay = { value: day ? Date.parse(`${day}T00:00:00Z`) : null, expires: Date.now() + FIRST_DAY_TTL_MS };
  return firstDay.value;
}

/** Search keys for each term; they hold only a-z, 0-9 and spaces, so they're safe inside SQL quotes. */
export function archiveKeys(terms) {
  return terms.map(searchKey).filter((key) => /^ [a-z0-9 ]+ $/.test(key));
}

function whereSql(keys, start, end) {
  return [
    `day BETWEEN '${isoDay(start)}' AND '${isoDay(end)}'`,
    `t BETWEEN ${Math.floor(start)} AND ${Math.ceil(end)}`,
    ...keys.map((key) => `strpos(text, '${key}') > 0`),
  ].join(" AND ");
}

/**
 * Matching headlines, one row per distinct headline (syndicated copies fold into the earliest),
 * headlines naming more of the terms first, then newest.
 */
export function archiveArticlesSql(keys, start, end, limit = ARCHIVE_MAX_ARTICLES) {
  const inTitle = keys.map((key) => `IF(strpos(title_key, '${key}') > 0, 1, 0)`).join(" + ");
  return `SELECT title, url, source, t, copies FROM (
  SELECT min_by(title, t) AS title, min_by(url, t) AS url, min_by(source, t) AS source, min(t) AS t, count(*) AS copies,
    ' ' || regexp_replace(lower(min_by(title, t)), '[^a-z0-9]+', ' ') || ' ' AS title_key
  FROM ${ARCHIVE_TABLE}
  WHERE ${whereSql(keys, start, end)}
  GROUP BY lower(title)
)
ORDER BY ${inTitle} DESC, t DESC
LIMIT ${Math.max(1, Math.floor(limit))}`;
}

/** Bucket width for a window: about VOLUME_BUCKETS bars, in whole 15-minute slots. */
export function volumeBucket(start, end) {
  return Math.max(1, Math.round((end - start) / VOLUME_BUCKETS / SLOT_MS)) * SLOT_MS;
}

export function archiveVolumeSql(keys, start, end, bucket) {
  return `SELECT (t / ${bucket}) * ${bucket} AS bucket, count(*) AS n
FROM ${ARCHIVE_TABLE}
WHERE ${whereSql(keys, start, end)}
GROUP BY 1
ORDER BY 1
LIMIT ${Math.ceil((end - start) / bucket) + 2}`;
}

/** Every bucket from start to end, zero where nothing matched, so bar widths come out even. */
export function fillVolume(rows, start, end, bucket) {
  const counts = new Map(rows.map(([t, n]) => [Number(t), Number(n)]));
  const out = [];
  for (let t = Math.floor(start / bucket) * bucket; t <= end; t += bucket) out.push({ t, count: counts.get(t) || 0 });
  return out;
}

function hostOf(source, url) {
  if (source) return source.replace(/^www\./, "");
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function archiveArticleRows(rows) {
  return rows
    .map(([title, url, source, t, copies]) => ({
      title,
      url,
      source: hostOf(source, url),
      domain: hostOf(source, url),
      t: Number(t),
      precision: "seen",
      provider: "gdelt",
      copies: Number(copies) || 1,
    }))
    .filter((article) => article.title && article.url && Number.isFinite(article.t));
}

function clipNote(start, from) {
  return from > start ? { message: `The news archive starts on ${isoDay(from)}, so earlier news is missing.` } : {};
}

/** `{ status, articles | volume, message? }`, like the GDELT search answers. */
export async function fromArchive(source, terms, start, end) {
  const keys = archiveKeys(terms);
  if (!keys.length) return { status: "ok", ...(source === "volume" ? { volume: [] } : { articles: [] }) };
  const first = await archiveStart();
  if (first == null || end < first) {
    return { status: "out_of_range", message: first == null ? "The news archive is still filling." : `The news archive starts on ${isoDay(first)}.` };
  }
  const from = Math.max(start, first);
  const database = process.env.DATA_LAKE_ATHENA_DATABASE.trim();
  if (source === "volume") {
    const bucket = volumeBucket(from, end);
    const sql = archiveVolumeSql(keys, from, end, bucket);
    const { rows } = await runAthenaSqlQuery({ sql, database, maxWaitMs: QUERY_WAIT_MS, rowLimit: Math.ceil((end - from) / bucket) + 2 });
    return { status: "ok", volume: fillVolume(rows, from, end, bucket), ...clipNote(start, from) };
  }
  const { rows } = await runAthenaSqlQuery({
    sql: archiveArticlesSql(keys, from, end),
    database,
    maxWaitMs: QUERY_WAIT_MS,
    rowLimit: ARCHIVE_MAX_ARTICLES,
  });
  return { status: "ok", articles: archiveArticleRows(rows), ...clipNote(start, from) };
}
