/**
 * Smooth-scroll to a same-page section by hash id.
 * Next.js client navigation often skips native hash scroll; this matches DemoScrollLink behavior.
 *
 * @param {string} hash - e.g. "#explore-data"
 * @param {{ behavior?: ScrollBehavior }} [options]
 */
export function scrollToHashSection(hash, { behavior = "smooth" } = {}) {
  if (typeof window === "undefined") return;

  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!id) return;

  const el = document.getElementById(id);
  if (!el) return;

  el.scrollIntoView({ behavior, block: "start" });

  const nextUrl = `${window.location.pathname}#${id}`;
  if (window.location.hash !== `#${id}` && history.replaceState) {
    history.replaceState(null, "", nextUrl);
  }
}
