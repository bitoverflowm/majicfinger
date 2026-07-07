import { GUIDED_TARGET_ATTR, type GuidedTargetId } from "@/lib/guidedWorkflows/types";

export function findGuidedTargetElement(targetId: GuidedTargetId): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const escaped = CSS.escape(targetId);
  return document.querySelector(`[${GUIDED_TARGET_ATTR}="${escaped}"]`);
}

export function scrollGuidedTargetIntoView(el: HTMLElement | null) {
  if (!el || typeof window === "undefined") return;
  el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
}

export function getGuidedTargetRect(targetId: GuidedTargetId): DOMRect | null {
  const el = findGuidedTargetElement(targetId);
  if (!el) return null;
  return el.getBoundingClientRect();
}
