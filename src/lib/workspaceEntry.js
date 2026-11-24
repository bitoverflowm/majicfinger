/** Marks a visit to the projects page as the way into the app (sign-in, a Dashboard link). */
export const ENTRY_PARAM = "start";

/**
 * Where sign-in and Dashboard links go. First-time and returning users land on
 * Projects / Recents — not the blank dashboard canvas.
 */
export const WORKSPACE_ENTRY_PATH = `/dashboard/projects?${ENTRY_PARAM}=1`;
