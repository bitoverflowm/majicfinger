function getBotToken() {
  return process.env.TELEGRAM_SECRET_KEY || process.env.TELEGRAM_BOT_TOKEN || "";
}

function getChatId() {
  return process.env.TELEGRAM_CHAT_ID || "";
}

function formatFetchError(err) {
  const cause = err?.cause?.message || err?.cause?.code;
  if (cause) return `${err?.message || "fetch failed"} (${cause})`;
  return err?.message || "fetch failed";
}

export function isTelegramConfigured() {
  // Dev/local: off by default so unreachable Telegram API calls don't stall journey routes.
  // Opt in with TELEGRAM_NOTIFICATIONS_ENABLED=true. Production: on unless explicitly set to false.
  if (process.env.NODE_ENV !== "production") {
    if (process.env.TELEGRAM_NOTIFICATIONS_ENABLED !== "true") return false;
  } else if (process.env.TELEGRAM_NOTIFICATIONS_ENABLED === "false") {
    return false;
  }
  return !!(getBotToken() && getChatId());
}

/**
 * Fire-and-forget Telegram message. Never throws to callers.
 * @param {string} text
 */
export async function sendTelegramMessage(text) {
  if (!isTelegramConfigured()) {
    return { ok: false, skipped: true };
  }

  const token = getBotToken();
  const chatId = getChatId();

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.ok === false) {
      console.error("[telegram] sendMessage failed:", body?.description || res.status);
      return { ok: false, error: body?.description || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    const error = formatFetchError(err);
    console.error("[telegram] sendMessage error:", error);
    const isNetwork =
      /timeout|fetch failed|ENOTFOUND|ECONNREFUSED|Connect Timeout/i.test(error);
    return {
      ok: false,
      error,
      ...(isNetwork
        ? {
            hint: "Cannot reach api.telegram.org from this server. Try disabling VPN, allow Telegram in firewall, or deploy to production where Telegram is reachable.",
          }
        : {}),
    };
  }
}
