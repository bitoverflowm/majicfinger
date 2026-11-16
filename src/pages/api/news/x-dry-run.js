import { buildLycheeNewsXPreview, dryRunOnePulseItem } from "@/lib/lycheeNews/pipeline";
import { xNewsEnvStatus } from "@/lib/lycheeNews/xClient";
import { NEWS_PULSE_DEMO_ITEMS } from "@/lib/newsPulse";

/**
 * GET|POST /api/news/x-dry-run
 *
 * Dry-run only: pulse → @lychee_news thread payloads. Never calls create-tweet.
 *
 * Query / body:
 * - limit=N (default 5, max 12)
 * - refresh=1 — force pulse rebuild
 * - demo=1 — use NEWS_PULSE_DEMO_ITEMS (no network)
 * - id=<pulse id> — single item from feed/demo
 * POST body may include `{ item }` for an ad-hoc pulse-shaped object.
 */

export const config = { maxDuration: 60 };

function parseLimit(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 5;
  return Math.min(12, Math.max(1, Math.floor(n)));
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ success: false, message: "GET or POST only" });
  }

  const q = req.method === "POST" ? { ...req.query, ...(req.body || {}) } : req.query;
  const limit = parseLimit(q.limit);
  const demo = q.demo === "1" || q.demo === true || String(q.demo || "").toLowerCase() === "true";
  const refresh = q.refresh === "1" || q.force === "1";
  const id = String(q.id || "").trim();

  try {
    // Ad-hoc single item (POST) — still dry-run.
    if (req.method === "POST" && req.body?.item && typeof req.body.item === "object") {
      const one = dryRunOnePulseItem(req.body.item);
      return res.status(200).json({
        success: true,
        data: { ...one, env: xNewsEnvStatus() },
      });
    }

    if (demo || process.env.NEWS_PULSE_DEMO === "1") {
      let items = NEWS_PULSE_DEMO_ITEMS;
      if (id) items = items.filter((it) => it.id === id);
      const preview = await buildLycheeNewsXPreview({ items, limit, live: false });
      return res.status(200).json({
        success: true,
        data: { ...preview, demo: true },
      });
    }

    const preview = await buildLycheeNewsXPreview({ limit, force: refresh, live: false });
    if (id) {
      preview.drafts = (preview.drafts || []).filter((d) => d.id === id);
      preview.count = preview.drafts.length;
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ success: true, data: preview });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "x-dry-run failed",
      env: xNewsEnvStatus(),
    });
  }
}
