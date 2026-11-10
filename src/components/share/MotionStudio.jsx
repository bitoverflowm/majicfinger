"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Film, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { priceHistoryLines } from "@/components/dashboardComposer/priceHistorySeries";
import { useNewsTerms } from "@/components/terminals/holder/marketNews";
import { useMarketNews } from "@/components/terminals/holder/useMarketNews";
import { cn } from "@/lib/utils";
import { SHARE_ACCENTS, SHARE_FORMATS } from "./ShareCard";
import { useShareSession } from "./shareSessions";
import {
  drawMotionFrame,
  motionVideoType,
  pickMotionNews,
  prepareScene,
  recordMotionGif,
  recordMotionVideo,
  sceneDuration,
  thinPoints,
} from "./motionRecorder";

const DURATIONS = [
  { ms: 6000, label: "6s" },
  { ms: 10000, label: "10s" },
  { ms: 15000, label: "15s" },
];

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function useLogo() {
  const [logo, setLogo] = useState(null);
  useEffect(() => {
    const image = new window.Image();
    image.onload = () => setLogo(image);
    image.src = "/logo.png";
  }, []);
  return logo;
}

/** The line a piece animates: `{ series, valueKind, label, meta }`, or null while it loads. */
function useMotionSource(piece) {
  const session = useShareSession(piece?.tabId);
  // Only what the line is drawn from, so live ticks elsewhere in the session don't restart it.
  const priceSheet = session?.view === "market" ? session.priceHistory?.sheet || null : null;
  const meta = session?.view === "market" ? session.meta || null : null;
  const pnlRows = session?.view === "trader" ? session.pnl?.rows || null : null;
  return useMemo(() => {
    if (!piece?.motion) return null;
    if (piece.motion === "sheet-price") {
      const line = priceHistoryLines(piece.block)[0];
      const points = (line?.points || []).map((point) => ({ t: point.t > 1e12 ? point.t : point.t * 1000, v: point.price })).filter((point) => Number.isFinite(point.v));
      return points.length >= 2 ? { series: [{ label: piece.asset?.side || "", points: thinPoints(points) }], valueKind: "cents", meta: null } : null;
    }
    if (piece.motion === "price" && priceSheet) {
      const records = priceSheet.records || [];
      if (!records.length) return null;
      const byOutcome = new Map();
      for (const row of records) {
        if (!byOutcome.has(row.outcome)) byOutcome.set(row.outcome, []);
        byOutcome.get(row.outcome).push({ t: row.t * 1000, v: row.p });
      }
      const series = [...byOutcome.entries()].slice(0, 2).map(([label, points]) => ({ label, points: thinPoints(points.sort((a, b) => a.t - b.t)) }));
      return series[0]?.points.length >= 2 ? { series, valueKind: "cents", meta } : null;
    }
    if (piece.motion === "pnl" && pnlRows) {
      const points = pnlRows
        .map((row) => ({ t: Number(row.timestamp) * 1000, v: Number(row.position_pnl ?? row.trade_pnl) }))
        .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.v))
        .sort((a, b) => a.t - b.t);
      return points.length >= 2 ? { series: [{ label: "PnL", points: thinPoints(points) }], valueKind: "usd", meta: null } : null;
    }
    return null;
  }, [meta, piece, pnlRows, priceSheet]);
}

/** Headlines for a market over the animated period, the same search its price and news panel uses. */
function MarketHeadlines({ meta, start, end, onArticles }) {
  const terms = useNewsTerms(meta);
  const news = useMarketNews(terms.terms, { start, end, live: false });
  useEffect(() => {
    onArticles(news.articles);
  }, [news.articles, onArticles]);
  return null;
}

const NO_ARTICLES = [];

/**
 * A recording of a chart drawing itself, with the market's headlines popping up where they broke.
 * Downloads as a video (MP4 where the browser can, otherwise WebM) or a looping GIF.
 */
export function ShareMotion({ piece, format, theme, accent, handle, url, headline }) {
  const source = useMotionSource(piece);
  const logo = useLogo();
  const [drawMs, setDrawMs] = useState(10000);
  const [withNews, setWithNews] = useState(true);
  const [articles, setArticles] = useState(NO_ARTICLES);
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState(0);
  const [replay, setReplay] = useState(0);
  const canvasRef = useRef(null);
  const spec = SHARE_FORMATS[format] || SHARE_FORMATS.portrait;
  const lead = source?.series[0]?.points || [];
  const start = lead[0]?.t || 0;
  const end = lead[lead.length - 1]?.t || 0;

  const news = useMemo(() => (withNews && source?.meta ? pickMotionNews(articles, lead, 5) : []), [articles, lead, source?.meta, withNews]);
  const scene = useMemo(() => {
    if (!source) return null;
    return prepareScene({
      title: headline || piece.title,
      subtitle: piece.motion === "pnl" ? `PnL over time · ${piece.detail}` : piece.detail !== headline ? piece.detail : "",
      handle,
      url,
      valueKind: source.valueKind,
      series: source.series,
      news,
      theme,
      colors: (SHARE_ACCENTS[accent] || SHARE_ACCENTS.lychee).colors,
      logo,
      drawMs,
      holdMs: 2200,
    });
  }, [accent, drawMs, handle, headline, logo, news, piece, source, theme, url]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scene) return undefined;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = spec.w * ratio;
    canvas.height = spec.h * ratio;
    const ctx = canvas.getContext("2d");
    let frame = 0;
    const startAt = performance.now();
    const total = sceneDuration(scene) + 800;
    const tick = (time) => {
      const elapsed = (time - startAt) % total;
      drawMotionFrame(ctx, scene, Math.min(elapsed, sceneDuration(scene)), canvas.width, canvas.height);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [scene, spec.h, spec.w, replay]);

  const save = async (kind) => {
    if (!scene || busy) return;
    setBusy(kind);
    setProgress(0);
    try {
      const name = `lychee-${String(piece.title || "chart").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
      if (kind === "video") {
        const blob = await recordMotionVideo(scene, { width: Math.round(spec.w * spec.scale), height: Math.round(spec.h * spec.scale), onProgress: setProgress });
        download(blob, `${name}.${blob.type.includes("mp4") ? "mp4" : "webm"}`);
      } else {
        const shrink = Math.min(1, 540 / spec.w);
        const blob = await recordMotionGif(scene, { width: Math.round(spec.w * shrink), height: Math.round(spec.h * shrink), onProgress: setProgress });
        download(blob, `${name}.gif`);
      }
    } catch (error) {
      toast.error(error?.message || "That recording didn't work. Try again.");
    } finally {
      setBusy("");
    }
  };

  const videoType = typeof window === "undefined" ? "" : motionVideoType();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {source?.meta && start && end ? <MarketHeadlines meta={source.meta} start={start} end={end} onArticles={setArticles} /> : null}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/50 bg-[radial-gradient(theme(colors.neutral.300)_1px,transparent_1px)] bg-[length:18px_18px] p-6 dark:bg-[radial-gradient(theme(colors.neutral.800)_1px,transparent_1px)]">
        {scene ? (
          <canvas
            ref={canvasRef}
            aria-label={`Animation of ${piece.title}`}
            className="max-h-full max-w-full rounded-lg shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]"
            style={{ aspectRatio: `${spec.w} / ${spec.h}`, height: "100%" }}
          />
        ) : (
          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading the history to animate
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Length" className="flex items-center rounded-lg bg-muted p-0.5">
          {DURATIONS.map((item) => (
            <button
              key={item.ms}
              type="button"
              role="radio"
              aria-checked={drawMs === item.ms}
              onClick={() => setDrawMs(item.ms)}
              className={cn(
                "h-7 rounded-md px-2.5 text-[12px] font-medium tabular-nums transition-colors",
                drawMs === item.ms ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        {source?.meta ? (
          <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Switch size="sm" checked={withNews} onCheckedChange={setWithNews} aria-label="Show headlines" />
            Headlines {withNews && news.length ? `(${news.length})` : ""}
          </label>
        ) : null}
        <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setReplay((value) => value + 1)} disabled={!scene}>
          <RotateCcw className="size-3.5" />
          Replay
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => save("gif")} disabled={!scene || !!busy}>
            {busy === "gif" ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            {busy === "gif" ? `GIF ${Math.round(progress * 100)}%` : "GIF"}
          </Button>
          <Button type="button" size="sm" className="h-8" onClick={() => save("video")} disabled={!scene || !!busy || !videoType}>
            {busy === "video" ? <Loader2 className="size-3.5 animate-spin" /> : <Film className="size-3.5" />}
            {busy === "video" ? `Recording ${Math.round(progress * 100)}%` : videoType.includes("mp4") ? "Video (MP4)" : "Video"}
          </Button>
        </div>
      </div>
      <p className="text-[11.5px] text-muted-foreground">
        Video records in real time, so it takes as long as the clip. Instagram, TikTok and X take the MP4; the GIF loops anywhere.
      </p>
    </div>
  );
}
