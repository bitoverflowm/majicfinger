/**
 * When a public chart/dashboard is shown inside a guide iframe, same-origin links
 * must not use default navigation (that only replaces iframe content).
 */
export function publicEmbedOutboundLinkProps(isEmbedded: boolean) {
  if (!isEmbedded) return {};
  return {
    target: "_blank" as const,
    rel: "noopener noreferrer",
  };
}
