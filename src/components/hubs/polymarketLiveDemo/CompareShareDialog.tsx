"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Check, Copy, Download, Loader2, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KALSHI_VS_POLYMARKET_CANONICAL } from "@/lib/kalshiVsPolymarketLanding";
import { cn } from "@/lib/utils";

const POLY = "#2E5CFF";
const KALSHI = "#28CC95";

export type CompareShareMode = "chart" | "details" | "both";

export type CompareSharePoint = { t: number; v: number };

export type CompareShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headlineDefault: string;
  kalshiTitle: string;
  polyTitle: string;
  kalshiMeta: string;
  polyMeta: string;
  kalshiYesPct: number | null;
  polyYesPct: number | null;
  countdownLabel: string | null;
  intervalLabel: string;
  polyPoints: CompareSharePoint[];
  kalshiPoints: CompareSharePoint[];
};

function downsample(points: CompareSharePoint[], count = 80): CompareSharePoint[] {
  if (points.length <= count) return points;
  const step = (points.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => points[Math.round(i * step)]!).filter(Boolean);
}

function toPath(
  points: CompareSharePoint[],
  width: number,
  height: number,
  tMin: number,
  tMax: number,
  vMin: number,
  vMax: number,
) {
  if (points.length < 2) return "";
  const spanT = Math.max(tMax - tMin, 1);
  const spanV = Math.max(vMax - vMin, 0.5);
  return points
    .map((point, index) => {
      const x = ((point.t - tMin) / spanT) * width;
      const y = height - ((point.v - vMin) / spanV) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function formatPct(value: number | null) {
  return value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(1)}%`;
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

async function dataUrlToFile(dataUrl: string, filename: string) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

export function CompareShareDialog({
  open,
  onOpenChange,
  headlineDefault,
  kalshiTitle,
  polyTitle,
  kalshiMeta,
  polyMeta,
  kalshiYesPct,
  polyYesPct,
  countdownLabel,
  intervalLabel,
  polyPoints,
  kalshiPoints,
}: CompareShareDialogProps) {
  const cardRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<CompareShareMode>("both");
  const [headline, setHeadline] = useState(headlineDefault);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState<"png" | "x" | "linkedin" | "native" | "copy" | null>(null);
  const [copied, setCopied] = useState(false);

  const spread =
    polyYesPct != null && kalshiYesPct != null ? polyYesPct - kalshiYesPct : null;
  const defaultCaption = useMemo(() => {
    const spreadLine =
      spread == null
        ? "Live YES prices on Kalshi and Polymarket."
        : `Polymarket is ${Math.abs(spread).toFixed(1)} pp ${spread >= 0 ? "higher" : "lower"} than Kalshi.`;
    return [
      headlineDefault,
      `Kalshi ${formatPct(kalshiYesPct)}  ·  Polymarket ${formatPct(polyYesPct)}`,
      spreadLine,
      "",
      "Created with Lychee. Compare it yourself:",
      KALSHI_VS_POLYMARKET_CANONICAL,
    ].join("\n");
  }, [headlineDefault, kalshiYesPct, polyYesPct, spread]);

  useEffect(() => {
    if (!open) return;
    setHeadline(headlineDefault);
    setCaption(defaultCaption);
    setCopied(false);
  }, [defaultCaption, headlineDefault, open]);

  const spark = useMemo(() => {
    const poly = downsample(polyPoints);
    const kalshi = downsample(kalshiPoints);
    const all = [...poly, ...kalshi];
    if (all.length < 2) {
      return { polyPath: "", kalshiPath: "", yMin: 0, yMax: 100 };
    }
    const tMin = Math.min(...all.map((p) => p.t));
    const tMax = Math.max(...all.map((p) => p.t));
    const values = all.map((p) => p.v);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const pad = Math.max(0.8, (rawMax - rawMin) * 0.12);
    const yMin = Math.max(0, rawMin - pad);
    const yMax = Math.min(100, rawMax + pad);
    return {
      polyPath: toPath(poly, 980, 320, tMin, tMax, yMin, yMax),
      kalshiPath: toPath(kalshi, 980, 320, tMin, tMax, yMin, yMax),
      yMin,
      yMax,
    };
  }, [kalshiPoints, polyPoints]);

  const capturePng = useCallback(async () => {
    const node = cardRef.current;
    if (!node) throw new Error("Share card is not ready");
    return toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#111318",
      width: 1080,
      height: 1350,
      style: {
        transform: "none",
        transformOrigin: "top left",
        width: "1080px",
        height: "1350px",
      },
    });
  }, []);

  const handleDownload = useCallback(async () => {
    setBusy("png");
    try {
      downloadDataUrl(await capturePng(), `lychee-compare-${Date.now()}.png`);
    } finally {
      setBusy(null);
    }
  }, [capturePng]);

  const handleCopy = useCallback(async () => {
    setBusy("copy");
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* Clipboard can be blocked in some browsers; keep the editable caption. */
    } finally {
      setBusy(null);
    }
  }, [caption]);

  const handleX = useCallback(async () => {
    setBusy("x");
    try {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } finally {
      setBusy(null);
    }
  }, [caption]);

  const handleLinkedIn = useCallback(async () => {
    setBusy("linkedin");
    try {
      await navigator.clipboard.writeText(caption).catch(() => undefined);
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(KALSHI_VS_POLYMARKET_CANONICAL)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } finally {
      setBusy(null);
    }
  }, [caption]);

  const handleNativeShare = useCallback(async () => {
    setBusy("native");
    try {
      const dataUrl = await capturePng();
      const file = await dataUrlToFile(dataUrl, "lychee-compare.png");
      const payload = { files: [file], text: caption, title: headline, url: KALSHI_VS_POLYMARKET_CANONICAL };
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share(payload);
        return;
      }
      downloadDataUrl(dataUrl, `lychee-compare-${Date.now()}.png`);
      await navigator.clipboard.writeText(caption).catch(() => undefined);
    } finally {
      setBusy(null);
    }
  }, [caption, capturePng, headline]);

  const showChart = mode === "chart" || mode === "both";
  const showDetails = mode === "details" || mode === "both";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[min(100%,72rem)] max-w-[72rem] flex-col gap-4 overflow-hidden sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>Share this comparison</DialogTitle>
          <DialogDescription>
            Edit the copy, then download a card or post it. Instagram and TikTok need a saved image plus the caption.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-5 overflow-hidden lg:grid-cols-[minmax(0,22rem)_1fr]">
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
              {(
                [
                  ["chart", "Share chart"],
                  ["details", "Share details"],
                  ["both", "Share both"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    mode === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="share-headline">Headline</Label>
              <Input
                id="share-headline"
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                maxLength={140}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="share-caption">Caption</Label>
              <Textarea
                id="share-caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                className="min-h-[10rem] font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={handleX} disabled={busy != null}>
                {busy === "x" ? <Loader2 className="size-4 animate-spin" /> : null}
                Post to X
              </Button>
              <Button type="button" variant="outline" onClick={handleLinkedIn} disabled={busy != null}>
                {busy === "linkedin" ? <Loader2 className="size-4 animate-spin" /> : null}
                LinkedIn
              </Button>
              <Button type="button" variant="outline" onClick={handleNativeShare} disabled={busy != null}>
                {busy === "native" ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
                IG / TikTok
              </Button>
              <Button type="button" onClick={handleDownload} disabled={busy != null}>
                {busy === "png" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Download
              </Button>
            </div>
            <Button type="button" variant="outline" onClick={handleCopy} disabled={busy != null}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Caption copied" : "Copy caption"}
            </Button>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Instagram and TikTok don’t accept a web post. Save the image, paste the caption, and reply with the Lychee link so people can run their own comparison.
            </p>
          </div>

          <div className="flex min-h-0 items-start justify-center overflow-auto rounded-xl border border-border bg-zinc-950/80 p-4">
            <div
              className="relative shrink-0 overflow-hidden rounded-lg shadow-2xl"
              style={{ width: 1080 * 0.32, height: 1350 * 0.32 }}
            >
              <article
                ref={cardRef}
                className="relative flex flex-col overflow-hidden text-white"
                style={{
                  width: 1080,
                  height: 1350,
                  transform: "scale(0.32)",
                  transformOrigin: "top left",
                  background: "#111318",
                  fontFamily: "ui-sans-serif, system-ui, sans-serif",
                }}
              >
                <div
                  className="h-2 shrink-0"
                  style={{ background: `linear-gradient(90deg, ${POLY}, ${KALSHI})` }}
                />
                <div className="flex items-center justify-between px-14 pt-12">
                  <div className="flex items-center gap-4">
                    <img
                      src="/logo.png"
                      alt=""
                      width={56}
                      height={56}
                      className="size-14 rounded-full object-contain"
                    />
                    <div>
                      <p className="text-2xl font-semibold tracking-tight">Created with Lychee</p>
                      <p className="text-lg uppercase tracking-[0.22em] text-white/45">Live comparison</p>
                    </div>
                  </div>
                  <p className="rounded-full border border-white/15 px-5 py-2 font-mono text-lg text-white/70">
                    {intervalLabel}
                  </p>
                </div>

                <div className="px-14 pt-8">
                  <p className="line-clamp-3 text-[44px] font-semibold leading-[1.15] tracking-tight">
                    {headline || headlineDefault}
                  </p>
                  {countdownLabel ? (
                    <p className="mt-4 font-mono text-2xl text-white/55">{countdownLabel}</p>
                  ) : null}
                </div>

                {showChart ? (
                  <div className={cn("mx-14 mt-8 flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-7", !showDetails && "mb-4")}>
                    <div className="mb-4 flex items-center gap-8 text-xl">
                      <span className="inline-flex items-center gap-3">
                        <span className="size-4 rounded-full" style={{ background: POLY }} />
                        Polymarket
                      </span>
                      <span className="inline-flex items-center gap-3">
                        <span className="size-4 rounded-full" style={{ background: KALSHI }} />
                        Kalshi
                      </span>
                    </div>
                    <svg viewBox="0 0 980 320" className="min-h-0 w-full flex-1" role="img" aria-label="Comparison chart">
                      {spark.polyPath ? (
                        <path d={spark.polyPath} fill="none" stroke={POLY} strokeWidth="6" strokeLinecap="round" />
                      ) : null}
                      {spark.kalshiPath ? (
                        <path d={spark.kalshiPath} fill="none" stroke={KALSHI} strokeWidth="6" strokeLinecap="round" />
                      ) : null}
                    </svg>
                  </div>
                ) : null}

                {showDetails ? (
                  <div className={cn("mx-14 grid min-h-0 grid-cols-2 gap-5", showChart ? "mt-6" : "mt-10 min-h-[520px] flex-1")}>
                    <div className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-8">
                      <p className="text-lg uppercase tracking-[0.18em] text-white/45">Kalshi</p>
                      <p className={cn("mt-3 font-semibold leading-tight", showChart ? "line-clamp-2 text-[28px]" : "line-clamp-4 text-[34px]")}>
                        {kalshiTitle}
                      </p>
                      <p className="mt-3 truncate font-mono text-lg text-white/50">{kalshiMeta}</p>
                      <p className={cn("mt-auto font-mono", showChart ? "pt-6 text-5xl" : "pt-10 text-7xl")} style={{ color: KALSHI }}>
                        {formatPct(kalshiYesPct)}
                      </p>
                    </div>
                    <div className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-8">
                      <p className="text-lg uppercase tracking-[0.18em] text-white/45">Polymarket</p>
                      <p className={cn("mt-3 font-semibold leading-tight", showChart ? "line-clamp-2 text-[28px]" : "line-clamp-4 text-[34px]")}>
                        {polyTitle}
                      </p>
                      <p className="mt-3 truncate font-mono text-lg text-white/50">{polyMeta}</p>
                      <p className={cn("mt-auto font-mono", showChart ? "pt-6 text-5xl" : "pt-10 text-7xl")} style={{ color: POLY }}>
                        {formatPct(polyYesPct)}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="mt-auto px-14 pb-12 pt-8">
                  <div className="flex items-end justify-between gap-8 border-t border-white/10 pt-7">
                    <div>
                      <p className="text-3xl font-semibold">Created with Lychee</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl text-white/50">Compare it yourself</p>
                      <p className="font-mono text-2xl text-white/90">lycheedata.com/kalshi-vs-polymarket-odds</p>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
