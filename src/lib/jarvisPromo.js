import { BLACK_FRIDAY } from "@/lib/promo/blackFriday";
import { landingPageV2Config } from "@/lib/landingPageV2Config";

/** Months of Jarvis usage granted at launch for a qualifying purchase. */
export const JARVIS_LAUNCH_FREE_MONTHS = 3;

export const JARVIS_PROMO = {
  href: "/jarvis",
  checkoutHref: landingPageV2Config.mcpPrereg?.href || "/checkout?plan=mcp_prereg",
  price: landingPageV2Config.mcpPrereg?.price || "$49",
  badge: "Coming",
  blackFridayBadge: `Included in ${BLACK_FRIDAY.name}`,
  title: "Jarvis is coming",
  subtitle: "Your AI chat, watching Polymarket and Kalshi for you.",
  body: `Preorder Jarvis or buy during the ${BLACK_FRIDAY.name} and you get ${JARVIS_LAUNCH_FREE_MONTHS} months of free Jarvis usage when it launches.`,
  blackFridayLine: `Jarvis is included in the ${BLACK_FRIDAY.name} — ${BLACK_FRIDAY.percentOff}% off every annual plan, plus ${JARVIS_LAUNCH_FREE_MONTHS} months of free Jarvis at launch.`,
  meetCta: "Meet Jarvis",
  preregCta: landingPageV2Config.mcpPrereg?.buttonText || "Preregister · $49",
};
