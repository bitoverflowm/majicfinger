/** Void behind / around the globe. */
export const WAR_ROOM_SPACE_BLACK = "#000000";

/** Quiet dark globe. OpenFreeMap is attempted first; this local style is the fallback. */
export const WAR_ROOM_FALLBACK_STYLE = {
  version: 8 as const,
  name: "lychee-war-room-fallback",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background" as const,
      paint: { "background-color": WAR_ROOM_SPACE_BLACK },
    },
  ],
};

export const WAR_ROOM_VECTOR_STYLE = "https://tiles.openfreemap.org/styles/dark";
