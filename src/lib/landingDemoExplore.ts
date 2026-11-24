/** Homepage `#demo` explore tabs — self-contained flows, not the real dashboard shell. */
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
