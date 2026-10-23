import dbConnect from "@/lib/dbConnect";
import CheckoutAttempt from "@/models/CheckoutAttempt";
import { editTelegramMessage, isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram/notify";
import { escapeHtml } from "@/lib/telegram/format";
import { countryCodeToFlag, countryDisplayName } from "@/lib/telegram/geoFormat";

/**
 * Every step a buyer can reach. `stage` is what the live message shows as "Now".
 * `once` steps are recorded a single time per checkout. `ping` sends a reply that notifies.
 */
export const CHECKOUT_STEPS = {
  opened: { label: "Opened checkout", stage: "Loading checkout" },
  form_ready: { label: "Payment form loaded", stage: "Looking at checkout", once: true },
  form_load_failed: { label: "Payment form failed to load", stage: "Payment form failed to load", ping: "issue" },
  contact_started: { label: "Started entering email", stage: "Entering email", once: true },
  payment_started: { label: "Started entering payment details", stage: "Entering payment details", once: true },
  method_changed: { label: "Switched payment method", stage: "Entering payment details" },
  details_complete: { label: "Payment details complete", stage: "Details filled in, hasn't clicked pay", once: true },
  promo_applied: { label: "Applied promo code", stage: "Entering payment details" },
  promo_failed: { label: "Promo code rejected", stage: "Entering payment details" },
  submit: { label: "Clicked pay", stage: "Processing payment" },
  payment_failed: { label: "Payment failed", stage: "Payment failed", ping: "issue" },
  payment_confirmed: { label: "Payment confirmed", stage: "Paid, opening account setup", once: true, ping: "paid" },
  left_page: { label: "Left checkout", stage: "Left checkout", ping: "left" },
  return_unpaid: { label: "Reached account step without paying", stage: "Payment not completed" },
  access_granted: { label: "Access granted", stage: "Paid, setting up account", once: true, ping: "paid" },
  grant_failed: { label: "Could not grant access", stage: "Access grant failed", ping: "issue" },
  async_payment_failed: { label: "Bank payment failed", stage: "Bank payment failed", ping: "issue" },
  expired: { label: "Checkout session expired", stage: "Expired", once: true },
  account_step: { label: "Account setup shown", stage: "Setting up account", once: true },
  email_verify_started: { label: "Clicked Continue, waiting on email link", stage: "Verifying email" },
  email_verified: { label: "Email verified", stage: "Finishing account" },
  account_failed: { label: "Account setup error", stage: "Account setup error", ping: "issue" },
  account_created: { label: "Account ready, opened dashboard", stage: "Done", once: true, ping: "account" },
  left_account_step: { label: "Left account setup", stage: "Paid, left before creating account", ping: "left_account" },
};

/** Steps the browser may report. Server-only steps (grants, webhooks) are excluded. */
export const CLIENT_CHECKOUT_STEPS = new Set([
  "form_ready",
  "form_load_failed",
  "contact_started",
  "payment_started",
  "method_changed",
  "details_complete",
  "promo_applied",
  "promo_failed",
  "submit",
  "payment_failed",
  "payment_confirmed",
  "left_page",
  "return_unpaid",
  "account_step",
  "email_verify_started",
  "email_verified",
  "account_failed",
  "account_created",
  "left_account_step",
]);

const MAX_STEPS = 120;
const MAX_ISSUE_PINGS = 5;
const MAX_TIMELINE_LINES = 32;

const METHOD_NAMES = {
  card: "Card",
  link: "Link",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  cashapp: "Cash App Pay",
  amazon_pay: "Amazon Pay",
  us_bank_account: "US bank account",
  klarna: "Klarna",
  affirm: "Affirm",
  afterpay_clearpay: "Afterpay",
};

function methodName(type) {
  const value = String(type || "");
  if (!value) return "";
  return METHOD_NAMES[value] || value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDuration(ms) {
  const value = Math.max(0, Number(ms) || 0);
  if (value < 10_000) return `${(value / 1000).toFixed(1)}s`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function offset(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 60) return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function money(cents) {
  if (!Number.isFinite(Number(cents))) return "";
  const value = Number(cents) / 100;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

function deviceLabel(userAgent) {
  const ua = String(userAgent || "");
  if (!ua) return "";
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Macintosh|Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /CriOS|Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "";
  return [os, browser].filter(Boolean).join(" ");
}

function sortedSteps(attempt) {
  return [...(attempt?.steps || [])].sort((a, b) => new Date(a.at) - new Date(b.at));
}

function firstAt(steps, names) {
  const hit = steps.find((s) => names.includes(s.step));
  return hit ? new Date(hit.at).getTime() : null;
}

function lastAt(steps, names) {
  const hits = steps.filter((s) => names.includes(s.step));
  return hits.length ? new Date(hits[hits.length - 1].at).getTime() : null;
}

function isPaid(steps) {
  return steps.some((s) => s.step === "payment_confirmed" || s.step === "access_granted");
}

function lastMethod(steps) {
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const method = steps[i].data?.method;
    if (method) return method;
  }
  return "";
}

function stageBefore(steps, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    const def = CHECKOUT_STEPS[steps[i].step];
    if (def && !steps[i].step.startsWith("left_")) return def.stage;
  }
  return "Loading checkout";
}

function journeyEmail(attempt, steps) {
  const typed = [...steps].reverse().find((s) => s.data?.email)?.data?.email;
  return attempt.contactEmail || attempt.billingEmail || typed || attempt.loginEmail || attempt.prefillEmail || "";
}

function planLine(attempt) {
  const label = attempt.planLabel || attempt.planKey || "Unknown plan";
  const amount = money(attempt.amount);
  if (!amount) return label;
  return attempt.interval ? `${label} · ${amount}/${attempt.interval}` : `${label} · ${amount}`;
}

function journeyStatus(steps) {
  const last = steps[steps.length - 1];
  const failures = steps.filter((s) => s.step === "payment_failed").length;
  if (steps.some((s) => s.step === "account_created")) return { emoji: "🎉", title: "Paid and account ready" };
  if (isPaid(steps)) {
    if (last?.step === "left_account_step") return { emoji: "⚠️", title: "Paid, left before creating an account" };
    if (last?.step === "account_failed") return { emoji: "⚠️", title: "Paid, account setup hit an error" };
    if (last?.step === "grant_failed") return { emoji: "🚨", title: "Paid, but access was not granted" };
    return { emoji: "✅", title: "Paid, setting up account" };
  }
  if (last?.step === "async_payment_failed") return { emoji: "❌", title: "Bank payment failed" };
  if (last?.step === "left_page") {
    return last.data?.afterSubmit
      ? { emoji: "↗️", title: "Left to finish payment with provider" }
      : { emoji: "🚪", title: "Left without paying" };
  }
  if (last?.step === "expired") return { emoji: "⌛", title: "Checkout expired" };
  if (last?.step === "payment_failed") {
    return { emoji: "❌", title: failures > 1 ? `Payment failed (${failures} tries)` : "Payment failed" };
  }
  if (last?.step === "form_load_failed") return { emoji: "⚠️", title: "Payment form failed to load" };
  return { emoji: "🛒", title: "In checkout" };
}

function stepDetail(step, steps, index) {
  const data = step.data || {};
  const at = new Date(step.at).getTime();
  const parts = [];
  switch (step.step) {
    case "opened":
      if (data.from) parts.push(`from ${data.from}`);
      break;
    case "form_ready":
      if (data.ms != null) parts.push(`${formatDuration(data.ms)} after click`);
      break;
    case "payment_started":
    case "method_changed":
    case "details_complete":
      if (data.method) parts.push(methodName(data.method));
      if (step.step === "details_complete") {
        const began = firstAt(steps.slice(0, index), ["contact_started", "payment_started"]);
        if (began) parts.push(`${formatDuration(at - began)} filling in`);
      }
      break;
    case "promo_applied":
    case "promo_failed":
      if (data.promo) parts.push(data.promo);
      if (data.message) parts.push(data.message);
      break;
    case "submit": {
      if (data.method) parts.push(methodName(data.method));
      const began = firstAt(steps.slice(0, index), ["contact_started", "payment_started", "details_complete"]);
      if (began) parts.push(`${formatDuration(at - began)} entering info`);
      break;
    }
    case "payment_failed":
      if (data.kind === "declined") parts.push("Declined");
      if (data.message) parts.push(data.message);
      if (data.declineCode || data.code) parts.push(`[${data.declineCode || data.code}]`);
      if (data.method) parts.push(methodName(data.method));
      break;
    case "payment_confirmed":
      if (data.ms != null) parts.push(`took ${formatDuration(data.ms)}`);
      if (data.method) parts.push(methodName(data.method));
      if (data.paymentStatus && data.paymentStatus !== "paid") parts.push(data.paymentStatus);
      break;
    case "left_page":
    case "left_account_step":
      if (data.via) parts.push(data.via);
      if (data.afterSubmit && step.step === "left_page") parts.push("after clicking pay (likely a redirect to the payment provider)");
      else parts.push(`was at: ${stageBefore(steps, index)}`);
      break;
    case "access_granted":
      if (data.via) parts.push(`via ${data.via}`);
      break;
    case "account_step":
      if (data.paymentStatus) parts.push(`payment ${data.paymentStatus}`);
      break;
    case "email_verify_started":
      if (data.email) parts.push(data.email);
      break;
    case "email_verified": {
      if (data.via) parts.push(data.via);
      const started = lastAt(steps.slice(0, index), ["email_verify_started"]);
      if (started) parts.push(`took ${formatDuration(at - started)}`);
      break;
    }
    case "account_created":
      if (data.existing) parts.push("already had an account");
      break;
    default:
      if (data.message) parts.push(data.message);
  }
  if (["form_load_failed", "grant_failed", "account_failed", "async_payment_failed"].includes(step.step) && data.message && !parts.includes(data.message)) {
    parts.push(data.message);
  }
  return parts.filter(Boolean).join(" · ");
}

function stepTimes(steps) {
  const start = steps.length ? new Date(steps[0].at).getTime() : 0;
  const end = steps.length ? new Date(steps[steps.length - 1].at).getTime() : 0;
  const lines = [];
  const ready = steps.find((s) => s.step === "form_ready");
  if (ready?.data?.ms != null) lines.push(`Page load: ${formatDuration(ready.data.ms)}`);

  const began = firstAt(steps, ["contact_started", "payment_started", "details_complete"]);
  const submitted = firstAt(steps, ["submit"]);
  if (began && submitted) lines.push(`Entering info: ${formatDuration(submitted - began)}`);
  else if (began) lines.push(`Entering info: ${formatDuration(end - began)} so far`);

  const confirmed = steps.find((s) => s.step === "payment_confirmed");
  if (confirmed?.data?.ms != null) lines.push(`Payment processing: ${formatDuration(confirmed.data.ms)}`);

  const accountStart = firstAt(steps, ["account_step"]);
  const accountDone = firstAt(steps, ["account_created"]);
  if (accountStart && accountDone) lines.push(`Account setup: ${formatDuration(accountDone - accountStart)}`);
  else if (accountStart) lines.push(`Account setup: ${formatDuration(end - accountStart)} so far`);

  if (start) lines.push(`Total: ${formatDuration((accountDone || end) - start)}`);
  return lines;
}

function sourceLine(source = {}) {
  const flag = countryCodeToFlag(source.country);
  const place = [countryDisplayName(source.country) || source.country, source.region, source.city].filter(Boolean).join(" · ");
  return [source.from, [flag, place].filter(Boolean).join(" "), deviceLabel(source.userAgent)].filter(Boolean).join(" | ");
}

/** @returns {string} Telegram HTML for the live checkout message. */
export function renderCheckoutJourney(attempt) {
  const steps = sortedSteps(attempt);
  const status = journeyStatus(steps);
  const last = steps[steps.length - 1];
  const start = steps.length ? new Date(steps[0].at).getTime() : Date.now();
  const end = last ? new Date(last.at).getTime() : start;
  const email = journeyEmail(attempt, steps);
  const method = lastMethod(steps);
  const promo = [...steps].reverse().find((s) => s.step === "promo_applied")?.data?.promo;

  const field = (label, value) => (value ? `<b>${escapeHtml(label)}:</b> ${escapeHtml(value)}` : "");
  const header = [
    `${status.emoji} <b>${attempt.testMode ? "[TEST] " : ""}Checkout: ${escapeHtml(status.title)}</b>`,
    field("Plan", planLine(attempt)),
    field("Now", CHECKOUT_STEPS[last?.step]?.stage || "Loading checkout"),
    field("Time in checkout", formatDuration(end - start)),
    field("Email", email),
    field("Payment method", methodName(method)),
    field("Promo", promo),
    field("From", sourceLine(attempt.source)),
  ].filter(Boolean);

  let timeline = steps.map((step, index) => {
    const def = CHECKOUT_STEPS[step.step];
    const detail = stepDetail(step, steps, index);
    const label = def?.label || step.step;
    return `<code>+${offset(new Date(step.at).getTime() - start)}</code> ${escapeHtml(label)}${detail ? ` · ${escapeHtml(detail)}` : ""}`;
  });
  if (timeline.length > MAX_TIMELINE_LINES) {
    const hidden = timeline.length - MAX_TIMELINE_LINES + 1;
    timeline = [...timeline.slice(0, 4), `<i>… ${hidden} more steps …</i>`, ...timeline.slice(-(MAX_TIMELINE_LINES - 5))];
  }

  const times = stepTimes(steps);
  const text = [
    header.join("\n"),
    times.length ? `<b>Time per step</b>\n${times.map(escapeHtml).join("\n")}` : "",
    `<b>Timeline</b>\n${timeline.join("\n")}`,
    `<i>${escapeHtml(attempt.stripeSessionId || attempt.attemptId || "")}</i>`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return text.length > 4000 ? `${text.slice(0, 3990)}…` : text;
}

/** Short reply under the live message so Telegram notifies for the moments that matter. */
function pingFor(attempt, step, data, steps) {
  const def = CHECKOUT_STEPS[step];
  if (!def?.ping) return null;
  const plan = attempt.planLabel || attempt.planKey || "checkout";
  const start = steps.length ? new Date(steps[0].at).getTime() : Date.now();
  const elapsed = formatDuration(Date.now() - start);
  const email = journeyEmail(attempt, steps);
  const test = attempt.testMode ? "[TEST] " : "";
  let index = steps.length - 1;
  while (index > 0 && steps[index].step !== step) index -= 1;

  if (def.ping === "issue") {
    const issues = (attempt.telegramPings || []).filter((key) => key.startsWith("issue:")).length;
    if (issues >= MAX_ISSUE_PINGS) return null;
    const detail = stepDetail(steps[index] || { step, at: new Date(), data }, steps, index);
    return {
      key: `issue:${steps.length}`,
      text: `❌ ${test}<b>${escapeHtml(def.label)}</b> · ${escapeHtml(plan)}${detail ? `\n${escapeHtml(detail)}` : ""}\n<i>${escapeHtml(elapsed)} into checkout${email ? ` · ${escapeHtml(email)}` : ""}</i>`,
    };
  }
  if (def.ping === "paid") {
    const method = methodName(lastMethod(steps));
    return {
      key: "paid",
      text: `✅ ${test}<b>Paid ${escapeHtml(money(attempt.amount) || "")}</b> for ${escapeHtml(plan)}${method ? ` · ${escapeHtml(method)}` : ""}\n<i>${escapeHtml(elapsed)} from opening checkout${email ? ` · ${escapeHtml(email)}` : ""}</i>`,
    };
  }
  if (def.ping === "account") {
    return {
      key: "account",
      text: `🎉 ${test}<b>Account ready</b> · ${escapeHtml(plan)}${email ? ` · ${escapeHtml(email)}` : ""}\n<i>Total ${escapeHtml(elapsed)} from opening checkout</i>`,
    };
  }
  if (def.ping === "left") {
    if (isPaid(steps) || data?.afterSubmit) return null;
    return {
      key: "left",
      text: `🚪 ${test}<b>Left checkout without paying</b> · ${escapeHtml(plan)}\n<i>Was at: ${escapeHtml(stageBefore(steps, index))} · after ${escapeHtml(elapsed)}${email ? ` · ${escapeHtml(email)}` : ""}</i>`,
    };
  }
  if (def.ping === "left_account") {
    if (steps.some((s) => s.step === "account_created")) return null;
    return {
      key: "left_account",
      text: `⚠️ ${test}<b>Paid but left before creating an account</b> · ${escapeHtml(plan)}${email ? `\n${escapeHtml(email)} can finish by logging in with that email.` : ""}`,
    };
  }
  return null;
}

function plainText(html) {
  return String(html)
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function syncTelegram(attempt, step, data) {
  const steps = sortedSteps(attempt);
  const text = renderCheckoutJourney(attempt);
  const ping = pingFor(attempt, step, data, steps);

  if (!isTelegramConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[checkout journey] ${step}\n${plainText(text)}${ping ? `\n  ↳ ping: ${plainText(ping.text)}` : ""}`);
    }
    return;
  }

  let messageId = attempt.telegramMessageId;
  if (!messageId) {
    const claimed = await CheckoutAttempt.findOneAndUpdate(
      { _id: attempt._id, telegramClaimed: { $ne: true } },
      { $set: { telegramClaimed: true } },
    );
    if (claimed) {
      const sent = await sendTelegramMessage(text);
      if (sent.ok && sent.messageId) {
        messageId = sent.messageId;
        await CheckoutAttempt.updateOne({ _id: attempt._id }, { $set: { telegramMessageId: messageId } });
      } else {
        await CheckoutAttempt.updateOne({ _id: attempt._id }, { $unset: { telegramClaimed: 1 } });
      }
    }
  } else {
    await editTelegramMessage(messageId, text);
  }

  if (ping) {
    const won = await CheckoutAttempt.updateOne(
      { _id: attempt._id, telegramPings: { $ne: ping.key } },
      { $addToSet: { telegramPings: ping.key } },
    );
    if (won.modifiedCount) await sendTelegramMessage(ping.text, messageId ? { replyTo: messageId } : {});
  }
}

/**
 * Append a step to a checkout attempt and refresh its Telegram message.
 * Never throws: tracking must not break checkout, login, or webhooks.
 * @param {{ attemptId?: string; sessionId?: string; step: string; data?: Record<string, unknown>; at?: Date; set?: Record<string, unknown> }} opts
 */
export async function recordCheckoutStep({ attemptId, sessionId, step, data = {}, at = new Date(), set = {} }) {
  const def = CHECKOUT_STEPS[step];
  if (!def || (!attemptId && !sessionId)) return null;
  try {
    await dbConnect();
    const filter = attemptId ? { attemptId } : { stripeSessionId: sessionId };
    filter[`steps.${MAX_STEPS - 1}`] = { $exists: false };
    if (def.once) filter["steps.step"] = { $ne: step };
    const attempt = await CheckoutAttempt.findOneAndUpdate(
      filter,
      { $push: { steps: { step, at, data } }, ...(Object.keys(set).length ? { $set: set } : {}) },
      { new: true },
    );
    if (!attempt) return null;
    await syncTelegram(attempt, step, data);
    return attempt;
  } catch (err) {
    console.error(`[checkout journey] could not record ${step}:`, err?.message || err);
    return null;
  }
}
