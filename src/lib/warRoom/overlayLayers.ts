/**
 * Map overlay groups for the War Room layers rail (Osiris-style toggles).
 * Wired to future data-source integrations — all gated for now.
 */

export type OverlayLayer = { id: string; label: string };
export type OverlayGroup = { id: string; label: string; layers: OverlayLayer[] };

export const WAR_ROOM_OVERLAY_GROUPS: OverlayGroup[] = [
  {
    id: "weather",
    label: "Weather",
    layers: [
      { id: "wind", label: "Wind" },
      { id: "rain", label: "Rain" },
      { id: "temperature", label: "Temperature" },
    ],
  },
  {
    id: "hazards",
    label: "Natural Hazards",
    layers: [
      { id: "earthquakes", label: "Earthquakes" },
      { id: "fires", label: "Active Fires" },
      { id: "severe_weather", label: "Severe Weather" },
    ],
  },
  {
    id: "intel",
    label: "Threats & Intel",
    layers: [
      { id: "conflicts", label: "Conflicts" },
      { id: "threats", label: "Threats" },
      { id: "live_alerts", label: "Live Alerts" },
      { id: "global_incidents", label: "Global Incidents" },
    ],
  },
  {
    id: "monitor",
    label: "Monitor",
    layers: [
      { id: "cctv", label: "CCTV" },
      { id: "satellite", label: "Satellite Feeds" },
    ],
  },
];

/** Empty enabled set — overlays are gated until integrations ship. */
export function emptyOverlaySelection(): Record<string, boolean> {
  return {};
}
