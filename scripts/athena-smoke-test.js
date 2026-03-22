/**
 * Verifies Athena connectivity: StartQueryExecution → poll → GetQueryResults.
 * Uses aws-sdk v2 (same as src/pages/api/data-lake/parquet.js).
 *
 * Env:
 *   AWS_REGION or AWS_DEFAULT_REGION
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (or default provider chain if unset)
 *   DATA_LAKE_ATHENA_OUTPUT_S3_URI — s3://bucket/prefix/ for query results (required)
 *   DATA_LAKE_ATHENA_WORKGROUP — default primary
 *   DATA_LAKE_ATHENA_CATALOG — default AwsDataCatalog
 *   DATA_LAKE_ATHENA_DATABASE — optional; omit for SELECT 1
 *   DATA_LAKE_ATHENA_SMOKE_SQL — optional; default SELECT 1
 *
 * Loads `.env` then `.env.local` (Next.js-style: local overrides). Already-set
 * process.env keys are left unchanged so shell exports win.
 */
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");

/** @returns {Record<string, string>} */
function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function loadProjectEnv() {
  const root = process.cwd();
  const merged = {
    ...parseEnvFile(path.join(root, ".env")),
    ...parseEnvFile(path.join(root, ".env.local")),
  };
  for (const [key, val] of Object.entries(merged)) {
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadProjectEnv();

const AWS = require("aws-sdk");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getRegion() {
  return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
}

function normalizeOutputUri(uri) {
  if (!uri || typeof uri !== "string") return "";
  const t = uri.trim();
  if (!t.startsWith("s3://")) return "";
  return t.endsWith("/") ? t : `${t}/`;
}

async function main() {
  const output = normalizeOutputUri(process.env.DATA_LAKE_ATHENA_OUTPUT_S3_URI || "");
  if (!output) {
    console.error(
      "Missing or invalid DATA_LAKE_ATHENA_OUTPUT_S3_URI (e.g. s3://my-bucket/athena-results/). See docs/SERVER_LAKE_ATHENA.md"
    );
    process.exit(1);
  }

  const workGroup = process.env.DATA_LAKE_ATHENA_WORKGROUP || "primary";
  const catalog = process.env.DATA_LAKE_ATHENA_CATALOG || "AwsDataCatalog";
  const database = (process.env.DATA_LAKE_ATHENA_DATABASE || "").trim();
  const sql = (process.env.DATA_LAKE_ATHENA_SMOKE_SQL || "SELECT 1").trim();

  const athena = new AWS.Athena({ region: getRegion() });

  const startParams = {
    QueryString: sql,
    WorkGroup: workGroup,
    ResultConfiguration: { OutputLocation: output },
    QueryExecutionContext: database ? { Catalog: catalog, Database: database } : { Catalog: catalog },
  };

  console.log("Athena smoke test");
  console.log("  region:", getRegion());
  console.log("  workgroup:", workGroup);
  console.log("  catalog:", catalog);
  console.log("  database:", database || "(none — ok for SELECT 1)");
  console.log("  output:", output);
  console.log("  sql:", sql);

  const { QueryExecutionId } = await athena.startQueryExecution(startParams).promise();
  console.log("  queryExecutionId:", QueryExecutionId);

  const deadline = Date.now() + 120_000;
  let status = "RUNNING";
  let reason = "";

  while (Date.now() < deadline) {
    const { QueryExecution } = await athena.getQueryExecution({ QueryExecutionId }).promise();
    status = QueryExecution.Status.State;
    reason = QueryExecution.Status.StateChangeReason || "";
    if (status === "SUCCEEDED") break;
    if (status === "FAILED" || status === "CANCELLED") {
      console.error("Query ended with status:", status);
      if (reason) console.error("Reason:", reason);
      process.exit(1);
    }
    await sleep(1000);
  }

  if (status !== "SUCCEEDED") {
    console.error("Timed out waiting for Athena (120s). Last status:", status);
    process.exit(1);
  }

  const results = await athena.getQueryResults({ QueryExecutionId, MaxResults: 10 }).promise();
  const rows = results.ResultSet?.Rows || [];
  console.log("OK — first result page row count (includes header row):", rows.length);
  if (rows.length > 0) {
    console.log("Sample (raw cells):", JSON.stringify(rows.map((r) => r.Data?.map((d) => d.VarCharValue) || [])));
  }
  const meta = results.ResultSet?.ResultSetMetadata;
  if (meta?.ColumnInfo?.length) {
    console.log("Columns:", meta.ColumnInfo.map((c) => c.Name).join(", "));
  }
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
