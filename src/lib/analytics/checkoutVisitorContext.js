import VisitorEvent from "@/models/VisitorEvent";
import VisitorSession from "@/models/VisitorSession";
import { formatJourneyStep } from "@/lib/analytics/formatJourneySummary";
import {
  formatReturningVisitorLine,
  lookupReturningVisitor,
} from "@/lib/analytics/returningVisitor";

const PRICING_NEEDLES = ["pricing", "checkout", "access now", "subscribe", "upgrade", "#pricing"];

/**
 * @param {{ type?: string; path?: string; label?: string; meta?: Record<string, unknown> }} event
 */
function eventTouchesPricing(event) {
  const meta = event.meta && typeof event.meta === "object" ? event.meta : {};
  const haystack = [
    event.type,
    event.path,
    event.label,
    meta.label,
    meta.href,
    meta.section,
    meta.destination,
    meta.pageName,
    meta.path,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return PRICING_NEEDLES.some((needle) => haystack.includes(needle));
}

/**
 * Snapshot the visitor's path so checkout Telegram alerts (including expire hours later)
 * still know where they came from and whether they hit pricing.
 * @param {string | undefined | null} visitorSessionId
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function buildCheckoutVisitorContext(visitorSessionId) {
  const sessionId = String(visitorSessionId || "").trim();
  if (!sessionId) return null;

  try {
    const [session, events] = await Promise.all([
      VisitorSession.findOne({ session_id: sessionId }).lean(),
      VisitorEvent.find({ session_id: sessionId }).sort({ ts: 1 }).limit(40).lean(),
    ]);

    if (!session && !events.length) return null;

    const pricingEvents = events.filter(eventTouchesPricing);
    const steps = events.slice(0, 20).map((event, i) => formatJourneyStep(event, i + 1));

    let returningVisitorLine = "";
    let returningVisitor = null;
    try {
      returningVisitor = await lookupReturningVisitor(VisitorSession, {
        sessionId,
        clientIp: session?.client_ip,
        visitorId: session?.visitor_id,
      });
      returningVisitorLine = formatReturningVisitorLine(returningVisitor) || "";
    } catch {
      /* best-effort */
    }

    return {
      visitorSessionId: sessionId,
      entryPath: session?.entry_path || "",
      entryUrl: session?.entry_url || "",
      referrer: session?.referrer || "",
      email: session?.email || "",
      isLoggedIn: !!session?.is_logged_in || !!session?.email,
      pageName: session?.page_name || "",
      utmSource: session?.utm_source || "",
      utmMedium: session?.utm_medium || "",
      utmCampaign: session?.utm_campaign || "",
      sawPricing: pricingEvents.length > 0,
      pricingHints: pricingEvents.slice(0, 5).map((event) => {
        const meta = event.meta && typeof event.meta === "object" ? event.meta : {};
        return (
          meta.label ||
          event.label ||
          meta.section ||
          meta.href ||
          event.path ||
          event.type
        );
      }),
      steps,
      eventCount: events.length,
      returningVisitorLine,
      isReturning: !!returningVisitor?.isReturning,
      visitNumber: returningVisitor?.visitNumber || 1,
      priorVisitsByIp: returningVisitor?.priorByIp || 0,
      capturedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[checkout] visitor context snapshot failed:", err?.message || err);
    return null;
  }
}

/**
 * HTML lines for the checkout Telegram message.
 * @param {Record<string, unknown> | null | undefined} context
 * @param {(value: string) => string} escapeHtml
 */
export function formatVisitorContextTelegramLines(context, escapeHtml) {
  if (!context || typeof context !== "object") return [];

  const lines = ["<b>Before checkout</b>"];
  const field = (label, value) => {
    if (value == null || value === "" || value === false) return;
    lines.push(`<b>${escapeHtml(label)}:</b> ${escapeHtml(String(value))}`);
  };

  field("Entry", context.entryPath);
  field("Referrer", context.referrer);
  field("Visitor email", context.email);
  if (context.isLoggedIn || context.email) field("Logged in", "yes");
  field("Visitor", context.returningVisitorLine);
  if (context.utmSource || context.utmMedium || context.utmCampaign) {
    field(
      "UTM",
      [context.utmSource, context.utmMedium, context.utmCampaign].filter(Boolean).join(" / "),
    );
  }
  field("Saw pricing", context.sawPricing ? "yes" : "no evidence in this session");
  if (Array.isArray(context.pricingHints) && context.pricingHints.length) {
    field("Pricing signals", context.pricingHints.slice(0, 3).join(" · "));
  }

  if (Array.isArray(context.steps) && context.steps.length) {
    lines.push("", "<b>Visitor path</b>");
    const shown = context.steps.slice(0, 12);
    for (const step of shown) {
      lines.push(escapeHtml(String(step)));
    }
    const total = Number(context.eventCount) || context.steps.length;
    if (total > shown.length) {
      lines.push(escapeHtml(`… and ${total - shown.length} more steps`));
    }
  } else {
    lines.push("<i>No visitor journey events were captured before checkout.</i>");
  }

  return lines;
}
