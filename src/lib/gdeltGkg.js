/**
 * GDELT Global Knowledge Graph (GKG 2.1) files: one zipped, tab-separated file every 15 minutes
 * listing the English-language articles GDELT crawled in that slot.
 *
 * Shared by the ingestion Lambda (copied into its bundle as gkg.mjs) and the news API, so it
 * depends on nothing but Node's zlib.
 */
import zlib from "node:zlib";

const SLOT_MS = 15 * 60_000;
const DAY_MS = 24 * 60 * 60_000;
const MAX_NAMES = 40;
const MAX_PEOPLE = 12;
const BASE = "http://data.gdeltproject.org/gdeltv2";

/** GKG 2.1 column positions. */
const COL = { date: 1, kind: 2, source: 3, url: 4, persons: 11, orgs: 13, tone: 15, image: 18, names: 23, extras: 26 };
/** SourceCollectionIdentifier 1 means the document is a web page with a URL. */
const WEB = "1";

function pad(value) {
  return String(value).padStart(2, "0");
}

/** The 15-minute slot holding `ms`, as GDELT names it: YYYYMMDDHHMMSS in UTC. */
export function slotOf(ms) {
  const d = new Date(Math.floor(ms / SLOT_MS) * SLOT_MS);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;
}

export function slotMs(slot) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(String(slot));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : NaN;
}

/** "2026-11-08" for a slot or epoch ms. */
export function dayOf(slotOrMs) {
  const ms = typeof slotOrMs === "number" ? slotOrMs : slotMs(slotOrMs);
  return new Date(ms).toISOString().slice(0, 10);
}

/** The 96 slots of a UTC day, oldest first. */
export function slotsForDay(day) {
  const start = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(start)) return [];
  return Array.from({ length: DAY_MS / SLOT_MS }, (_, i) => slotOf(start + i * SLOT_MS));
}

export function gkgUrl(slot) {
  return `${BASE}/${slot}.gkg.csv.zip`;
}

export const LAST_UPDATE_URL = `${BASE}/lastupdate.txt`;

/** The newest GKG slot named in GDELT's lastupdate.txt. */
export function latestSlot(text) {
  return /\/(\d{14})\.gkg\.csv\.zip/.exec(String(text || ""))?.[1] || "";
}

/** The single file inside a GDELT zip, as a Buffer. Reads sizes from the central directory. */
export function unzipSingle(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a zip file");
  const central = buf.readUInt32LE(eocd + 16);
  if (buf.readUInt32LE(central) !== 0x02014b50) throw new Error("Zip central directory missing");
  const method = buf.readUInt16LE(central + 10);
  const size = buf.readUInt32LE(central + 20);
  const local = buf.readUInt32LE(central + 42);
  if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error("Zip local header missing");
  const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
  const data = buf.subarray(start, start + size);
  if (method === 0) return Buffer.from(data);
  if (method === 8) return zlib.inflateRawSync(data);
  throw new Error(`Unsupported zip compression ${method}`);
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decode(text) {
  return String(text || "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
      if (code[0] === "#") {
        const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : whole;
      }
      return ENTITIES[code.toLowerCase()] ?? whole;
    })
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lower-case words separated by single spaces, accents folded and punctuation dropped, padded
 * with a space each side. A term matches when its own key appears inside, so
 * " pete hegseth " finds "Pete Hegseth's" but not "Hegsethville".
 */
export function searchKey(text) {
  const words = String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return words ? ` ${words} ` : "";
}

function list(field, cap) {
  const out = [];
  const seen = new Set();
  for (const part of String(field || "").split(";")) {
    const name = part.split(",")[0].trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= cap) break;
  }
  return out;
}

/**
 * One article per web row: `{ t, url, source, title, persons, orgs, tone, image, text }`, where
 * `t` is the slot GDELT saw it in and `text` holds the search keys of the headline and every
 * person, organisation and proper name the article mentions, joined by "|" so a phrase can't run
 * from one name into the next. Rows without a headline are skipped.
 */
export function parseGkg(tsv) {
  const out = [];
  for (const line of String(tsv).split("\n")) {
    if (!line) continue;
    const c = line.split("\t");
    if (c.length <= COL.extras || c[COL.kind] !== WEB) continue;
    const title = decode(/<PAGE_TITLE>([\s\S]*?)<\/PAGE_TITLE>/.exec(c[COL.extras])?.[1]);
    const t = slotMs(c[COL.date]);
    if (!title || !c[COL.url] || !Number.isFinite(t)) continue;
    const persons = list(c[COL.persons], MAX_PEOPLE);
    const orgs = list(c[COL.orgs], MAX_PEOPLE);
    const names = list(c[COL.names], MAX_NAMES);
    const tone = Number(String(c[COL.tone] || "").split(",")[0]);
    out.push({
      t,
      url: c[COL.url],
      source: c[COL.source] || "",
      title: title.slice(0, 400),
      persons,
      orgs,
      tone: Number.isFinite(tone) ? Math.round(tone * 100) / 100 : null,
      image: c[COL.image] || "",
      text: [title, ...persons, ...orgs, ...names].map(searchKey).filter(Boolean).join("|"),
    });
  }
  // V8 substrings point into the whole file, so a day of kept articles would hold every file in memory.
  return JSON.parse(JSON.stringify(out));
}

export function parseGkgZip(buf) {
  return parseGkg(unzipSingle(buf).toString("utf8"));
}

/** Articles as gzipped JSON lines, one object per line, ready for Athena's JSON reader. */
export function encodeArticles(articles) {
  return zlib.gzipSync(Buffer.from(articles.map((article) => JSON.stringify(article)).join("\n") + "\n"), { level: 9 });
}
