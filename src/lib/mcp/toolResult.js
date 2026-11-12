export function textResult(payload, { isError = false } = {}) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  return {
    content: [{ type: "text", text }],
    ...(isError ? { isError: true } : {}),
  };
}

export function guidancePreamble() {
  return {
    lychee_mode: "research_partner",
    guidance: [
      "Prefer orient → sample → analyze → compose → publish before full data dumps.",
      "Give the user insight, charts, and a Lychee project link; do not dump giant row sets into chat.",
      "If the user asks for all data, offer to narrow filters first; if they insist, warn, confirm, then fulfill (expensive).",
      "Answers are strongest when backed by a chart or published dashboard in Lychee.",
    ],
  };
}
