import { isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram/notify";

/**
 * GET /api/analytics/telegram-test
 * Smoke test: Telegram API only (no MongoDB).
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, message: "Method not allowed" });

  const isDev = process.env.NODE_ENV !== "production";
  const testSecret = process.env.TELEGRAM_TEST_SECRET;
  const providedSecret = String(req.query?.secret || "");

  if (!isDev && (!testSecret || providedSecret !== testSecret)) {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }

  if (!isTelegramConfigured()) {
    return res.status(503).json({
      ok: false,
      message: "Telegram not configured. Set TELEGRAM_SECRET_KEY and TELEGRAM_CHAT_ID in .env",
    });
  }

  const text = [
    "<b>✅ Zora test ping</b>",
    "",
    "Telegram is configured and reachable from Lychee.",
    `Time: ${new Date().toISOString()}`,
  ].join("\n");

  const result = await sendTelegramMessage(text);
  return res.status(result.ok ? 200 : 502).json({
    ...result,
    counterSkipped: true,
    chatConfigured: true,
  });
}
