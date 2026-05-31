const INTERACTIVE_SELECTOR =
  "a[href], button, input[type='submit'], input[type='button'], [role='button'], [role='link'], summary, label";

/**
 * @param {MouseEvent} event
 * @returns {{ label: string; targetType: string; href?: string; section?: string } | null}
 */
export function extractClickTargetFromEvent(event) {
  if (!(event.target instanceof Element)) return null;

  const el = event.target.closest(INTERACTIVE_SELECTOR);
  if (!el) return null;

  const tag = el.tagName.toLowerCase();
  let targetType = tag;
  if (el.getAttribute("role") === "button") targetType = "button";
  if (el.getAttribute("role") === "link") targetType = "link";

  const aria = el.getAttribute("aria-label")?.trim();
  const text = (el.textContent || "").replace(/\s+/g, " ").trim();
  const label = (aria || text || el.getAttribute("title") || el.getAttribute("name") || tag).slice(
    0,
    120,
  );

  const href =
    tag === "a" && el instanceof HTMLAnchorElement && el.href
      ? el.href
      : el.getAttribute("href") || undefined;

  const sectionEl = el.closest("section[id], [data-section], main > div[id]");
  const section =
    sectionEl?.getAttribute("id") ||
    sectionEl?.getAttribute("data-section") ||
    undefined;

  return { label, targetType, href, section };
}
