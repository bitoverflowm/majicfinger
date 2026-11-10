/** Marks a visit to the projects page as the way into the app (sign-in, a Dashboard link). */
export const ENTRY_PARAM = "start";

/**
 * Where sign-in and Dashboard links go. Someone with saved work lands on their projects;
 * someone with nothing saved yet is sent on to the dashboard and its walkthrough.
 */
export const WORKSPACE_ENTRY_PATH = `/dashboard/projects?${ENTRY_PARAM}=1`;
