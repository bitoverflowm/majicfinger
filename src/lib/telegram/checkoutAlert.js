import { sendTelegramMessage } from "@/lib/telegram/notify";
import { escapeHtml, formatFieldLines } from "@/lib/telegram/format";

/**
 * Operational checkout alert. Production sends to the Telegram bot.
 * Local/dev only logs — sendTelegramMessage is disabled outside production.
 *
 * @param {{ severity?: 'error' | 'notice'; title: string; fields?: Record<string, string | number | boolean | null | undefined> }} opts
 */
export async function notifyCheckoutAlert({ severity = "error", title, fields = {} }) {
  const label = severity === "error" ? "Checkout issue" : "Checkout update";
  const log = severity === "error" ? console.error : console.log;
  log(`[checkout] ${title}`, fields);

  const text = [`<b>${escapeHtml(label)}: ${escapeHtml(title)}</b>`, "", formatFieldLines(fields)]
    .filter(Boolean)
    .join("\n");

  try {
    return await sendTelegramMessage(text);
  } catch (err) {
    console.error("[telegram] checkout alert failed:", err?.message || err);
    return { ok: false };
  }
}
