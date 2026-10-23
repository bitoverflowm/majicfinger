import { CLIENT_CHECKOUT_STEPS, recordCheckoutStep } from "@/lib/telegram/checkoutJourney";

const STRING_KEYS = ["method", "message", "code", "declineCode", "paymentStatus", "email", "via", "promo", "kind"];
const NUMBER_KEYS = ["ms"];
const BOOLEAN_KEYS = ["afterSubmit", "existing"];

function cleanData(raw) {
  const data = {};
  if (!raw || typeof raw !== "object") return data;
  for (const key of STRING_KEYS) {
    if (typeof raw[key] === "string" && raw[key].trim()) data[key] = raw[key].trim().slice(0, 240);
  }
  for (const key of NUMBER_KEYS) {
    const value = Number(raw[key]);
    if (Number.isFinite(value) && value >= 0) data[key] = Math.min(Math.round(value), 24 * 60 * 60 * 1000);
  }
  for (const key of BOOLEAN_KEYS) {
    if (typeof raw[key] === "boolean") data[key] = raw[key];
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) delete data.email;
  if (data.email) data.email = data.email.toLowerCase();
  return data;
}

/** Browser-reported checkout steps. The Checkout Session id is the capability: only this buyer has it. */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sessionId = String(req.body?.sessionId || "");
  const step = String(req.body?.step || "");
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId) || !CLIENT_CHECKOUT_STEPS.has(step)) {
    return res.status(400).json({ ok: false });
  }

  const delay = Math.min(Math.max(Number(req.body?.delayMs) || 0, 0), 120_000);
  const data = cleanData(req.body?.data);
  await recordCheckoutStep({
    sessionId,
    step,
    data,
    at: new Date(Date.now() - delay),
    set: step === "submit" && data.email ? { contactEmail: data.email } : {},
  });
  res.status(204).end();
}
