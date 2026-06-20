"use client";

import { useEffect, useRef, useState } from "react";
import { LYCHEE_CHART_EMBED_RESIZE } from "@/lib/content/chart-embed-resize";

type PublicChartIframeProps = {
  src: string;
  title: string;
  /** Starting height before the embed reports its true content height. */
  initialHeight: number;
};

export function PublicChartIframe({ src, title, initialHeight }: PublicChartIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(initialHeight);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== LYCHEE_CHART_EMBED_RESIZE) return;
      if (iframeRef.current?.contentWindow !== event.source) return;
      const next = Number(event.data.height);
      if (Number.isFinite(next) && next > 0) {
        setHeight(Math.ceil(next));
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      src={src}
      width="100%"
      height={height}
      style={{ border: 0, background: "#ffffff" }}
      loading="lazy"
    />
  );
}
