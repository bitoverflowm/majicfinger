import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

/**
 * GET /api/integrations/kalshi-live/historical/cutoff
 * Proxies Kalshi GET /historical/cutoff (live vs historical data boundary).
 */

let cached = {
  dayKey: /** @type {string | null} */ (null),
  body: /** @type {any | null} */ (null),
};
let inFlight = /** @type {Promise<any> | null} */ (null);

function dayKeyNow() {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const currentDayKey = dayKeyNow();
    if (cached.dayKey === currentDayKey && cached.body) {
      return res.status(200).json(cached.body);
    }

    if (inFlight) {
      const body = await inFlight;
      cached = { dayKey: currentDayKey, body };
      return res.status(200).json(body);
    }

    inFlight = (async () => {
      const upstream = await fetch(kalshiLiveUrl("historical/cutoff"), {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const body = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        // Let the caller handle status mapping below.
        return { __kalshi_error: true, __status: upstream.status, __body: body };
      }
      return body;
    })();

    const result = await inFlight;
    inFlight = null;

    // Error mapping: keep response semantics from the original implementation.
    if (result?.__kalshi_error) {
      const status = result.__status;
      const body = result.__body;
      const errorMessage =
        typeof body?.message === "string"
          ? body.message
          : typeof body?.error === "string"
            ? body.error
            : "Failed to fetch historical cutoff";

      return res.status(status).json({ error: errorMessage });
    }

    cached = { dayKey: currentDayKey, body: result };
    return res.status(200).json(result);
  } catch (e) {
    inFlight = null;
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi historical cutoff",
    });
  }
}
