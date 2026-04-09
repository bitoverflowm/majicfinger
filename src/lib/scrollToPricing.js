/**
 * Scrolls to the marketing pricing section when present; otherwise navigates to home #pricing.
 */
export function scrollToPricingSection() {
  if (typeof window === "undefined") return;
  const el = document.getElementById("pricing");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  window.location.assign(`${window.location.origin}/#pricing`);
}
