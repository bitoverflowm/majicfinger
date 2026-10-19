export const OPEN_BILLING_EVENT = "lychee:open-billing";

/**
 * Inside the dashboard, opens the billing view (plans, current tier). Elsewhere,
 * scrolls to the marketing pricing section when present; otherwise navigates to home #pricing.
 */
export function scrollToPricingSection() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/dashboard")) {
    window.dispatchEvent(new CustomEvent(OPEN_BILLING_EVENT));
    return;
  }
  const el = document.getElementById("pricing");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  window.location.assign(`${window.location.origin}/#pricing`);
}
