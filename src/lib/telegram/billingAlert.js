import { sendTelegramMessage } from "@/lib/telegram/notify";
import { escapeHtml, formatFieldLines } from "@/lib/telegram/format";

/**
 * Subscriber lifecycle update (renewal, plan change, cancellation).
 * Production sends to the Telegram bot; dev only logs.
 *
 * @param {{ title: string; fields?: Record<string, string | number | boolean | null | undefined> }} opts
 */
export async function notifyBillingEvent({ title, fields = {} }) {
  console.log(`[billing] ${title}`, fields);
  const text = [`<b>${escapeHtml(`Billing: ${title}`)}</b>`, "", formatFieldLines(fields)]
    .filter(Boolean)
    .join("\n");
  try {
    return await sendTelegramMessage(text);
  } catch (err) {
    console.error("[telegram] billing alert failed:", err?.message || err);
    return { ok: false };
  }
}
