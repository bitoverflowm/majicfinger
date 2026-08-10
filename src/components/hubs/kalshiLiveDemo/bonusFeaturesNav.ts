export type HubKalshiLiveBonusFeatureId =
  | "event_forecasts"
  | "batch_candlesticks"
  | "leaderboards";

export const HUB_KALSHI_BONUS_SECTION_ID = "bonus-features";
export const HUB_KALSHI_BONUS_TAB_EVENT = "hub-kalshi-bonus-tab";
export const HUB_KALSHI_BONUS_TAB_STORAGE_KEY = "hub-kalshi-bonus-tab";

export function navigateToKalshiBonusFeature(
  featureId: HubKalshiLiveBonusFeatureId,
) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(HUB_KALSHI_BONUS_TAB_STORAGE_KEY, featureId);
  } catch {
    // ignore
  }
  window.dispatchEvent(
    new CustomEvent(HUB_KALSHI_BONUS_TAB_EVENT, { detail: featureId }),
  );
  const el = document.getElementById(HUB_KALSHI_BONUS_SECTION_ID);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    window.location.hash = HUB_KALSHI_BONUS_SECTION_ID;
  }
}
