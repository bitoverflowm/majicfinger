/* eslint-disable no-console */
/**
 * Backfill published_bundle on all public charts (additive $set only — never deletes data).
 *
 * Usage:
 *   node --import ./scripts/register-alias.mjs ./scripts/backfill-published-chart-bundles.mjs --dry-run
 *   node --import ./scripts/register-alias.mjs ./scripts/backfill-published-chart-bundles.mjs --execute --limit 5
 *   node --import ./scripts/register-alias.mjs ./scripts/backfill-published-chart-bundles.mjs --execute --batch-size 10 --delay-ms 2000
 *
 * Env: MONGODB_URI (required for --execute)
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import Chart from "@/models/Charts.js";
import DataSet from "@/models/DataSets.js";
import { materializeChartBundle } from "@/lib/server/materializeChartBundle.js";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

function parseArgs(argv) {
  const args = {
    dryRun: true,
    limit: 0,
    delayMs: 1500,
    resumeFrom: "",
    ownerId: "",
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--execute") args.dryRun = false;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--limit") args.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === "--delay-ms") args.delayMs = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === "--resume-from") args.resumeFrom = String(argv[++i] || "").trim();
    else if (a === "--owner") args.ownerId = String(argv[++i] || "").trim();
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const uri = process.env.MONGODB_URI;
  if (!args.dryRun && !uri) {
    throw new Error("MONGODB_URI is required for --execute");
  }

  const query = {
    is_public: true,
    public_slug: { $type: "string", $gt: "" },
  };
  if (args.ownerId && mongoose.Types.ObjectId.isValid(args.ownerId)) {
    query.user_id = new mongoose.Types.ObjectId(args.ownerId);
  }

  if (!args.dryRun) {
    await mongoose.connect(uri);
  }

  let charts = [];
  if (args.dryRun) {
    if (!uri) {
      console.log("DRY RUN (no MONGODB_URI): would query public charts and materialize bundles.");
      console.log("Set MONGODB_URI and re-run without --dry-run only after reviewing this script.");
      return;
    }
    await mongoose.connect(uri);
  }

  charts = await Chart.find(query).sort({ _id: 1 }).lean();
  if (args.resumeFrom) {
    charts = charts.filter((c) => String(c._id) >= args.resumeFrom);
  }
  if (args.limit > 0) {
    charts = charts.slice(0, args.limit);
  }

  console.log(
    `${args.dryRun ? "[DRY RUN] " : ""}Processing ${charts.length} public chart(s)…`,
  );

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const chart of charts) {
    const cid = String(chart._id);
    const slug = chart.public_slug || "";
    const hasBundle = !!chart.published_bundle?.chart;

    if (args.dryRun) {
      console.log(`  would materialize: ${cid} slug=${slug} hasBundle=${hasBundle}`);
      ok += 1;
      continue;
    }

    try {
      const dataSetRaw = chart.data_set_id
        ? await DataSet.findById(chart.data_set_id).lean()
        : null;
      if (!dataSetRaw) {
        console.warn(`  SKIP ${cid}: no dataset`);
        skipped += 1;
        continue;
      }

      const { bundle, meta, warnings } = await materializeChartBundle({
        chartLean: chart,
        dataSetLean: dataSetRaw,
        userId: chart.user_id,
      });

      await Chart.updateOne(
        { _id: chart._id },
        {
          $set: {
            published_bundle: bundle,
            published_bundle_meta: meta,
            published_bundle_built_at: new Date(),
          },
        },
      );

      console.log(
        `  OK ${cid} slug=${slug} mode=${meta.materialization_mode} rows=${meta.row_count} ms=${meta.hydration_ms}`,
      );
      if (warnings?.length) console.warn(`    warnings: ${warnings.join("; ")}`);
      ok += 1;
    } catch (err) {
      console.error(`  FAIL ${cid} slug=${slug}:`, err?.message || err);
      failed += 1;
    }

    if (args.delayMs > 0) {
      await new Promise((r) => setTimeout(r, args.delayMs));
    }
  }

  console.log(`Done. ok=${ok} skipped=${skipped} failed=${failed}`);
  if (!args.dryRun) await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
