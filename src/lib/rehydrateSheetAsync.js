/**
 * Browser replay/rehydrate: start Athena → poll status (same as first pull) → replay ops locally.
 */
import { buildRehydrateSheetRequestBody } from "@/lib/dataLake/rehydrateSheetShared";
import { pollAthenaQueryUntilDone } from "@/lib/dataLake/pollAthenaQueryStatus";
import { finalizeRehydrateSheetResult } from "@/lib/dataLake/rehydrateSheetFinalize";

/**
 * @param {{
 *   sheetId: string;
 *   provenance: object;
 *   sheetGraph?: object;
 *   sheet?: object;
 *   maxRows?: number;
 *   pollOpts?: { signal?: AbortSignal; pollIntervalMs?: number; maxWaitMs?: number };
 * }} args
 */
export async function rehydrateSheetAsync({
  sheetId,
  provenance,
  sheetGraph,
  sheet,
  maxRows,
  pollOpts,
}) {
  const body = buildRehydrateSheetRequestBody({
    sheetId,
    provenance,
    sheetGraph,
    sheet,
    maxRows,
  });

  const startRes = await fetch("/api/data-lake/rehydrate-sheet/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    signal: pollOpts?.signal,
    body: JSON.stringify(body),
  });

  const startJson = await startRes.json().catch(() => null);
  if (!startRes.ok) {
    throw new Error(startJson?.error || startRes.statusText || `Rehydrate start ${startRes.status}`);
  }

  const queryExecutionId = startJson?.queryExecutionId;
  if (!queryExecutionId) {
    throw new Error("Rehydrate start response missing queryExecutionId");
  }

  const rowLimit = startJson?.rowLimit ?? startJson?.requestedLimit ?? null;
  const athenaResult = await pollAthenaQueryUntilDone(queryExecutionId, rowLimit, pollOpts);
  const json = finalizeRehydrateSheetResult(body, athenaResult, startJson?.requestedLimit ?? rowLimit);

  return {
    rows: Array.isArray(json?.rows) ? json.rows : [],
    json,
    requestBody: body,
    sourceSheet: sheet,
  };
}
