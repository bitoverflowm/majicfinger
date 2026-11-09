import assert from "node:assert/strict";
import zlib from "node:zlib";
import { dayOf, encodeArticles, latestSlot, parseGkg, searchKey, slotMs, slotOf, slotsForDay, unzipSingle } from "./gdeltGkg.js";
import { archiveArticleRows, archiveArticlesSql, archiveKeys, archiveVolumeSql, fillVolume, volumeBucket } from "./newsArchive.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

const MINUTE = 60_000;

/** A GKG row with the columns the parser reads filled in. */
function gkgRow({ date = "20261108193000", kind = "1", source = "example.com", url = "https://example.com/a", persons = "", orgs = "", tone = "-2.5,1,3", names = "", title = "" }) {
  const c = new Array(27).fill("");
  Object.assign(c, { 1: date, 2: kind, 3: source, 4: url, 11: persons, 13: orgs, 15: tone, 23: names });
  c[26] = title ? `<PAGE_TITLE>${title}</PAGE_TITLE>` : "";
  return c.join("\t");
}

test("slots are GDELT's 15-minute file names in UTC", () => {
  const t = Date.UTC(2026, 10, 8, 19, 37, 12);
  assert.equal(slotOf(t), "20261108193000");
  assert.equal(slotMs("20261108193000"), Date.UTC(2026, 10, 8, 19, 30));
  assert.equal(dayOf("20261108234500"), "2026-11-08");
  const day = slotsForDay("2026-11-08");
  assert.equal(day.length, 96);
  assert.equal(day[0], "20261108000000");
  assert.equal(day.at(-1), "20261108234500");
  assert.deepEqual(slotsForDay("nope"), []);
  assert.equal(
    latestSlot("1 a http://data.gdeltproject.org/gdeltv2/20261108213000.export.CSV.zip\n2 b http://data.gdeltproject.org/gdeltv2/20261108213000.gkg.csv.zip"),
    "20261108213000",
  );
});

test("search keys fold case, accents, possessives and punctuation", () => {
  assert.equal(searchKey("Pete Hegseth's Pentagon"), " pete hegseth pentagon ");
  assert.equal(searchKey("Ángel Di María — PSG!"), " angel di maria psg ");
  assert.equal(searchKey("  "), "");
  assert.ok(searchKey("Hegsethville").indexOf(searchKey("Hegseth")) < 0);
});

test("GKG rows become slim articles; rows without a headline or URL are skipped", () => {
  const tsv = [
    gkgRow({
      title: "Hegseth &amp; the Pentagon",
      persons: "pete hegseth,12;donald trump,40;pete hegseth,90",
      orgs: "pentagon,5",
      names: "Pete Hegseth,12;Secretary of Defense,30",
    }),
    gkgRow({ title: "", url: "https://example.com/b" }),
    gkgRow({ title: "Not a web page", kind: "2" }),
    gkgRow({ title: "Bad date", date: "soon" }),
  ].join("\n");
  const [article, ...rest] = parseGkg(tsv);
  assert.equal(rest.length, 0);
  assert.equal(article.title, "Hegseth & the Pentagon");
  assert.equal(article.t, Date.UTC(2026, 10, 8, 19, 30));
  assert.deepEqual(article.persons, ["pete hegseth", "donald trump"]);
  assert.deepEqual(article.orgs, ["pentagon"]);
  assert.equal(article.tone, -2.5);
  assert.ok(article.text.includes(" secretary of defense "));
  assert.ok(article.text.includes(" pete hegseth "));

  const [boston] = parseGkg(gkgRow({ title: "Student missing", names: "Boston,1;United States,9" }));
  assert.ok(boston.text.includes(" boston "));
  assert.ok(!boston.text.includes(" boston united "));
});

test("articles round-trip through gzipped JSON lines and single-file zips", () => {
  const articles = [{ t: 1, title: "a" }, { t: 2, title: "b" }];
  const lines = zlib.gunzipSync(encodeArticles(articles)).toString("utf8").trim().split("\n");
  assert.deepEqual(lines.map((line) => JSON.parse(line)), articles);

  const data = Buffer.from("hello\tworld\n");
  const packed = zlib.deflateRawSync(data);
  const name = Buffer.from("x.csv");
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(8, 8);
  local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(packed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  const centralAt = local.length + name.length + packed.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt32LE(centralAt, 16);
  assert.equal(unzipSingle(Buffer.concat([local, name, packed, central, name, end])).toString(), data.toString());
});

test("archive search terms can't break out of the SQL", () => {
  assert.deepEqual(archiveKeys(["O'Neil", "Bitcoin", "'; DROP TABLE x --", "!!!"]), [" o neil ", " bitcoin ", " drop table x "]);
  const sql = archiveArticlesSql([" pete hegseth "], Date.UTC(2026, 10, 7, 22), Date.UTC(2026, 10, 8, 2), 50);
  assert.match(sql, /day BETWEEN '2026-11-07' AND '2026-11-08'/);
  assert.match(sql, /strpos\(text, ' pete hegseth '\) > 0/);
  assert.match(sql, /LIMIT 50$/);
  assert.ok(!sql.includes(";"));
});

test("archive volume fills empty buckets so bars stay even", () => {
  const start = Date.UTC(2026, 10, 8, 0);
  const end = start + 24 * 60 * MINUTE;
  const bucket = volumeBucket(start, end);
  assert.equal(bucket, 15 * MINUTE);
  assert.equal(volumeBucket(start, start + 90 * 24 * 60 * MINUTE) % (15 * MINUTE), 0);
  assert.match(archiveVolumeSql([" fed "], start, end, bucket), /GROUP BY 1/);
  const volume = fillVolume([[String(start + bucket), "4"]], start, start + 3 * bucket, bucket);
  assert.deepEqual(
    volume.map((point) => point.count),
    [0, 4, 0, 0],
  );
});

test("archive rows become the shared article shape", () => {
  const [article] = archiveArticleRows([
    ["Fed cuts rates", "https://www.reuters.com/x", "", "1794163500000", "7"],
    ["", "https://example.com", "example.com", "1", "1"],
  ]);
  assert.deepEqual(article, {
    title: "Fed cuts rates",
    url: "https://www.reuters.com/x",
    source: "reuters.com",
    domain: "reuters.com",
    t: 1794163500000,
    precision: "seen",
    provider: "gdelt",
    copies: 7,
  });
});
