const MEANINGFUL_EVENT_TYPES = new Set([
  "signup",
  "hero_cta_click",
  "fork_click",
  "query_submit",
  "query_error",
  "pricing_click",
  "checkout_click",
]);

/** @param {{ type?: string; label?: string; meta?: Record<string, unknown> }} event */
function isHighIntentPageClick(event) {
  if (event.type !== "page_click") return false;
  const meta = event.meta && typeof event.meta === "object" ? event.meta : {};
  const label = String(meta.label || event.label || "").toLowerCase();
  const href = String(meta.href || "").toLowerCase();
  const section = String(meta.section || "").toLowerCase();
  const destination = String(meta.destination || "").toLowerCase();

  const needles = [
    "pricing",
    "checkout",
    "access now",
    "explore for free",
    "view pricing",
    "stripe",
    "subscribe",
    "upgrade",
  ];

  return needles.some(
    (needle) =>
      label.includes(needle) ||
      href.includes(needle) ||
      section.includes(needle) ||
      destination.includes(needle),
  );
}

/**
 * Whether a visitor session produced a high-intent signal worth a summary alert.
 * @param {Array<{ type?: string; label?: string; meta?: Record<string, unknown> }>} events
 */
export function hasMeaningfulVisitorOutcome(events = []) {
  return events.some((event) => {
    if (!event?.type) return false;
    if (MEANINGFUL_EVENT_TYPES.has(event.type)) return true;
    return isHighIntentPageClick(event);
  });
}

/** @param {string | undefined | null} reason */
export function wasVisitorStartTelegramSuppressed(reason) {
  return reason === "start_dedupe" || reason === "ip_dedupe";
}
