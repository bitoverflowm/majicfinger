# Server-side lake queries: Athena (primary path)

This document records the **primary** way the app should run **large, scan-heavy SQL** over Parquet in S3: **Amazon Athena** with the **AWS Glue Data Catalog** defining logical tables. It also states how **Next.js** fits in and how this relates to the existing **browser DuckDB** path.

---

## Decision

| Role | Choice |
|------|--------|
| **Query engine (server)** | **Amazon Athena** — SQL over S3; pay per data scanned; no long-lived query VM to operate for this path. |
| **Table metadata** | **AWS Glue Data Catalog** — external tables (locations, schema, optional Hive partitions) so Athena can plan reads across **many** Parquet objects under one prefix. |
| **Not the same layer** | **Glue** is not a replacement “backend DuckDB.” Glue holds **catalog** metadata; **Athena** executes queries. **DuckDB** in the browser remains a separate, small-file exploration path (see below). |

Optional **hosted DuckDB** (or another engine) on a worker would only be reconsidered if Athena cost, latency, or SQL limits become blocking — that is out of scope for the primary architecture.

---

## Relationship to current code

- **Browser / WASM:** [`src/lib/duckdb/duckdbWasmClient.js`](../src/lib/duckdb/duckdbWasmClient.js) and related UI load **bounded** Parquet (same-origin proxy or public URL). Suited to **samples**, not whole-lake scans.
- **Same-origin byte proxy:** [`src/pages/api/data-lake/parquet.js`](../src/pages/api/data-lake/parquet.js) — server **`s3:GetObject`**; still **full object** to the client, capped by product limits. **Not** a substitute for lake-scale aggregates.
- **Server lake query API:**
  - **Sync (one request):** [`athena-query.js`](../src/pages/api/data-lake/athena-query.js) — **POST**; waits for Athena (bounded by `DATA_LAKE_ATHENA_MAX_WAIT_MS`).
  - **Async (recommended for serverless):** [`athena-query/start.js`](../src/pages/api/data-lake/athena-query/start.js) — **POST** → `202` + `queryExecutionId` + `rowLimit`; then poll [`athena-query/status.js`](../src/pages/api/data-lake/athena-query/status.js) — **GET** `?queryExecutionId=…&limit=…` until `state === "SUCCEEDED"` (response includes `columns` / `rows`). Same body validation as sync; no raw SQL. Maps to Glue in [`athenaTableMap.js`](../src/lib/dataLake/athenaTableMap.js). **`DATA_LAKE_ATHENA_DATABASE`** + **`DATA_LAKE_ATHENA_OUTPUT_S3_URI`** required. Auth not wired yet.
- **Frontend (Polymarket / Kalshi historical panels):** [`DataLakeParquetPanel.js`](../src/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/DataLakeParquetPanel.js) calls that API with **`SELECT *`–style pulls** (bounded limit), then [`ingestAthenaResultAsView`](../src/lib/duckdb/duckdbWasmClient.js) loads rows into **DuckDB-WASM** as a view so the grid gets typed rows and **`runBeckerSelectSql`** / joins still work.

---

## S3 layout and Glue tables

Your objects are grouped like:

- `…/polymarket/` — `markets`, `blocks`, `trades` (many Parquet files each)
- `…/kalshi/` — same shape

Athena does **not** infer “these files are one table” by itself. You **register** one **external table** per logical dataset (for example `polymarket_trades`) with:

- `LOCATION` = the S3 prefix for that folder (all compatible Parquet files under it are part of the table)
- `STORED AS PARQUET` (or equivalent)
- Schema matching the files (or evolve with care)

If you add **Hive-style** partition keys in the path (e.g. `…/trades/dt=2025-03-01/…`) and declare those partitions in Glue, Athena can **prune** prefixes and reduce scan cost. A **flat** directory of many files still works as one table; full-table queries will read more objects.

Align Glue `LOCATION` values with the same bucket/prefixes you already use via `DATA_LAKE_S3_BUCKET` and `DATA_LAKE_S3_KEY_PREFIX` / `DATA_LAKE_KALSHI_S3_KEY_PREFIX` in [`parquet.js`](../src/pages/api/data-lake/parquet.js).

---

## Next.js deployment boundaries

**Next.js (API routes) should:**

- Authenticate and authorize the caller.
- Validate inputs (allowed databases/tables, mandatory filters where policy requires them).
- Call Athena with **server-only** credentials (IAM role or keys — never exposed to the client).
- Enforce **timeouts** and **maximum rows** returned; map errors to stable client-facing types.

**Athena / AWS:**

- Performs the scan over S3, writes **query results** to the configured **S3 output prefix** (required for every query).
- Uses Glue (typically) to resolve table → S3 paths and partitions.

**Important for serverless hosting (e.g. Vercel):** HTTP **request timeouts** are short. Holding one request open until a large Athena job finishes is fragile. Prefer an **async** pattern: start query → return **execution id** → client polls a status/results endpoint (or use a queue/worker later). Synchronous “run to completion” may be acceptable only for **smoke tests** or **very fast** queries.

**IAM (minimal direction):** the principal running Next.js needs permissions such as `athena:StartQueryExecution`, `athena:GetQueryExecution`, `athena:GetQueryResults`, `athena:StopQueryExecution` (if you cancel), plus `s3:GetObject` / `s3:ListBucket` on **data** prefixes and **`s3:PutObject` / `s3:GetObject` / `s3:ListBucket`** on the **Athena results** prefix. Glue read access for the relevant database/tables (`glue:GetDatabase`, `glue:GetTable`, etc.) as required by your setup.

---

## Environment variables (reference)

See [`.env.local.example`](../.env.local.example) for names. Typical values:

| Variable | Purpose |
|----------|---------|
| `DATA_LAKE_ATHENA_WORKGROUP` | Athena workgroup (often `primary`). |
| `DATA_LAKE_ATHENA_CATALOG` | Data catalog name (often `AwsDataCatalog`). |
| `DATA_LAKE_ATHENA_DATABASE` | Default Glue database for queries. |
| `DATA_LAKE_ATHENA_OUTPUT_S3_URI` | **`s3://bucket/prefix/`** for Athena query results (must exist; bucket policy + IAM must allow Athena and your app as needed). |

Use the same `AWS_REGION` / credentials pattern as the existing S3 proxy where applicable.

---

## How to verify everything works

### 1. AWS prerequisites

- An **S3 bucket** (or prefix) dedicated to **Athena query results** (not necessarily the data bucket).
- **Glue** database + **external tables** pointing at your Parquet prefixes (or use the Athena console to run `CREATE EXTERNAL TABLE` once).
- IAM allowing the identity you use locally (or in production) to run Athena and read/write the relevant S3 locations.

### 2. Smoke test from this repo (no Glue table required)

After setting `DATA_LAKE_ATHENA_OUTPUT_S3_URI` and AWS credentials in **`.env` and/or `.env.local`** (the smoke script loads both, with `.env.local` winning on duplicate keys; shell exports still win), run:

```bash
npm run athena:smoke
```

This runs a trivial `SELECT 1` through Athena and prints status and rows. It confirms **credentials, region, workgroup, and results location** are wired correctly.

### 3. End-to-end check with real data

In the **Athena console** (same account/region):

1. Pick your Glue **database** and a table backed by `…/polymarket/trades` (or equivalent).
2. Run a **cheap** query: e.g. `SELECT COUNT(*) FROM your_table LIMIT 1` or a query with a **partition filter** if you use partitions.
3. Confirm **Data scanned** and results look sane.

Once an API route is implemented, repeat the same SQL through your app and compare row counts or a small sample to the console.

**Example (local dev, same-origin):**

```bash
curl -s -X POST http://localhost:3000/api/data-lake/athena-query \
  -H "Content-Type: application/json" \
  -d '{"lake":"polymarket","table":"markets","limit":5,"columns":["id","question"]}'
```

**Async (start + poll):**

```bash
START=$(curl -s -X POST http://localhost:3000/api/data-lake/athena-query/start \
  -H "Content-Type: application/json" \
  -d '{"lake":"polymarket","table":"markets","limit":5}')
ID=$(echo "$START" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).queryExecutionId")
LIM=$(echo "$START" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).rowLimit")
curl -s "http://localhost:3000/api/data-lake/athena-query/status?queryExecutionId=$ID&limit=$LIM"
```

### 4. If the smoke script fails

- **AccessDenied** on results bucket: fix IAM for `s3:PutObject` on the output prefix (Athena service + your caller as required by your bucket policy).
- **InvalidRequestException** on output: ensure `DATA_LAKE_ATHENA_OUTPUT_S3_URI` is `s3://bucket/folder/` (trailing slash optional but prefix must be valid).
- **Workgroup** issues: set `DATA_LAKE_ATHENA_WORKGROUP` to an existing workgroup or create `primary`.

---

## Summary

- **Primary server path:** Athena + Glue catalog over your existing S3 Parquet layout.
- **Next.js:** orchestration, security, and bounded responses; avoid long blocking requests on serverless.
- **Frontend DuckDB + `parquet.js` proxy:** unchanged role — small / exploratory Parquet, not whole-lake analytics.
- **Test:** `npm run athena:smoke` for wiring; Athena console + partition-aware SQL for real tables.
