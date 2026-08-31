/**
 * Shared entry for adding a new empty data sheet inside Connect home.
 *
 * Intended callers (same behavior eventually):
 * - Workspace nav “Add sheet” icon (`ConnectHomeWorkspaceNav`)
 * - Connect hub “Start from blank” when user already has a project open
 *
 * Implementation is intentionally deferred — wire `ctx` actions here once
 * interaction is defined.
 *
 * @param {object} [_ctx] Connect state / actions from `useMyStateV2` (TBD)
 * @returns {void}
 */
export function connectHomeAddBlankSheet(_ctx) {
  // No-op until product interaction is specified.
}
