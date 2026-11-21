"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./war-room-globe.css";

import { MAP_UPDATE_CADENCE_MS } from "@/lib/warRoom/constants";
import { cn } from "@/lib/utils";

import { WAR_ROOM_FALLBACK_STYLE, WAR_ROOM_SPACE_BLACK, WAR_ROOM_VECTOR_STYLE } from "./mapStyle";

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
  onSelect?: (id: string) => void;
  onFail?: () => void;
  className?: string;
  interactive?: boolean;
  initialCenter?: [number, number] | null;
  /** Homepage: stay zoomed out so the globe stays visible even with a user location. */
  keepGlobe?: boolean;
};

const SOURCE_ID = "war-room-markets";
const PING_SOURCE_ID = "war-room-pings";
const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

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
}: WarRoomGlobeProps) {
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
  const pendingRef = useRef<FeatureCollection>(features || EMPTY);
  const pendingPingsRef = useRef<FeatureCollection>(pings || EMPTY);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const selectedRef = useRef(selectedMarketId);
  selectedRef.current = selectedMarketId;
  const flushTimer = useRef<number | null>(null);
  const focusKeyRef = useRef<string | number | null>(null);

  useEffect(() => {
    pendingRef.current = features || EMPTY;
    pendingPingsRef.current = pings || EMPTY;
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as { setData?: (d: FeatureCollection) => void } | undefined;
    const pingSource = map.getSource(PING_SOURCE_ID) as { setData?: (d: FeatureCollection) => void } | undefined;
    if (!source?.setData) return;
    if (flushTimer.current) return;
    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = null;
      const next = pendingRef.current;
      const nextIds = new Set(next.features.map((f) => String(f.properties?.id || f.id || "")));
      const entering = [...nextIds].filter((id) => id && !knownIdsRef.current.has(id));
      knownIdsRef.current = nextIds;
      source.setData?.(next);
      pingSource?.setData?.(pendingPingsRef.current);
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
        const startCenter = centerRef.current || [-40, 28];
        const globeZoom = keepGlobe ? 1.55 : centerRef.current ? 3.2 : 1.35;
        const instance = new maplibregl.Map({
          container: containerRef.current as HTMLDivElement,
          style: style as never,
          center: startCenter,
          zoom: globeZoom,
          attributionControl: false,
          maplibreLogo: false,
          interactive,
          fadeDuration: reduceMotion ? 0 : 300,
          canvasContextAttributes: { antialias: true },
        });
        stripAttribution(instance);
        instance.on("style.load", () => {
          stripAttribution(instance);
          applyProjection(instance);
          try {
            const style = instance.getStyle?.();
            for (const layer of style?.layers || []) {
              if (layer?.type === "background" && layer.id) {
                instance.setPaintProperty(layer.id, "background-color", WAR_ROOM_SPACE_BLACK);
              }
            }
          } catch {
            /* style may omit a background layer */
          }
          try {
            instance.setFog?.({
              color: WAR_ROOM_SPACE_BLACK,
              "high-color": WAR_ROOM_SPACE_BLACK,
              "space-color": WAR_ROOM_SPACE_BLACK,
              "horizon-blend": 0.02,
              "star-intensity": 0,
            });
          } catch {
            /* older MapLibre without fog */
          }
          if (!instance.getSource(SOURCE_ID)) {
            instance.addSource(SOURCE_ID, {
              type: "geojson",
              data: pendingRef.current,
              promoteId: "id",
            });
            instance.addLayer({
              id: "wr-halo",
              type: "circle",
              source: SOURCE_ID,
              paint: {
                "circle-radius": [
                  "case",
                  ["==", ["feature-state", "pulse"], 1],
                  22,
                  ["case", ["==", ["get", "marker"], "weather"], 14, 11],
                ],
                "circle-color": [
                  "match",
                  ["get", "marker"],
                  "weather",
                  "#7dd3fc",
                  "geopolitics",
                  "#fbbf24",
                  "#93c5fd",
                ],
                "circle-opacity": ["case", ["==", ["feature-state", "pulse"], 1], 0.35, 0.18],
              },
            });
            instance.addLayer({
              id: "wr-points",
              type: "circle",
              source: SOURCE_ID,
              paint: {
                "circle-radius": [
                  "case",
                  ["==", ["feature-state", "pulse"], 1],
                  9,
                  ["case", ["==", ["get", "marker"], "weather"], 6.5, 5.5],
                ],
                "circle-color": [
                  "match",
                  ["get", "marker"],
                  "weather",
                  "#7dd3fc",
                  "geopolitics",
                  "#f59e0b",
                  "#60a5fa",
                ],
                "circle-stroke-width": 1.2,
                "circle-stroke-color": WAR_ROOM_SPACE_BLACK,
              },
            });
            instance.addLayer({
              id: "wr-selected",
              type: "circle",
              source: SOURCE_ID,
              filter: ["==", ["get", "id"], selectedRef.current || ""],
              paint: {
                "circle-radius": 11,
                "circle-color": "#ffffff",
                "circle-opacity": 0.15,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#f8fafc",
              },
            });
            instance.addLayer({
              id: "wr-labels",
              type: "symbol",
              source: SOURCE_ID,
              minzoom: 2.4,
              layout: {
                "text-field": ["get", "title"],
                "text-size": 11,
                "text-offset": [0, 1.2],
                "text-anchor": "top",
                "text-max-width": 14,
                "text-optional": true,
              },
              paint: {
                "text-color": "#e2e8f0",
                "text-halo-color": WAR_ROOM_SPACE_BLACK,
                "text-halo-width": 1.2,
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
                "circle-radius": 16,
                "circle-color": "#c4b5fd",
                "circle-opacity": 0.28,
              },
            });
            instance.addLayer({
              id: "wr-news-points",
              type: "circle",
              source: PING_SOURCE_ID,
              paint: {
                "circle-radius": 5.5,
                "circle-color": "#a78bfa",
                "circle-stroke-width": 1.2,
                "circle-stroke-color": WAR_ROOM_SPACE_BLACK,
              },
            });
          }
        });
        instance.on("click", "wr-points", (e) => {
          const id = e.features?.[0]?.properties?.id;
          if (id) onSelectRef.current?.(String(id));
        });
        instance.on("mouseenter", "wr-points", () => {
          instance.getCanvas().style.cursor = "pointer";
        });
        instance.on("mouseleave", "wr-points", () => {
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
        try {
          map = await start(WAR_ROOM_VECTOR_STYLE);
        } catch {
          map = await start(WAR_ROOM_FALLBACK_STYLE);
        }
        if (cancelled) {
          map?.remove();
          return;
        }
        mapRef.current = map;
      } catch (err) {
        console.warn("War Room globe failed; keeping poster", err);
        onFailRef.current?.();
      }
    })();

    return () => {
      cancelled = true;
      if (flushTimer.current) window.clearTimeout(flushTimer.current);
      if (hiddenHandler) document.removeEventListener("visibilitychange", hiddenHandler);
      mapRef.current?.remove();
      mapRef.current = null;
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

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full bg-black", className)}
      data-war-room-globe
    />
  );
}
