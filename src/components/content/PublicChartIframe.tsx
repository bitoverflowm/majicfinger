"use client";

import { useEffect, useRef, useState } from "react";
import {
  LYCHEE_CHART_EMBED_READY,
  LYCHEE_CHART_EMBED_RESIZE,
} from "@/lib/content/chart-embed-resize";

type PublicChartIframeProps = {
  src: string;
  title: string;
  /** Starting height before the embed reports its true content height. */
  initialHeight: number;
  onReady?: () => void;
};

export function PublicChartIframe({
  src,
  title,
  initialHeight,
  onReady,
}: PublicChartIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const [height, setHeight] = useState(initialHeight);

  useEffect(() => {
    readyRef.current = false;
  }, [src]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (iframeRef.current?.contentWindow !== event.source) return;

      if (event.data?.type === LYCHEE_CHART_EMBED_RESIZE) {
        const next = Number(event.data.height);
        if (Number.isFinite(next) && next > 0) {
          setHeight(Math.ceil(next));
        }
        return;
      }

      if (event.data?.type === LYCHEE_CHART_EMBED_READY && !readyRef.current) {
        readyRef.current = true;
        onReady?.();
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onReady]);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      src={src}
      width="100%"
      height={height}
      style={{ border: 0, background: "#ffffff" }}
      loading="eager"
    />
  );
}
