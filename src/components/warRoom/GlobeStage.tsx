"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { isCompactScreen } from "@/lib/desktopOnly";
import { cn } from "@/lib/utils";

import { GlobePoster } from "./GlobePoster";
import type { WarRoomGlobeProps } from "./WarRoomGlobe";

const WarRoomGlobe = dynamic<WarRoomGlobeProps>(
  () => import("./WarRoomGlobe").then((m) => m.WarRoomGlobe),
  { ssr: false, loading: () => <GlobePoster className="h-full w-full" /> },
);

function hasWebGL() {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

type GlobeStageProps = WarRoomGlobeProps & {
  /** Homepage: wait until after first paint and only on eligible desktops. */
  enhance?: "auto" | "always" | "never";
  onTapPoster?: () => void;
};

export function GlobeStage({
  enhance = "auto",
  onTapPoster,
  className,
  ...globeProps
}: GlobeStageProps) {
  const [ready, setReady] = useState(enhance === "always");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (enhance === "never") {
      setReady(false);
      return;
    }
    if (enhance === "always") {
      setReady(true);
      return;
    }
    if (typeof window === "undefined") return;
    const compact = isCompactScreen();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (compact || reduced || !hasWebGL()) return;

    let idleId = 0;
    let timeoutId = 0;
    const kick = () => setReady(true);
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(kick, { timeout: 1800 });
    } else {
      timeoutId = window.setTimeout(kick, 250);
    }
    return () => {
      if (idleId && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [enhance]);

  const onFail = useCallback(() => setFailed(true), []);

  const showGlobe = ready && !failed;

  return (
    <div className={cn("relative h-full w-full", className)}>
      <GlobePoster className={cn("absolute inset-0", showGlobe ? "opacity-0" : "opacity-100")} />
      {showGlobe ? (
        <div className="absolute inset-0">
          <WarRoomGlobe {...globeProps} className="h-full w-full" onFail={onFail} />
        </div>
      ) : onTapPoster ? (
        <button
          type="button"
          className="absolute inset-0 z-10 cursor-pointer bg-transparent"
          onClick={onTapPoster}
          aria-label="Open the interactive globe"
        />
      ) : null}
    </div>
  );
}
