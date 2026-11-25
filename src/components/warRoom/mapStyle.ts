/** Void behind / around the globe (dark theme). */
export const WAR_ROOM_SPACE_BLACK = "#000000";

/** Soft void for light theme globe (no black fog wash). */
export const WAR_ROOM_SPACE_LIGHT = "#e8eef5";

/** Quiet dark globe. OpenFreeMap is attempted first; this local style is the fallback. */
export const WAR_ROOM_FALLBACK_STYLE_DARK = {
  version: 8 as const,
  name: "lychee-war-room-fallback-dark",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background" as const,
      paint: { "background-color": WAR_ROOM_SPACE_BLACK },
    },
  ],
};

export const WAR_ROOM_FALLBACK_STYLE_LIGHT = {
  version: 8 as const,
  name: "lychee-war-room-fallback-light",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background" as const,
      paint: { "background-color": WAR_ROOM_SPACE_LIGHT },
    },
  ],
};

/** @deprecated Prefer theme-aware fallbacks. */
export const WAR_ROOM_FALLBACK_STYLE = WAR_ROOM_FALLBACK_STYLE_DARK;

/** OpenFreeMap vector styles — dark for night chrome, liberty for light. */
export const WAR_ROOM_VECTOR_STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";
export const WAR_ROOM_VECTOR_STYLE_LIGHT = "https://tiles.openfreemap.org/styles/liberty";

/** @deprecated Prefer WAR_ROOM_VECTOR_STYLE_DARK. */
export const WAR_ROOM_VECTOR_STYLE = WAR_ROOM_VECTOR_STYLE_DARK;

export function warRoomVectorStyle(dark: boolean) {
  return dark ? WAR_ROOM_VECTOR_STYLE_DARK : WAR_ROOM_VECTOR_STYLE_LIGHT;
}

export function warRoomFallbackStyle(dark: boolean) {
  return dark ? WAR_ROOM_FALLBACK_STYLE_DARK : WAR_ROOM_FALLBACK_STYLE_LIGHT;
}

export function warRoomSpaceColor(dark: boolean) {
  return dark ? WAR_ROOM_SPACE_BLACK : WAR_ROOM_SPACE_LIGHT;
}
