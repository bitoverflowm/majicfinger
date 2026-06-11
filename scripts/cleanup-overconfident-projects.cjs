/**
 * One-off Mongo cleanup for broken overconfident-markets projects.
 *
 * - Deletes replica project 0_1_deep_analysis_overconfident_markets
 * - Repairs 0_deep_analysis_are_political_markets_overconfident:
 *   removes duplicate orphan tabs, converts refine sheets to recipe-only
 *
 * Usage (production):
 *   USE_PRODUCTION_DB=1 node scripts/cleanup-overconfident-projects.cjs
 *
 * Dry run:
 *   USE_PRODUCTION_DB=1 node scripts/cleanup-overconfident-projects.cjs --dry-run
 */
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnv() {
  for (const file of [".env", ".env.local"]) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

const DEFAULT_SHEET_NAME_RE = /^Sheet \d+$/;

function sheetHasComposeProvenance(sheet) {
  const prov = sheet?.provenance;
  return !!(prov && typeof prov === "object" && (prov.kind === "compose" || prov.kind === "compose_browser_join"));
}

function sheetHasRefineRecipe(sheet) {
  const hist = Array.isArray(sheet?.operationHistory) ? sheet.operationHistory : [];
  return hist.some((op) => op?.type === "refine.query");
}

function resolveFullRowCount(sheet) {
  return Math.max(
    0,
    Math.floor(Number(sheet?.fullRowCount) || 0),
    Math.floor(Number(sheet?.rowCount) || 0),
    Math.floor(Number(sheet?.saveMeta?.fullRowCount) || 0),
    Array.isArray(sheet?.data) ? sheet.data.length : 0,
  );
}

function stripRefineRecipeSheet(sheet) {
  const fullRowCount = resolveFullRowCount(sheet);
  return {
    ...sheet,
    data: [],
    storageMode: "derived",
    previewRowCount: 0,
    rowCount: fullRowCount || sheet.rowCount || 0,
    fullRowCount: fullRowCount || sheet.fullRowCount || sheet.rowCount || 0,
    rehydrationStatus: "pending",
    sourceSheetId: sheet.sourceSheetId || "sheet-1",
    saveMeta: {
      ...(sheet.saveMeta && typeof sheet.saveMeta === "object" ? sheet.saveMeta : {}),
      recipeOnly: true,
      persistRows: false,
      fullRowCount,
    },
  };
}

function stripProvenanceSheet(sheet) {
  const fullRowCount = resolveFullRowCount(sheet);
  return {
    ...sheet,
    data: [],
    storageMode: "provenance",
    previewRowCount: 0,
    rowCount: fullRowCount || sheet.rowCount || 0,
    fullRowCount: fullRowCount || sheet.fullRowCount || sheet.rowCount || 0,
    rehydrationStatus: "pending",
    saveMeta: {
      ...(sheet.saveMeta && typeof sheet.saveMeta === "object" ? sheet.saveMeta : {}),
      recipeOnly: true,
      persistRows: false,
    },
  };
}

function repairDataSheets(dataSheets) {
  const sheets = { ...(dataSheets || {}) };
  const provenanceFullCounts = new Set();
  for (const sheet of Object.values(sheets)) {
    if (sheetHasComposeProvenance(sheet)) {
      const full = resolveFullRowCount(sheet);
      if (full > 0) provenanceFullCounts.add(full);
    }
  }

  for (const [id, sheet] of Object.entries({ ...sheets })) {
    const defaultName = DEFAULT_SHEET_NAME_RE.test(String(sheet?.name || "").trim());
    const hist = Array.isArray(sheet?.operationHistory) ? sheet.operationHistory : [];
    const rows = Array.isArray(sheet?.data) ? sheet.data.length : 0;
    const full = resolveFullRowCount(sheet);
    const orphanDuplicate =
      defaultName &&
      hist.length === 0 &&
      !sheetHasComposeProvenance(sheet) &&
      !sheet?.sourceSheetId &&
      !sheetHasRefineRecipe(sheet) &&
      rows > 0 &&
      (provenanceFullCounts.has(rows) || provenanceFullCounts.has(full));

    if (orphanDuplicate) {
      delete sheets[id];
    }
  }

  for (const [id, sheet] of Object.entries(sheets)) {
    if (sheetHasComposeProvenance(sheet)) {
      sheets[id] = stripProvenanceSheet(sheet);
      continue;
    }
    if (sheetHasRefineRecipe(sheet) && !sheetHasComposeProvenance(sheet)) {
      sheets[id] = stripRefineRecipeSheet(sheet);
    }
  }

  return sheets;
}

function estimateBytes(value) {
  return Buffer.byteLength(JSON.stringify(value));
}

async function main() {
  loadEnv();
  const dryRun = process.argv.includes("--dry-run");
  const useProd = String(process.env.USE_PRODUCTION_DB || "").trim().toLowerCase();
  const uri =
    useProd === "1" || useProd === "true" || useProd === "yes"
      ? process.env.MONGODB_URI
      : process.env.MONGODB_URI_DEV || process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Missing Mongo URI. Set MONGODB_URI (with USE_PRODUCTION_DB=1) or MONGODB_URI_DEV.");
  }

  console.log(`Connecting to Mongo (${dryRun ? "dry-run" : "live"})…`);

  const REPLICA_ID = "6a2ae645c06e8b4c5253aea0";
  const MAIN_ID = "6a2a73f187a4d0fd04e87e84";

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000 });
  const col = mongoose.connection.collection("datasets");

  const replica = await col.findOne({ _id: new mongoose.Types.ObjectId(REPLICA_ID) });
  if (replica) {
    console.log(
      `Replica found: ${replica.data_set_name} (${(estimateBytes(replica) / (1024 * 1024)).toFixed(2)} MB)`,
    );
    if (!dryRun) {
      const del = await col.deleteOne({ _id: new mongoose.Types.ObjectId(REPLICA_ID) });
      console.log(`Deleted replica: ${del.deletedCount}`);
    } else {
      console.log("[dry-run] Would delete replica");
    }
  } else {
    console.log("Replica project not found (already deleted).");
  }

  const main = await col.findOne({ _id: new mongoose.Types.ObjectId(MAIN_ID) });
  if (!main) {
    throw new Error(`Main project ${MAIN_ID} not found`);
  }

  const beforeBytes = estimateBytes(main);
  const beforeSheetCount = Object.keys(main.data_sheets || {}).length;
  const repairedSheets = repairDataSheets(main.data_sheets);
  const afterSheetCount = Object.keys(repairedSheets).length;

  const update = {
    data_sheets: repairedSheets,
    data: [],
    last_saved_date: new Date(),
  };

  const afterBytes = estimateBytes({ ...main, ...update });
  console.log(`Main project: ${main.data_set_name}`);
  console.log(`Sheets: ${beforeSheetCount} -> ${afterSheetCount}`);
  console.log(`Estimated size: ${(beforeBytes / (1024 * 1024)).toFixed(2)} MB -> ${(afterBytes / (1024 * 1024)).toFixed(2)} MB`);

  if (!dryRun) {
    await col.updateOne({ _id: new mongoose.Types.ObjectId(MAIN_ID) }, { $set: update });
    console.log("Main project repaired.");
  } else {
    console.log("[dry-run] Would update main project");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
