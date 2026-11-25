/**
 * Safe Node.contains.
 *
 * Window resize/scroll (capture), blur relatedTarget, and some pointer events
 * pass a non-Node as the event target. Node.contains then throws
 * "parameter 1 is not of type 'Node'".
 */
export function nodeContains(host, node) {
  if (typeof Node === "undefined") return false;
  return host instanceof Node && node instanceof Node && host.contains(node);
}
