import { BLACK_FRIDAY } from "@/lib/promo/blackFriday";
import { JARVIS_MONTHLY_TOKENS, landingPageV2Config } from "@/lib/landingPageV2Config";

/** Months of Jarvis usage granted at launch for a qualifying purchase. */
export const JARVIS_LAUNCH_FREE_MONTHS = 3;

export const JARVIS_PROMO = {
  href: "/jarvis",
  checkoutHref: landingPageV2Config.mcpPrereg?.href || "/checkout?plan=mcp_prereg",
  price: landingPageV2Config.mcpPrereg?.price || "$49",
  title: "Jarvis is coming to every plan",
  subtitle: "Your AI chat, watching Polymarket and Kalshi for you.",
  body: "Every paid Lychee plan includes Jarvis when it launches.",
  tokensLine: `Each month Lite accrues ${JARVIS_MONTHLY_TOKENS.lite} tokens, Pro ${JARVIS_MONTHLY_TOKENS.researcher}, and Max ${JARVIS_MONTHLY_TOKENS.quant}.`,
  blackFridayLine: `${BLACK_FRIDAY.name}: ${BLACK_FRIDAY.percentOff}% off every annual plan, plus ${JARVIS_LAUNCH_FREE_MONTHS} months of free Jarvis at launch.`,
  meetCta: "Meet Jarvis",
  plansCta: "See plans",
  preregCta: landingPageV2Config.mcpPrereg?.buttonText || "Preregister · $49",
};
