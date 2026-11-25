/** Void behind / around the globe (dark theme). */
export const WAR_ROOM_SPACE_BLACK = "#000000";

/**
 * Soft void for light theme — Magic UI globe palette
 * (https://magicui.design/docs/components/globe): pearly land, muted ocean, white glow.
 */
export const WAR_ROOM_SPACE_LIGHT = "#f4f5f7";

/** Soft land (near-white, slight warm). */
export const WAR_ROOM_LIGHT_LAND = "#f7f7f5";
/** Soft ocean / water fill. */
export const WAR_ROOM_LIGHT_WATER = "#c5ccd4";
/** Soft ice / wetland accents. */
export const WAR_ROOM_LIGHT_ICE = "#e8eef2";
/** Soft wood / park mute. */
export const WAR_ROOM_LIGHT_GREEN = "#dde3dc";
/** Soft residential / built mute. */
export const WAR_ROOM_LIGHT_BUILT = "#ebebe8";
/** Boundary hairlines. */
export const WAR_ROOM_LIGHT_BOUNDARY = "rgba(120, 128, 140, 0.35)";

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
      paint: { "background-color": WAR_ROOM_LIGHT_LAND },
    },
  ],
};

/** @deprecated Prefer theme-aware fallbacks. */
export const WAR_ROOM_FALLBACK_STYLE = WAR_ROOM_FALLBACK_STYLE_DARK;

/**
 * OpenFreeMap vector styles.
 * Light uses Positron — quieter than liberty, closer to Magic UI soft monochrome.
 */
export const WAR_ROOM_VECTOR_STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";
export const WAR_ROOM_VECTOR_STYLE_LIGHT = "https://tiles.openfreemap.org/styles/positron";

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

type PaintMap = {
  getStyle?: () => { layers?: Array<{ id?: string; type?: string }> } | undefined;
  setPaintProperty?: (id: string, name: string, value: unknown) => void;
  setLayoutProperty?: (id: string, name: string, value: unknown) => void;
  setFog?: (fog: Record<string, unknown>) => void;
};

/**
 * Restyle Positron (or fallback) toward Magic UI light globe: soft land/ocean + white atmosphere.
 * Keeps vector detail, labels, and custom War Room pin layers intact.
 */
export function applyWarRoomLightBasemapChrome(map: PaintMap) {
  const style = map.getStyle?.();
  for (const layer of style?.layers || []) {
    const id = layer?.id;
    if (!id || id.startsWith("wr-")) continue;
    const type = layer.type;
    const key = id.toLowerCase();

    try {
      if (type === "background") {
        map.setPaintProperty?.(id, "background-color", WAR_ROOM_LIGHT_LAND);
        continue;
      }

      if (type === "fill") {
        if (key.includes("water") && !key.includes("label")) {
          map.setPaintProperty?.(id, "fill-color", WAR_ROOM_LIGHT_WATER);
        } else if (key.includes("ice") || key.includes("glacier") || key.includes("wetland")) {
          map.setPaintProperty?.(id, "fill-color", WAR_ROOM_LIGHT_ICE);
        } else if (
          key.includes("wood") ||
          key.includes("grass") ||
          key.includes("park") ||
          key.includes("forest") ||
          key.includes("landcover")
        ) {
          map.setPaintProperty?.(id, "fill-color", WAR_ROOM_LIGHT_GREEN);
          map.setPaintProperty?.(id, "fill-opacity", 0.35);
        } else if (
          key.includes("residential") ||
          key.includes("building") ||
          key.includes("landuse") ||
          key.includes("industrial") ||
          key.includes("commercial")
        ) {
          map.setPaintProperty?.(id, "fill-color", WAR_ROOM_LIGHT_BUILT);
          map.setPaintProperty?.(id, "fill-opacity", 0.45);
        }
        continue;
      }

      if (type === "line") {
        if (key.includes("water")) {
          map.setPaintProperty?.(id, "line-color", WAR_ROOM_LIGHT_WATER);
        } else if (key.includes("bound")) {
          map.setPaintProperty?.(id, "line-color", WAR_ROOM_LIGHT_BOUNDARY);
          map.setPaintProperty?.(id, "line-opacity", 0.45);
        } else if (
          key.includes("road") ||
          key.includes("highway") ||
          key.includes("transit") ||
          key.includes("rail") ||
          key.includes("bridge") ||
          key.includes("tunnel")
        ) {
          // Quiet streets at globe zoom — detail returns as you zoom in via width, not chroma.
          map.setPaintProperty?.(id, "line-opacity", 0.25);
          map.setPaintProperty?.(id, "line-color", "#c8ccd2");
        }
        continue;
      }

      if (type === "symbol") {
        // Keep place/road labels; nudge to soft dark ink on pearly land.
        if (key.includes("water")) {
          map.setPaintProperty?.(id, "text-color", "#6b7a8c");
          map.setPaintProperty?.(id, "text-halo-color", "rgba(255,255,255,0.9)");
        } else {
          try {
            map.setPaintProperty?.(id, "text-halo-color", "rgba(255,255,255,0.85)");
            map.setPaintProperty?.(id, "text-halo-width", 1.25);
          } catch {
            /* layer may omit text paint */
          }
        }
      }
    } catch {
      /* paint prop may not exist on this layer */
    }
  }

  try {
    // Soft white atmosphere / limb glow (Magic UI glowColor ≈ white).
    map.setFog?.({
      color: "#ffffff",
      "high-color": "#eef2f6",
      "space-color": WAR_ROOM_SPACE_LIGHT,
      "horizon-blend": 0.18,
      "star-intensity": 0,
      range: [0.5, 10],
    });
  } catch {
    /* older MapLibre without fog */
  }
}
