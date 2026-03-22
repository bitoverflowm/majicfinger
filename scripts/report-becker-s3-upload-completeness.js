#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Compare Becker source archive (data.tar.zst) to objects already in your S3 prefix.
 *
 * Streams: HTTP -> zstd -d -> tar-stream (records Parquet paths + tar sizes only; no full extract).
 * Lists S3 under `{prefix}/data/` for .parquet keys and sizes, then diffs.
 *
 * Usage:
 *   node scripts/report-becker-s3-upload-completeness.js s3://BUCKET/prefix
 *
 * AWS: loads repo-root .env / .env.local (see scripts/loadRepoEnvForAws.js), then requires AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY.
 *
 * Flags:
 *   --download-url=<URL>       default https://s3.jbecker.dev/data.tar.zst
 *   --region=<r>
 *   --zstd-bin=<path>          default: $ZSTD_BIN, else ./scripts/zstd-bin/zstd if present, else `zstd` on PATH
 *   --force-path-style
 *   --download-retries=<N>
 *   --retry-delay-ms=<N>
 *   --json                     print JSON report on stdout (human summary on stderr if not --quiet)
 *   --max-detail=<N>           cap missing / orphan / size-mismatch lines (0 = unlimited)
 *   --fail-on-gap              exit 1 if any missing file or byte size mismatch vs tar header
 *   --verbose
 *   --quiet                    suppress human summary (useful with --json only)
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const AWS = require("aws-sdk");
const tar = require("tar-stream");
const { loadRepoEnvForAws, resolveAwsCredentialsOrThrow } = require("./loadRepoEnvForAws");

process.on("unhandledRejection", (reason) => {
  console.error("UnhandledRejection:", reason);
});

function requirePositionalS3Uri() {
  const arg = process.argv[2];
  if (!arg || arg.startsWith("--")) {
    throw new Error("Usage: node scripts/report-becker-s3-upload-completeness.js s3://bucket/prefix");
  }
  const m = String(arg).match(/^s3:\/\/([^/]+)\/?(.*)$/i);
  if (!m) throw new Error(`Invalid s3 uri: ${arg}`);
  return { bucket: m[1], prefix: (m[2] || "").replace(/^\/+/, "") };
}

function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const eq = process.argv.find((a) => a.startsWith(prefix));
  if (eq) return eq.slice(prefix.length);
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function assertBinaryExists(bin, displayName) {
  const { spawnSync } = require("child_process");
  const res = spawnSync(bin, ["--version"], { stdio: "ignore" });
  if (res.error && res.error.code === "ENOENT") {
    throw new Error(
      `Missing ${displayName}: ${bin}\nInstall zstd on your PATH, or pass --zstd-bin=<path> (repo default: ./scripts/zstd-bin/zstd).`,
    );
  }
}

function resolveZstdBin() {
  const explicit = argValue("zstd-bin", undefined);
  if (explicit) return explicit;
  if (process.env.ZSTD_BIN) return process.env.ZSTD_BIN;
  const bundled = path.join(__dirname, "zstd-bin", "zstd");
  if (fs.existsSync(bundled)) return bundled;
  return "zstd";
}

function isAppleDoubleParquetKey(key) {
  return /\/\._[^/]+\.parquet$/i.test(key) || /^\.[^/]*\.parquet$/i.test(key.split("/").pop() || "");
}

function classifyParquetMember(memberPath) {
  const n = String(memberPath).replace(/^\.\//, "");
  if (!n.toLowerCase().endsWith(".parquet")) return null;
  if (n.startsWith("._") || n.includes("/._")) return null;

  let m = /^data\/polymarket\/trades\/(.+)$/i.exec(n);
  if (m) return { dataset: "polymarket", table: "trades", file: m[1] };
  m = /^data\/polymarket\/blocks\/(.+)$/i.exec(n);
  if (m) return { dataset: "polymarket", table: "blocks", file: m[1] };
  m = /^data\/polymarket\/markets\/(.+)$/i.exec(n);
  if (m) return { dataset: "polymarket", table: "markets", file: m[1] };
  m = /^data\/kalshi\/trades\/(.+)$/i.exec(n);
  if (m) return { dataset: "kalshi", table: "trades", file: m[1] };
  m = /^data\/kalshi\/markets\/(.+)$/i.exec(n);
  if (m) return { dataset: "kalshi", table: "markets", file: m[1] };
  return null;
}

function s3KeyForMember(memberPath, destPrefixNormalized) {
  const n = String(memberPath).replace(/^\.\//, "");
  return destPrefixNormalized ? `${destPrefixNormalized}/${n}` : n;
}

function memberPathFromS3Key(key, destPrefixNormalized) {
  if (!destPrefixNormalized) return key;
  const p = `${destPrefixNormalized}/`;
  return key.startsWith(p) ? key.slice(p.length) : null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isTransientDownloadError(e) {
  const code = e?.code;
  const msg = String(e?.message || e || "").toLowerCase();
  if (code === "ECONNRESET" || code === "EPIPE" || code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") return true;
  if (msg.includes("aborted") || msg.includes("socket hang up") || msg.includes("econnreset") || msg.includes("premature end"))
    return true;
  return false;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KiB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
}

/**
 * @returns {Promise<Map<string, { memberPath: string, tarSize: number }>>}
 */
async function inventoryFromSourceTar({ downloadUrl, destPrefixNormalized, zstdBin, logVerbose, heartbeatSeconds, heartbeatLog }) {
  const expected = new Map();
  const duplicates = [];

  const enableHeartbeat = heartbeatSeconds > 0;
  const heartbeatMs = heartbeatSeconds * 1000;
  const hb = typeof heartbeatLog === "function" ? heartbeatLog : console.log;

  await new Promise((resolve, reject) => {
    let extractFinished = false;
    let zstdExitCode = null;
    let downloadedBytes = 0;
    let hbTimer = null;

    function v(...args) {
      if (logVerbose) console.log(...args);
    }

    function finishOk() {
      if (hbTimer) clearInterval(hbTimer);
      resolve();
    }
    function finishErr(e) {
      if (hbTimer) clearInterval(hbTimer);
      reject(e);
    }

    const zstdProc = spawn(zstdBin, ["-d", "--stdout"], { stdio: ["pipe", "pipe", "inherit"] });
    zstdProc.on("error", (e) => finishErr(new Error(`Failed to start zstd: ${e?.message || e}`)));
    zstdProc.on("close", (code) => {
      zstdExitCode = code;
      if (extractFinished) {
        if (zstdExitCode !== 0) finishErr(new Error(`zstd exited ${zstdExitCode}`));
        else finishOk();
      }
    });

    const extract = tar.extract();
    extract.on("error", (e) => finishErr(e));
    extract.on("finish", () => {
      extractFinished = true;
      if (zstdExitCode !== null) {
        if (zstdExitCode !== 0) finishErr(new Error(`zstd exited ${zstdExitCode}`));
        else finishOk();
      }
    });

    extract.on("entry", (header, stream, next) => {
      try {
        if (header.type !== "file") {
          stream.resume();
          stream.on("end", next);
          return;
        }
        const memberPath = header.name;
        const classified = classifyParquetMember(memberPath);
        if (!classified) {
          stream.resume();
          stream.on("end", next);
          return;
        }

        const tarSize = Number(header.size) || 0;
        const s3Key = s3KeyForMember(memberPath, destPrefixNormalized);
        if (expected.has(s3Key)) {
          duplicates.push({ s3Key, previous: expected.get(s3Key).tarSize, next: tarSize });
        }
        expected.set(s3Key, { memberPath, tarSize });
        v(`[source] ${s3Key} tar ${tarSize} B`);

        stream.resume();
        stream.on("end", next);
      } catch (e) {
        next(e);
      }
    });

    if (enableHeartbeat) {
      hbTimer = setInterval(() => {
        hb(`[heartbeat] download ${(downloadedBytes / (1024 * 1024)).toFixed(2)} MB | source files: ${expected.size}`);
      }, heartbeatMs);
    }

    const dlReq = https.get(downloadUrl, (res) => {
      if (res.statusCode >= 400) {
        finishErr(new Error(`Download failed ${res.statusCode}: ${downloadUrl}`));
        res.resume();
        return;
      }
      v(`[pull] HTTP ${res.statusCode} ${downloadUrl}`);
      res.on("data", (chunk) => {
        downloadedBytes += chunk.length;
      });
      res.on("error", finishErr);
      res.pipe(zstdProc.stdin);
    });
    dlReq.on("error", finishErr);
    zstdProc.stdout.on("error", finishErr);
    zstdProc.stdout.pipe(extract);
  });

  if (duplicates.length) {
    console.warn(`[warn] ${duplicates.length} duplicate path(s) in archive (last tar entry wins).`);
    if (logVerbose) duplicates.forEach((d) => console.warn(`  ${d.s3Key}: ${d.previous} -> ${d.next}`));
  }

  return expected;
}

async function listS3ParquetSizes({ s3, bucket, destPrefixNormalized }) {
  const dataPrefix = destPrefixNormalized ? `${destPrefixNormalized}/data/` : `data/`;
  const map = new Map();
  let token;
  while (true) {
    const res = await s3
      .listObjectsV2({ Bucket: bucket, Prefix: dataPrefix, ContinuationToken: token, MaxKeys: 1000 })
      .promise();
    for (const it of res.Contents || []) {
      if (it.Key && it.Key.endsWith(".parquet") && !isAppleDoubleParquetKey(it.Key)) {
        map.set(it.Key, Number(it.Size) || 0);
      }
    }
    if (!res.IsTruncated || !res.NextContinuationToken) break;
    token = res.NextContinuationToken;
  }
  return map;
}

function bucketLabel(dataset, table) {
  return `${dataset}.${table}`;
}

async function main() {
  loadRepoEnvForAws();
  const { bucket: destBucket, prefix: destPrefix } = requirePositionalS3Uri();
  const destPrefixNormalized = destPrefix ? destPrefix.replace(/\/$/, "") : "";

  const regionArg = argValue("region", undefined);
  const downloadUrl = argValue("download-url", "https://s3.jbecker.dev/data.tar.zst");
  const forcePathStyle = hasFlag("force-path-style");
  const downloadRetries = Math.max(1, Number(argValue("download-retries", "1")));
  const retryDelayMs = Math.max(0, Number(argValue("retry-delay-ms", "5000")));
  const zstdBin = resolveZstdBin();
  const printJson = hasFlag("json");
  const failOnGap = hasFlag("fail-on-gap");
  const quiet = hasFlag("quiet");
  const logVerbose = !quiet && hasFlag("verbose");
  const maxDetail = Number(argValue("max-detail", "200"));
  const heartbeatSeconds = Math.max(0, Number(argValue("heartbeat-seconds", "60")));
  const out = !quiet ? (printJson ? (...a) => console.error(...a) : (...a) => console.log(...a)) : () => {};

  assertBinaryExists(zstdBin, "zstd");

  const credentials = resolveAwsCredentialsOrThrow();

  const envRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  const initialRegion = regionArg || envRegion || "us-east-1";
  const s3Initial = new AWS.S3({
    region: initialRegion,
    credentials,
    s3ForcePathStyle: forcePathStyle || undefined,
  });

  let region = regionArg || envRegion;
  if (!region) {
    const loc = await s3Initial.getBucketLocation({ Bucket: destBucket }).promise();
    region = loc.LocationConstraint || "us-east-1";
    if (region === "EU") region = "eu-west-1";
  }

  const s3 = new AWS.S3({ region, credentials, s3ForcePathStyle: forcePathStyle || undefined });

  out("[1/2] Streaming source archive (inventory only)…");
  out(`- download-url: ${downloadUrl}`);
  out(`- s3://${destBucket}/${destPrefixNormalized || "(no prefix)"}`);

  let expected;
  for (let attempt = 1; attempt <= downloadRetries; attempt++) {
    if (attempt > 1) {
      out(`\n[retry] attempt ${attempt}/${downloadRetries}`);
      if (retryDelayMs) await sleep(retryDelayMs);
    }
    try {
      expected = await inventoryFromSourceTar({
        downloadUrl,
        destPrefixNormalized,
        zstdBin,
        logVerbose,
        heartbeatSeconds: !quiet ? heartbeatSeconds : 0,
        heartbeatLog: !quiet ? (printJson ? (...a) => console.error(...a) : (...a) => console.log(...a)) : () => {},
      });
      break;
    } catch (e) {
      if (!isTransientDownloadError(e) || attempt >= downloadRetries) throw e;
      console.warn(`[retry] transient: ${e?.message || e}`);
    }
  }

  out(`\n[2/2] Listing S3 objects under data/ …`);

  const s3Map = await listS3ParquetSizes({ s3, bucket: destBucket, destPrefixNormalized });

  const missing = [];
  const sizeMismatches = [];
  let expectedBytes = 0;
  let presentFiles = 0;
  let presentS3Bytes = 0;

  const byLabel = {};

  for (const [, meta] of expected) {
    const c = classifyParquetMember(meta.memberPath);
    const label = bucketLabel(c.dataset, c.table);
    if (!byLabel[label]) byLabel[label] = { expected: 0, present: 0, missing: 0, expectedBytes: 0, presentBytes: 0 };
  }

  for (const [s3Key, { memberPath, tarSize }] of expected) {
    expectedBytes += tarSize;
    const c = classifyParquetMember(memberPath);
    const label = bucketLabel(c.dataset, c.table);
    byLabel[label].expected += 1;
    byLabel[label].expectedBytes += tarSize;

    const s3Size = s3Map.get(s3Key);
    if (s3Size === undefined) {
      missing.push({ key: s3Key, memberPath, expectedBytes: tarSize });
      byLabel[label].missing += 1;
    } else {
      presentFiles += 1;
      presentS3Bytes += s3Size;
      byLabel[label].present += 1;
      byLabel[label].presentBytes += s3Size;
      if (s3Size !== tarSize) {
        sizeMismatches.push({ key: s3Key, memberPath, expectedBytes: tarSize, s3Bytes: s3Size });
      }
    }
  }

  const expectedKeys = new Set(expected.keys());
  const orphans = [];
  let orphanBytes = 0;
  for (const [key, sz] of s3Map) {
    if (expectedKeys.has(key)) continue;
    const member = memberPathFromS3Key(key, destPrefixNormalized);
    if (!member || !classifyParquetMember(member)) continue;
    orphans.push({ key, memberPath: member, s3Bytes: sz });
    orphanBytes += sz;
  }

  const missingBytes = missing.reduce((a, x) => a + x.expectedBytes, 0);
  const expectedFiles = expected.size;
  const complete = missing.length === 0 && sizeMismatches.length === 0;

  const payload = {
    sourceUrl: downloadUrl,
    bucket: destBucket,
    destPrefix: destPrefixNormalized || null,
    region,
    generatedAt: new Date().toISOString(),
    complete,
    summary: {
      expectedFiles,
      expectedBytes,
      presentFiles,
      presentS3Bytes,
      missingFiles: missing.length,
      missingBytes,
      sizeMismatchFiles: sizeMismatches.length,
      orphanFiles: orphans.length,
      orphanBytes,
    },
    byTable: byLabel,
    missing,
    sizeMismatches,
    orphans,
  };

  if (!quiet) {
    out("\n=== Becker S3 upload completeness ===\n");
    out(`Source:     ${downloadUrl}`);
    out(`Destination: s3://${destBucket}/${destPrefixNormalized ? `${destPrefixNormalized}/` : ""}data/...`);
    out(`Expected:   ${expectedFiles} files, ${formatBytes(expectedBytes)} (sizes from tar headers)`);
    out(`Present:    ${presentFiles} files, ${formatBytes(presentS3Bytes)} (S3 ListObjects sizes)`);
    out(`Missing:    ${missing.length} files, ${formatBytes(missingBytes)}`);
    out(`Size ≠ tar: ${sizeMismatches.length} file(s) (S3 size differs from tar header)`);
    out(`Orphans:    ${orphans.length} file(s) in S3 under data/ not in current archive, ${formatBytes(orphanBytes)}`);
    out(complete ? "\nStatus: COMPLETE (all expected keys present, sizes match tar).\n" : "\nStatus: INCOMPLETE.\n");

    out("Per table (expected / present / missing):");
    const labels = Object.keys(byLabel).sort();
    for (const lb of labels) {
      const b = byLabel[lb];
      out(`  ${lb}: ${b.expected} / ${b.present} / ${b.missing}  (${formatBytes(b.expectedBytes)} expected, ${formatBytes(b.presentBytes)} in S3)`);
    }

    const cap = maxDetail > 0 ? maxDetail : Number.POSITIVE_INFINITY;
    if (missing.length) {
      out(`\nMissing (up to ${Number.isFinite(cap) ? cap : "∞"}):`);
      missing.slice(0, cap).forEach((m) => out(`  - ${m.key}  (${formatBytes(m.expectedBytes)})`));
      if (missing.length > cap) out(`  … ${missing.length - cap} more`);
    }
    if (sizeMismatches.length) {
      out(`\nSize mismatches (up to ${Number.isFinite(cap) ? cap : "∞"}):`);
      sizeMismatches.slice(0, cap).forEach((m) =>
        out(`  - ${m.key}  tar ${formatBytes(m.expectedBytes)} vs S3 ${formatBytes(m.s3Bytes)}`),
      );
      if (sizeMismatches.length > cap) out(`  … ${sizeMismatches.length - cap} more`);
    }
    if (orphans.length) {
      out(`\nOrphans in S3 (up to ${Number.isFinite(cap) ? cap : "∞"}):`);
      orphans.slice(0, cap).forEach((o) => out(`  - ${o.key}  (${formatBytes(o.s3Bytes)})`));
      if (orphans.length > cap) out(`  … ${orphans.length - cap} more`);
    }
  }

  if (printJson) {
    console.log(JSON.stringify(payload, null, 2));
  }

  if (failOnGap && !complete) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
