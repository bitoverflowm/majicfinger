/* eslint-disable no-console */
/**
 * Inject seeded randomSample into research workbook sheets (Mongo).
 *
 * Usage:
 *   node --import ./scripts/register-alias.mjs scripts/inject-random-sample-seeds.mjs --dry-run
 *   node --import ./scripts/register-alias.mjs scripts/inject-random-sample-seeds.mjs --execute
 *   node --import ./scripts/register-alias.mjs scripts/inject-random-sample-seeds.mjs --execute --prod-db
 *
 * Flags:
 *   --dry-run     Report only (default)
 *   --execute     Write updated data_sheets
 *   --prod-db     Use MONGODB_URI (production). Default uses MONGODB_URI_DEV.
 *   --name        Project name substring (default: "sample data analysis")
 */

import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

import {
  injectMissingRandomSampleSeeds,
  RESEARCH_RANDOM_SAMPLE_SHEET_NAMES,
} from "@/lib/dataLake/randomSample.js";

function parseArgs(argv) {
  const args = {
    dryRun: true,
    prodDb: false,
    name: "sample data analysis",
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--execute") args.dryRun = false;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--prod-db" || a === "--prod") args.prodDb = true;
    else if (a === "--name") args.name = String(argv[++i] || "").trim() || args.name;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.prodDb) process.env.USE_PRODUCTION_DB = "1";

  const { resolveAppMongoUri, mongoDatabaseTarget } = await import("@/lib/resolveMongoUri.js");
  const uri = resolveAppMongoUri();
  if (!uri) {
    throw new Error(
      args.prodDb
        ? "MONGODB_URI is required for --prod-db"
        : "MONGODB_URI_DEV is required (or pass --prod-db for MONGODB_URI)",
    );
  }

  const mongoose = (await import("mongoose")).default;
  const DataSet = (await import("@/models/DataSets.js")).default;

  console.log(`[inject-seeds] target=${mongoDatabaseTarget()} dryRun=${args.dryRun} name~=${args.name}`);
  await mongoose.connect(uri);

  const projects = await DataSet.find({
    data_set_name: { $regex: args.name, $options: "i" },
  }).lean();

  if (!projects.length) {
    console.log("No matching projects.");
    await mongoose.disconnect();
    return;
  }

  for (const ds of projects) {
    const sheets = ds.data_sheets && typeof ds.data_sheets === "object" ? ds.data_sheets : {};
    const { sheets: nextSheets, changedIds } = injectMissingRandomSampleSeeds(sheets, {
      sheetNameAllowlist: RESEARCH_RANDOM_SAMPLE_SHEET_NAMES,
    });
    console.log(
      `project "${ds.data_set_name}" (${ds._id}): ${changedIds.length} sheet(s) to seed`,
      changedIds.map((id) => nextSheets[id]?.name || id),
    );
    if (!args.dryRun && changedIds.length) {
      await DataSet.updateOne({ _id: ds._id }, { $set: { data_sheets: nextSheets } });
      console.log(`  wrote ${changedIds.length} sheet(s)`);
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
