/** Quiet dark globe. OpenFreeMap is attempted first; this local style is the fallback. */
export const WAR_ROOM_FALLBACK_STYLE = {
  version: 8 as const,
  name: "lychee-war-room-fallback",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background" as const,
      paint: { "background-color": "#070b14" },
    },
  ],
};

export const WAR_ROOM_VECTOR_STYLE = "https://tiles.openfreemap.org/styles/dark";

export const WAR_ROOM_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OSM</a>';
