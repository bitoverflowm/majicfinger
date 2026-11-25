"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./war-room-globe.css";

import { MAP_UPDATE_CADENCE_MS } from "@/lib/warRoom/constants";
import { cn } from "@/lib/utils";

import {
  applyWarRoomLightBasemapChrome,
  warRoomFallbackStyle,
  warRoomSpaceColor,
  warRoomVectorStyle,
} from "./mapStyle";
import { useWarRoomTheme } from "./useWarRoomTheme";

function stripAttribution(map: { getContainer?: () => HTMLElement }) {
  const root = map.getContainer?.();
  if (!root) return;
  root.querySelectorAll(".maplibregl-ctrl-attrib, .maplibregl-ctrl-logo").forEach((node) => node.remove());
}

type FeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id?: string;
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: Record<string, unknown>;
  }>;
};

export type WarRoomGlobeProps = {
  features: FeatureCollection | null;
  /** Transient news / event pings (separate layer + color). */
  pings?: FeatureCollection | null;
  selectedMarketId?: string | null;
  /** Fly the camera here (trade / news / market click). */
  focusTarget?: {
    center: [number, number];
    zoom?: number;
    pitch?: number;
    bearing?: number;
    key?: string | number;
  } | null;
  /** Screen coords of the focused ping, relative to the map container. */
  onAnchorChange?: (point: { x: number; y: number } | null) => void;
  /** Market or news ping selection from the globe. */
  onSelect?: (selection: { id: string; kind: "market" | "news" }) => void;
  onFail?: () => void;
  className?: string;
  interactive?: boolean;
  initialCenter?: [number, number] | null;
  /** Homepage: stay zoomed out so the globe stays visible even with a user location. */
  keepGlobe?: boolean;
  /** Increment to ease the camera back to the opening globe framing. */
  resetNonce?: number;
};

/** Opening camera — shared by mount + the War Room reset control. */
export const WAR_ROOM_HOME_CENTER: [number, number] = [-40, 28];
export function warRoomHomeZoom(keepGlobe: boolean) {
  return keepGlobe ? 1.55 : 1.35;
}

const SOURCE_ID = "war-room-markets";
const PING_SOURCE_ID = "war-room-pings";
const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

function asCollection(input: FeatureCollection | FeatureCollection["features"] | null | undefined): FeatureCollection {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const collection = input as FeatureCollection;
    if (collection.type === "FeatureCollection" && Array.isArray(collection.features)) {
      return collection;
    }
  }
  if (Array.isArray(input)) return { type: "FeatureCollection", features: input };
  return EMPTY;
}
/** Prefer news first; wr-hit is an oversized invisible target so labels/dots stay clickable. */
const HIT_LAYERS = [
  "wr-news-points",
  "wr-news-halo",
  "wr-hit",
  "wr-labels",
  "wr-points",
  "wr-selected",
  "wr-halo",
] as const;
const HIT_PAD_PX = 36;

function pickHit(
  map: import("maplibre-gl").Map,
  point: { x: number; y: number },
): { id: string; kind: "market" | "news" } | null {
  const layers = HIT_LAYERS.filter((id) => Boolean(map.getLayer(id)));
  if (!layers.length) return null;
  const bbox: [[number, number], [number, number]] = [
    [point.x - HIT_PAD_PX, point.y - HIT_PAD_PX],
    [point.x + HIT_PAD_PX, point.y + HIT_PAD_PX],
  ];
  const hits = map.queryRenderedFeatures(bbox, { layers: [...layers] });
  for (const feature of hits) {
    const id = feature?.properties?.id;
    if (id == null || id === "") continue;
    const layerId = String(feature.layer?.id || "");
    const kind = layerId.startsWith("wr-news") ? "news" : "market";
    return { id: String(id), kind };
  }
  return null;
}

function applyProjection(map: {
  setProjection?: (p: { type: string }) => void;
}) {
  try {
    map.setProjection?.({ type: "globe" });
  } catch {
    /* older MapLibre without globe */
  }
}

export function WarRoomGlobe({
  features,
  pings = null,
  selectedMarketId,
  focusTarget = null,
  onAnchorChange,
  onSelect,
  onFail,
  className,
  interactive = true,
  initialCenter = null,
  keepGlobe = false,
  resetNonce = 0,
}: WarRoomGlobeProps) {
  const { dark } = useWarRoomTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;
  const onAnchorChangeRef = useRef(onAnchorChange);
  onAnchorChangeRef.current = onAnchorChange;
  const focusLngLatRef = useRef<[number, number] | null>(null);
  const centerRef = useRef(initialCenter);
  centerRef.current = initialCenter;
  const pendingRef = useRef<FeatureCollection>(asCollection(features));
  const pendingPingsRef = useRef<FeatureCollection>(asCollection(pings));
  const knownIdsRef = useRef<Set<string>>(new Set());
  const selectedRef = useRef(selectedMarketId);
  selectedRef.current = selectedMarketId;
  const darkRef = useRef(dark);
  darkRef.current = dark;
  const styleReadyRef = useRef(false);
  const flushTimer = useRef<number | null>(null);
  const focusKeyRef = useRef<string | number | null>(null);

  useEffect(() => {
    pendingRef.current = asCollection(features);
    pendingPingsRef.current = asCollection(pings);
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as { setData?: (d: FeatureCollection) => void } | undefined;
    const pingSource = map.getSource(PING_SOURCE_ID) as { setData?: (d: FeatureCollection) => void } | undefined;
    if (!source?.setData) return;
    if (flushTimer.current) return;
    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = null;
      const next = asCollection(pendingRef.current);
      const rows = Array.isArray(next.features) ? next.features : [];
      const nextIds = new Set(rows.map((f) => String(f.properties?.id || f.id || "")));
      const entering = [...nextIds].filter((id) => id && !knownIdsRef.current.has(id));
      knownIdsRef.current = nextIds;
      source.setData?.(next);
      pingSource?.setData?.(asCollection(pendingPingsRef.current));
      if (selectedRef.current) {
        try {
          map.setFilter("wr-selected", ["==", ["get", "id"], selectedRef.current]);
        } catch {
          /* layer may not exist yet */
        }
      }
      for (const id of entering) {
        try {
          map.setFeatureState({ source: SOURCE_ID, id }, { pulse: 1 });
          window.setTimeout(() => {
            try {
              map.setFeatureState({ source: SOURCE_ID, id }, { pulse: 0 });
            } catch {
              /* gone */
            }
          }, 900);
        } catch {
          /* promoteId may not be ready */
        }
      }
    }, MAP_UPDATE_CADENCE_MS);
  }, [features, pings, selectedMarketId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let map: import("maplibre-gl").Map | null = null;
    let hiddenHandler: (() => void) | null = null;
    let reduceMotion = false;
    if (typeof window !== "undefined") {
      reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    (async () => {
      const mod = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;

      const maplibregl = /** @type {typeof import("maplibre-gl")} */ (
        mod.default?.Map ? mod.default : mod
      );
      const start = async (style: string | object) => {
        const startCenter = centerRef.current || WAR_ROOM_HOME_CENTER;
        const globeZoom = keepGlobe
          ? warRoomHomeZoom(true)
          : centerRef.current
            ? 3.2
            : warRoomHomeZoom(false);
        const instance = new maplibregl.Map({
          container: containerRef.current as HTMLDivElement,
          style: style as never,
          center: startCenter,
          zoom: globeZoom,
          pitch: 0,
          bearing: 0,
          attributionControl: false,
          maplibreLogo: false,
          interactive,
          fadeDuration: reduceMotion ? 0 : 300,
          canvasContextAttributes: { antialias: true },
        });
        // Homepage embedded globe: scrollZoom only while the explore stage is
        // scroll-locked (click/focus). Unlocked → page keeps the wheel; drag still pans.
        if (keepGlobe && interactive) {
          try {
            const locked =
              containerRef.current?.closest?.("[data-landing-demo-locked='1']") != null;
            if (locked) instance.scrollZoom?.enable?.();
            else instance.scrollZoom?.disable?.();
          } catch {
            /* older MapLibre */
          }
        }
        stripAttribution(instance);
        instance.on("style.load", () => {
          stripAttribution(instance);
          applyProjection(instance);
          const isDark = darkRef.current;
          const space = warRoomSpaceColor(isDark);
          if (isDark) {
            try {
              const style = instance.getStyle?.();
              for (const layer of style?.layers || []) {
                if (layer?.type === "background" && layer.id) {
                  instance.setPaintProperty(layer.id, "background-color", space);
                }
              }
            } catch {
              /* style may omit a background layer */
            }
            try {
              instance.setFog?.({
                color: space,
                "high-color": space,
                "space-color": space,
                "horizon-blend": 0.02,
                "star-intensity": 0,
              });
            } catch {
              /* older MapLibre without fog */
            }
          } else {
            // Soft land/ocean + white atmosphere (Magic UI light globe palette).
            applyWarRoomLightBasemapChrome(instance);
          }
          if (!instance.getSource(SOURCE_ID)) {
            instance.addSource(SOURCE_ID, {
              type: "geojson",
              data: pendingRef.current,
              promoteId: "id",
            });
            // Invisible oversized hit target — dots/labels are small; clicks need a fat target.
            instance.addLayer({
              id: "wr-hit",
              type: "circle",
              source: SOURCE_ID,
              paint: {
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  1,
                  14,
                  4,
                  16,
                  7,
                  18,
                ],
                "circle-color": "#000000",
                "circle-opacity": 0,
                "circle-stroke-width": 0,
              },
            });
            // Dense borderless dots — Kalshi green / Polymarket blue / soft pulse halo only.
            instance.addLayer({
              id: "wr-halo",
              type: "circle",
              source: SOURCE_ID,
              paint: {
                "circle-radius": ["case", ["==", ["feature-state", "pulse"], 1], 10, 5],
                "circle-color": [
                  "match",
                  ["get", "venue"],
                  "kalshi",
                  "#28CC95",
                  "polymarket",
                  "#2E5CFF",
                  "#60a5fa",
                ],
                "circle-opacity": ["case", ["==", ["feature-state", "pulse"], 1], 0.28, 0.1],
                "circle-stroke-width": 0,
              },
            });
            instance.addLayer({
              id: "wr-points",
              type: "circle",
              source: SOURCE_ID,
              paint: {
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  1,
                  ["case", ["==", ["feature-state", "pulse"], 1], 4.2, 3.2],
                  4,
                  ["case", ["==", ["feature-state", "pulse"], 1], 6, 4.2],
                  7,
                  ["case", ["==", ["feature-state", "pulse"], 1], 8, 5.5],
                ],
                "circle-color": [
                  "match",
                  ["get", "venue"],
                  "kalshi",
                  "#28CC95",
                  "polymarket",
                  "#2E5CFF",
                  "#60a5fa",
                ],
                "circle-opacity": 0.92,
                // Light basemap: thin white ring so venue colors stay readable on land.
                "circle-stroke-width": isDark ? 0 : 1.25,
                "circle-stroke-color": "#ffffff",
              },
            });
            instance.addLayer({
              id: "wr-selected",
              type: "circle",
              source: SOURCE_ID,
              filter: ["==", ["get", "id"], selectedRef.current || ""],
              paint: {
                "circle-radius": 7,
                "circle-color": [
                  "match",
                  ["get", "venue"],
                  "kalshi",
                  "#28CC95",
                  "polymarket",
                  "#2E5CFF",
                  "#60a5fa",
                ],
                "circle-opacity": 0.22,
                "circle-stroke-width": 0,
              },
            });
            instance.addLayer({
              id: "wr-labels",
              type: "symbol",
              source: SOURCE_ID,
              minzoom: 3.2,
              layout: {
                "text-field": ["get", "title"],
                "text-size": 10,
                "text-offset": [0, 1.05],
                "text-anchor": "top",
                "text-max-width": 12,
                "text-optional": true,
              },
              paint: {
                "text-color": isDark ? "#e2e8f0" : "#0f172a",
                "text-halo-color": isDark ? warRoomSpaceColor(true) : "#ffffff",
                "text-halo-width": isDark ? 1 : 1.5,
                "text-opacity": 0.9,
              },
            });
            instance.addSource(PING_SOURCE_ID, {
              type: "geojson",
              data: pendingPingsRef.current,
              promoteId: "id",
            });
            instance.addLayer({
              id: "wr-news-halo",
              type: "circle",
              source: PING_SOURCE_ID,
              paint: {
                "circle-radius": 7,
                "circle-color": "#fb7185",
                "circle-opacity": 0.22,
                "circle-stroke-width": 0,
              },
            });
            instance.addLayer({
              id: "wr-news-points",
              type: "circle",
              source: PING_SOURCE_ID,
              paint: {
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  1,
                  2.4,
                  4,
                  3.2,
                  7,
                  4,
                ],
                "circle-color": "#f43f5e",
                "circle-opacity": 0.95,
                "circle-stroke-width": 0,
              },
            });
          }
        });
        instance.on("click", (e) => {
          if (!interactive) return;
          const hit = pickHit(instance, e.point);
          if (hit) onSelectRef.current?.(hit);
        });
        instance.on("mousemove", (e) => {
          if (!interactive) return;
          const hit = pickHit(instance, e.point);
          instance.getCanvas().style.cursor = hit ? "pointer" : "";
        });
        instance.on("mouseleave", () => {
          instance.getCanvas().style.cursor = "";
        });
        instance.on("error", () => {
          /* tile errors stay quiet; feed remains usable */
        });
        hiddenHandler = () => {
          if (document.hidden) instance.stop();
          else (instance as { start?: () => void }).start?.();
        };
        document.addEventListener("visibilitychange", hiddenHandler);
        return instance;
      };

      try {
        const preferDark = darkRef.current;
        try {
          map = await start(warRoomVectorStyle(preferDark));
        } catch {
          map = await start(warRoomFallbackStyle(preferDark));
        }
        if (cancelled) {
          map?.remove();
          return;
        }
        mapRef.current = map;
        styleReadyRef.current = true;
      } catch (err) {
        console.warn("War Room globe failed; keeping poster", err);
        onFailRef.current?.();
      }
    })();

    return () => {
      cancelled = true;
      styleReadyRef.current = false;
      if (flushTimer.current) window.clearTimeout(flushTimer.current);
      if (hiddenHandler) document.removeEventListener("visibilitychange", hiddenHandler);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [interactive, keepGlobe]);

  // Swap OpenFreeMap basemap when next-themes resolves light ↔ dark.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    try {
      map.setStyle(warRoomVectorStyle(dark) as never);
    } catch {
      try {
        map.setStyle(warRoomFallbackStyle(dark) as never);
      } catch {
        /* ignore */
      }
    }
  }, [dark]);

  // Sync MapLibre scrollZoom with homepage explore scroll-lock (`data-landing-demo-locked`).
  useEffect(() => {
    if (!keepGlobe || !interactive) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const syncScrollZoom = () => {
      const map = mapRef.current;
      if (!map) return;
      const locked = container.closest("[data-landing-demo-locked='1']") != null;
      try {
        if (locked) map.scrollZoom?.enable?.();
        else map.scrollZoom?.disable?.();
      } catch {
        /* older MapLibre */
      }
    };

    syncScrollZoom();

    const onLockEvent = () => syncScrollZoom();
    document.addEventListener("landing-demo-scroll-lock", onLockEvent);

    const host =
      container.closest("[data-landing-demo-locked]") ||
      container.closest("#demo") ||
      container.parentElement;
    const observer =
      host && typeof MutationObserver !== "undefined"
        ? new MutationObserver(syncScrollZoom)
        : null;
    if (host && observer) {
      observer.observe(host, { attributes: true, attributeFilter: ["data-landing-demo-locked"] });
    }

    return () => {
      document.removeEventListener("landing-demo-scroll-lock", onLockEvent);
      observer?.disconnect();
    };
  }, [interactive, keepGlobe]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !initialCenter) return;
    try {
      map.easeTo({
        center: initialCenter,
        zoom: keepGlobe ? Math.min(map.getZoom(), 1.6) : Math.max(map.getZoom(), 3.2),
        duration: 800,
      });
    } catch {
      /* ignore */
    }
  }, [initialCenter, keepGlobe]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedMarketId) return;
    try {
      map.setFilter("wr-selected", ["==", ["get", "id"], selectedMarketId]);
    } catch {
      /* ignore */
    }
    const match = (features?.features || []).find((f) => String(f.properties?.id) === selectedMarketId);
    const coords = match?.geometry?.coordinates;
    if (coords && interactive && !keepGlobe) {
      try {
        map.easeTo({ center: coords, zoom: Math.max(map.getZoom(), 2.6), duration: 500 });
      } catch {
        /* ignore */
      }
    }
  }, [selectedMarketId, features, interactive, keepGlobe]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget?.center) {
      focusLngLatRef.current = null;
      onAnchorChangeRef.current?.(null);
      return;
    }
    const key = focusTarget.key ?? `${focusTarget.center[0]},${focusTarget.center[1]}`;
    focusLngLatRef.current = focusTarget.center;
    const publishAnchor = () => {
      try {
        const pt = map.project(focusLngLatRef.current as [number, number]);
        onAnchorChangeRef.current?.({ x: pt.x, y: pt.y });
      } catch {
        onAnchorChangeRef.current?.(null);
      }
    };
    if (focusKeyRef.current !== key) {
      focusKeyRef.current = key;
      try {
        const currentBearing = typeof map.getBearing === "function" ? map.getBearing() : 0;
        map.easeTo({
          center: focusTarget.center,
          zoom: focusTarget.zoom ?? 4.6,
          pitch: focusTarget.pitch ?? 48,
          bearing: focusTarget.bearing ?? currentBearing + 52,
          duration: 1100,
          essential: true,
        });
      } catch {
        /* ignore */
      }
    }
    publishAnchor();
    map.on("move", publishAnchor);
    map.on("moveend", publishAnchor);
    return () => {
      map.off("move", publishAnchor);
      map.off("moveend", publishAnchor);
    };
  }, [focusTarget]);

  useEffect(() => {
    if (!resetNonce) return;
    const map = mapRef.current;
    if (!map) return;
    focusLngLatRef.current = null;
    focusKeyRef.current = null;
    onAnchorChangeRef.current?.(null);
    try {
      map.easeTo({
        center: centerRef.current || WAR_ROOM_HOME_CENTER,
        zoom: keepGlobe
          ? warRoomHomeZoom(true)
          : centerRef.current
            ? 3.2
            : warRoomHomeZoom(false),
        pitch: 0,
        bearing: 0,
        duration: 900,
        essential: true,
      });
    } catch {
      /* ignore */
    }
  }, [resetNonce, keepGlobe]);

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full", dark ? "bg-black" : "bg-[#f4f5f7]", className)}
      data-war-room-globe
      data-war-room-globe-theme={dark ? "dark" : "light"}
    />
  );
}
