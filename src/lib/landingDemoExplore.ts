/**
 * Homepage `#demo` explore tabs — closed rigid loop (not WorkspaceTabsLayer empty chrome
 * or the signed-in dashboard shell). See docs/projects-shell-nav-spec.md § Homepage demo.
 */
export type LandingDemoExploreSurface = "historical" | "present" | "markets" | "holders";

export function isLandingExploreSurface(
  surface: unknown,
): surface is LandingDemoExploreSurface {
  return (
    surface === "historical" ||
    surface === "present" ||
    surface === "markets" ||
    surface === "holders"
  );
}

/** Historical / Present connect surfaces — Back reopens the integration picker. */
export function isLandingConnectExploreSurface(
  surface: unknown,
): surface is "historical" | "present" {
  return surface === "historical" || surface === "present";
}

/** Markets / Holders terminal surfaces — no dashboard shell. */
export function isLandingTerminalExploreSurface(
  surface: unknown,
): surface is "markets" | "holders" {
  return surface === "markets" || surface === "holders";
}
