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
  // Production only. Local/dev must never send Telegram alerts.
  if (process.env.NODE_ENV !== "production") return false;
  if (process.env.TELEGRAM_NOTIFICATIONS_ENABLED === "false") return false;
  return !!(getBotToken() && getChatId());
}

async function callTelegram(method, payload, retried = false) {
  const res = await fetch(`https://api.telegram.org/bot${getBotToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: getChatId(), ...payload }),
    signal: AbortSignal.timeout(8000),
  });
  const body = await res.json().catch(() => ({}));
  const retryAfter = Number(body?.parameters?.retry_after);
  if (res.status === 429 && !retried && retryAfter > 0 && retryAfter <= 5) {
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return callTelegram(method, payload, true);
  }
  if (!res.ok || body?.ok === false) {
    return { ok: false, error: body?.description || `HTTP ${res.status}` };
  }
  return { ok: true, result: body.result };
}

/**
 * Fire-and-forget Telegram message. Never throws to callers.
 * @param {string} text
 * @param {{ replyTo?: number }} [opts]
 */
export async function sendTelegramMessage(text, opts = {}) {
  if (!isTelegramConfigured()) {
    return { ok: false, skipped: true };
  }

  try {
    const sent = await callTelegram("sendMessage", {
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(opts.replyTo
        ? { reply_parameters: { message_id: opts.replyTo, allow_sending_without_reply: true } }
        : {}),
    });
    if (!sent.ok) {
      console.error("[telegram] sendMessage failed:", sent.error);
      return { ok: false, error: sent.error };
    }
    return { ok: true, messageId: sent.result?.message_id };
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

/**
 * Replace the text of a message this bot sent. Never throws to callers.
 * @param {number} messageId
 * @param {string} text
 */
export async function editTelegramMessage(messageId, text) {
  if (!isTelegramConfigured() || !messageId) {
    return { ok: false, skipped: true };
  }
  try {
    const edited = await callTelegram("editMessageText", {
      message_id: messageId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    if (!edited.ok && !/message is not modified/i.test(edited.error || "")) {
      console.error("[telegram] editMessageText failed:", edited.error);
      return { ok: false, error: edited.error };
    }
    return { ok: true };
  } catch (err) {
    const error = formatFetchError(err);
    console.error("[telegram] editMessageText error:", error);
    return { ok: false, error };
  }
}
