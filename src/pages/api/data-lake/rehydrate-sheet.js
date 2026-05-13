/**
 * Rebuild a saved provenance-backed sheet from Data Lake query history.
 */
import { AthenaLakeRequestError } from "@/lib/dataLake/validateAthenaLakeRequest";
import { getAthenaAccessFromRequest } from "@/lib/athenaAccess";
import { runRehydrateSheetCore } from "@/lib/dataLake/rehydrateSheetCore";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

function parseBody(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return null;
    }
  }
  return req.body && typeof req.body === "object" ? req.body : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed", code: "METHOD" });
  }

  const body = parseBody(req);
  if (!body) {
    return res.status(400).json({ error: "Invalid JSON body", code: "BAD_REQUEST" });
  }

  const provenance = body.provenance && typeof body.provenance === "object" ? body.provenance : null;
  if (!provenance) {
    return res.status(400).json({ error: "Missing sheet provenance", code: "BAD_REQUEST" });
  }
  if (provenance.kind !== "compose") {
    return res.status(400).json({
      error: `Only CTE-rebuildable compose provenance can be rehydrated by this endpoint (got ${String(provenance.kind || "unknown")}).`,
      code: "UNSUPPORTED_PROVENANCE",
    });
  }

  try {
    const access = await getAthenaAccessFromRequest(req);
    const payload = await runRehydrateSheetCore(body, access);
    return res.status(200).json(payload);
  } catch (e) {
    if (e instanceof AthenaLakeRequestError) {
      return res.status(e.statusCode).json({ error: e.message, code: e.code });
    }
    const code = e?.code || "INTERNAL";
    if (code === "CONFIG") {
      return res.status(503).json({ error: e.message, code: "CONFIG" });
    }
    if (code === "TIMEOUT") {
      return res.status(408).json({ error: e.message, code: "TIMEOUT", queryExecutionId: e.queryExecutionId });
    }
    if (code === "ATHENA_FAILED") {
      return res.status(502).json({ error: e.message, code: "ATHENA_FAILED", queryExecutionId: e.queryExecutionId });
    }
    if (code === "BAD_REQUEST") {
      return res.status(400).json({ error: e.message, code: "BAD_REQUEST" });
    }
    return res.status(500).json({ error: e?.message || "Internal error", code });
  }
}
