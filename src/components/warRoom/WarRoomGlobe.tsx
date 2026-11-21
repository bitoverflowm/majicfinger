"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { MAP_UPDATE_CADENCE_MS } from "@/lib/warRoom/constants";
import { cn } from "@/lib/utils";

import { WAR_ROOM_ATTRIBUTION, WAR_ROOM_FALLBACK_STYLE, WAR_ROOM_VECTOR_STYLE } from "./mapStyle";

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
  selectedMarketId?: string | null;
  onSelect?: (id: string) => void;
  onFail?: () => void;
  className?: string;
  interactive?: boolean;
  initialCenter?: [number, number] | null;
};

const SOURCE_ID = "war-room-markets";
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
  selectedMarketId,
  onSelect,
  onFail,
  className,
  interactive = true,
  initialCenter = null,
}: WarRoomGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;
  const centerRef = useRef(initialCenter);
  centerRef.current = initialCenter;
  const pendingRef = useRef<FeatureCollection>(features || EMPTY);
  const selectedRef = useRef(selectedMarketId);
  selectedRef.current = selectedMarketId;
  const flushTimer = useRef<number | null>(null);

  useEffect(() => {
    pendingRef.current = features || EMPTY;
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as { setData?: (d: FeatureCollection) => void } | undefined;
    if (!source?.setData) return;
    if (flushTimer.current) return;
    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = null;
      source.setData?.(pendingRef.current);
      if (selectedRef.current) {
        try {
          map.setFilter("wr-selected", ["==", ["get", "id"], selectedRef.current]);
        } catch {
          /* layer may not exist yet */
        }
      }
    }, MAP_UPDATE_CADENCE_MS);
  }, [features, selectedMarketId]);

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
        const instance = new maplibregl.Map({
          container: containerRef.current as HTMLDivElement,
          style: style as never,
          center: startCenter,
          zoom: centerRef.current ? 3.2 : 1.35,
          attributionControl: false,
          interactive,
          fadeDuration: reduceMotion ? 0 : 300,
          canvasContextAttributes: { antialias: true },
        });
        instance.addControl(
          new maplibregl.AttributionControl({ compact: true, customAttribution: WAR_ROOM_ATTRIBUTION }),
          "bottom-right",
        );
        instance.on("style.load", () => {
          applyProjection(instance);
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
                "circle-radius": ["case", ["==", ["get", "marker"], "weather"], 14, 11],
                "circle-color": [
                  "match",
                  ["get", "marker"],
                  "weather",
                  "#7dd3fc",
                  "geopolitics",
                  "#fbbf24",
                  "#93c5fd",
                ],
                "circle-opacity": 0.18,
              },
            });
            instance.addLayer({
              id: "wr-points",
              type: "circle",
              source: SOURCE_ID,
              paint: {
                "circle-radius": ["case", ["==", ["get", "marker"], "weather"], 6.5, 5.5],
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
                "circle-stroke-color": "#070b14",
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
                "text-halo-color": "#070b14",
                "text-halo-width": 1.2,
                "text-opacity": 0.9,
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
  }, [interactive]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !initialCenter) return;
    try {
      map.easeTo({ center: initialCenter, zoom: Math.max(map.getZoom(), 3.2), duration: 800 });
    } catch {
      /* ignore */
    }
  }, [initialCenter]);

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
    if (coords && interactive) {
      try {
        map.easeTo({ center: coords, zoom: Math.max(map.getZoom(), 2.6), duration: 500 });
      } catch {
        /* ignore */
      }
    }
  }, [selectedMarketId, features, interactive]);

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full bg-[#070b14]", className)}
      data-war-room-globe
    />
  );
}
