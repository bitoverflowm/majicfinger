"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

import {
  KALSHI_GREEN,
  POLYMARKET_BLUE,
  type BookLevel,
  type DashboardLiveState,
  type DashboardPair,
  type DashboardWidget,
} from "./types";

export type ShareLayer = "overlay" | "stats" | "books" | "depth" | "dashboard";

const LAYERS: { id: ShareLayer; label: string }[] = [
  { id: "overlay", label: "Price overlay" },
  { id: "stats", label: "Market stats" },
  { id: "books", label: "Order books" },
  { id: "depth", label: "Depth" },
  { id: "dashboard", label: "Dashboard layout" },
];

type SharePoint = { t: number; v: number };

function downsample(points: SharePoint[], count = 80): SharePoint[] {
  if (points.length <= count) return points;
  const step = (points.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => points[Math.round(i * step)]!).filter(Boolean);
}

function toPath(
  points: SharePoint[],
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

function formatCents(value: number | null) {
  return value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(1)}¢`;
}

function formatMoney(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${Math.round(value)}`;
}

function formatQty(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(abs >= 10 ? 0 : 1);
}

function toCents(price: number) {
  return price <= 1.5 ? price * 100 : price;
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

function sideSize(levels: BookLevel[]) {
  return levels.reduce((sum, level) => sum + (Number(level.size) || 0), 0);
}

export function DashboardShareDialog({
  open,
  onOpenChange,
  pair,
  state,
  widgets,
  intervalLabel,
  kalshiPoints,
  polyPoints,
  handleUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pair: DashboardPair;
  state: DashboardLiveState;
  widgets: DashboardWidget[];
  intervalLabel: string;
  kalshiPoints: SharePoint[];
  polyPoints: SharePoint[];
  handleUrl: string;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const [layers, setLayers] = useState<ShareLayer[]>(["overlay", "stats", "dashboard"]);
  const [headline, setHeadline] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState<"png" | "x" | "linkedin" | "native" | "copy" | null>(null);
  const [copied, setCopied] = useState(false);

  const headlineDefault = `${pair.kalshiTitle} vs ${pair.polyTitle}`;
  const spread =
    state.polyLastPct != null && state.kalshiLastPct != null
      ? state.polyLastPct - state.kalshiLastPct
      : null;

  const defaultCaption = useMemo(() => {
    const spreadLine =
      spread == null
        ? "Live YES prices on Kalshi and Polymarket."
        : `Polymarket is ${Math.abs(spread).toFixed(1)}¢ ${spread >= 0 ? "higher" : "lower"} than Kalshi.`;
    return [
      headlineDefault,
      `Kalshi ${formatCents(state.kalshiLastPct)}  ·  Polymarket ${formatCents(state.polyLastPct)}`,
      spreadLine,
      `Built a live dashboard on Lychee · ${intervalLabel}`,
      "",
      "Created with Lychee. Compare it yourself:",
      KALSHI_VS_POLYMARKET_CANONICAL,
    ].join("\n");
  }, [headlineDefault, intervalLabel, spread, state.kalshiLastPct, state.polyLastPct]);

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
    const tMin = Math.min(...all.map((point) => point.t));
    const tMax = Math.max(...all.map((point) => point.t));
    const values = all.map((point) => point.v);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const pad = Math.max(0.6, (rawMax - rawMin) * 0.18);
    const yMin = Math.max(0, rawMin - pad);
    const yMax = Math.min(100, rawMax + pad);
    return {
      polyPath: toPath(poly, 980, 280, tMin, tMax, yMin, yMax),
      kalshiPath: toPath(kalshi, 980, 280, tMin, tMax, yMin, yMax),
      yMin,
      yMax,
    };
  }, [kalshiPoints, polyPoints]);

  const active = layers.length ? layers : (["overlay"] as ShareLayer[]);
  const show = (id: ShareLayer) => active.includes(id);
  const sectionCount = active.length;

  const toggleLayer = (id: ShareLayer) => {
    setLayers((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((item) => item !== id);
        return next.length ? next : prev;
      }
      return [...prev, id];
    });
  };

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
      downloadDataUrl(await capturePng(), `lychee-dashboard-${Date.now()}.png`);
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
      /* keep editable caption */
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
      const file = await dataUrlToFile(dataUrl, "lychee-dashboard.png");
      const payload = {
        files: [file],
        text: caption,
        title: headline,
        url: KALSHI_VS_POLYMARKET_CANONICAL,
      };
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share(payload);
        return;
      }
      downloadDataUrl(dataUrl, `lychee-dashboard-${Date.now()}.png`);
      await navigator.clipboard.writeText(caption).catch(() => undefined);
    } finally {
      setBusy(null);
    }
  }, [caption, capturePng, headline]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[80]"
        className="z-[80] flex max-h-[92vh] w-[min(100%,72rem)] max-w-[72rem] flex-col gap-4 overflow-hidden sm:rounded-2xl"
      >
        <DialogHeader>
          <DialogTitle>Share this dashboard</DialogTitle>
          <DialogDescription>
            Pick the views you’re proud of, edit the copy, then download a card or post it.
            Instagram and TikTok need a saved image plus the caption.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-5 overflow-hidden lg:grid-cols-[minmax(0,22rem)_1fr]">
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Include
              </p>
              <div className="flex flex-wrap gap-1.5">
                {LAYERS.map((layer) => {
                  const on = show(layer.id);
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleLayer(layer.id)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        on
                          ? "border-foreground/20 bg-foreground text-background"
                          : "border-border bg-background text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {layer.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dash-share-headline">Headline</Label>
              <Input
                id="dash-share-headline"
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                maxLength={140}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dash-share-caption">Caption</Label>
              <Textarea
                id="dash-share-caption"
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
              Instagram and TikTok don’t accept a web post. Save the image, paste the caption, and reply
              with the Lychee link so people can build their own dashboard.
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
                  style={{ background: `linear-gradient(90deg, ${POLYMARKET_BLUE}, ${KALSHI_GREEN})` }}
                />
                <div className="flex items-center justify-between px-14 pt-10">
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
                      <p className="text-lg uppercase tracking-[0.22em] text-white/45">Live dashboard</p>
                    </div>
                  </div>
                  <p className="rounded-full border border-white/15 px-5 py-2 font-mono text-lg text-white/70">
                    {intervalLabel}
                  </p>
                </div>

                <div className="px-14 pt-7">
                  <p className="line-clamp-3 text-[40px] font-semibold leading-[1.15] tracking-tight">
                    {headline || headlineDefault}
                  </p>
                </div>

                <div className="mt-6 flex min-h-0 flex-1 flex-col gap-5 px-14">
                  {show("overlay") ? (
                    <SharePanel className={sectionCount <= 2 ? "flex-[1.4]" : "flex-1"}>
                      <div className="mb-3 flex items-center justify-between text-xl">
                        <span className="inline-flex items-center gap-6">
                          <span className="inline-flex items-center gap-3">
                            <span className="size-4 rounded-full" style={{ background: POLYMARKET_BLUE }} />
                            Polymarket
                          </span>
                          <span className="inline-flex items-center gap-3">
                            <span className="size-4 rounded-full" style={{ background: KALSHI_GREEN }} />
                            Kalshi
                          </span>
                        </span>
                        <span className="font-mono text-white/50">YES overlay</span>
                      </div>
                      <svg viewBox="0 0 980 280" className="min-h-0 w-full flex-1" role="img" aria-label="Price overlay">
                        {spark.polyPath ? (
                          <path d={spark.polyPath} fill="none" stroke={POLYMARKET_BLUE} strokeWidth="6" strokeLinecap="round" />
                        ) : null}
                        {spark.kalshiPath ? (
                          <path d={spark.kalshiPath} fill="none" stroke={KALSHI_GREEN} strokeWidth="6" strokeLinecap="round" />
                        ) : null}
                      </svg>
                    </SharePanel>
                  ) : null}

                  {show("stats") ? (
                    <div className="grid shrink-0 grid-cols-4 gap-3">
                      <StatTile label="Kalshi YES" value={formatCents(state.kalshiLastPct)} color={KALSHI_GREEN} />
                      <StatTile label="Poly YES" value={formatCents(state.polyLastPct)} color={POLYMARKET_BLUE} />
                      <StatTile
                        label="Gap"
                        value={spread == null ? "—" : `${spread >= 0 ? "+" : ""}${spread.toFixed(1)}¢`}
                      />
                      <StatTile
                        label="24h volume"
                        value={`${formatMoney(state.kalshiVolume24h)} / ${formatMoney(state.polyVolume24h)}`}
                      />
                    </div>
                  ) : null}

                  {show("books") || show("depth") ? (
                    <div className={cn("grid min-h-0 gap-4", show("books") && show("depth") ? "grid-cols-2" : "grid-cols-1", sectionCount > 3 ? "flex-[0.9]" : "flex-1")}>
                      {show("books") ? (
                        <SharePanel>
                          <p className="mb-3 text-lg uppercase tracking-[0.16em] text-white/45">Order books</p>
                          <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
                            <MiniBook label="Kalshi" book={state.kalshiBook} accent={KALSHI_GREEN} />
                            <MiniBook label="Polymarket" book={state.polyBook} accent={POLYMARKET_BLUE} />
                          </div>
                        </SharePanel>
                      ) : null}
                      {show("depth") ? (
                        <SharePanel>
                          <p className="mb-3 text-lg uppercase tracking-[0.16em] text-white/45">Depth</p>
                          <DepthBars kalshi={state.kalshiBook} poly={state.polyBook} />
                        </SharePanel>
                      ) : null}
                    </div>
                  ) : null}

                  {show("dashboard") ? (
                    <SharePanel className={sectionCount === 1 ? "flex-[1.6]" : "flex-1"}>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-lg uppercase tracking-[0.16em] text-white/45">My workspace</p>
                        <p className="font-mono text-lg text-white/45">{widgets.length} widgets</p>
                      </div>
                      <DashboardMosaic widgets={widgets} />
                    </SharePanel>
                  ) : null}
                </div>

                <div className="mt-auto px-14 pb-10 pt-6">
                  <div className="flex items-end justify-between gap-8 border-t border-white/10 pt-6">
                    <div>
                      <p className="text-3xl font-semibold">Created with Lychee</p>
                      <p className="mt-1 text-xl text-white/50">@{handleUrl.split("/")[1] || "you"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl text-white/50">Open this dashboard</p>
                      <p className="font-mono text-2xl text-white/90">{handleUrl}</p>
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

function SharePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6", className)}>
      {children}
    </div>
  );
}

function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
      <p className="text-base uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="mt-2 font-mono text-[28px] font-semibold leading-none" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}

function MiniBook({
  label,
  book,
  accent,
}: {
  label: string;
  book: { bids: BookLevel[]; asks: BookLevel[] };
  accent: string;
}) {
  const asks = [...book.asks].slice(0, 4).reverse();
  const bids = book.bids.slice(0, 4);
  const max = Math.max(1, ...asks.map((row) => row.size), ...bids.map((row) => row.size));
  return (
    <div className="min-w-0">
      <p className="mb-2 text-lg font-medium" style={{ color: accent }}>
        {label}
      </p>
      <div className="space-y-1.5 font-mono text-lg">
        {asks.map((row, index) => (
          <BookRow key={`a-${index}`} price={row.price} size={row.size} max={max} side="ask" />
        ))}
        <div className="h-px bg-white/10" />
        {bids.map((row, index) => (
          <BookRow key={`b-${index}`} price={row.price} size={row.size} max={max} side="bid" />
        ))}
      </div>
    </div>
  );
}

function BookRow({
  price,
  size,
  max,
  side,
}: {
  price: number;
  size: number;
  max: number;
  side: "bid" | "ask";
}) {
  const width = `${Math.max(8, (size / max) * 100)}%`;
  return (
    <div className="relative flex items-center justify-between overflow-hidden rounded-md px-2 py-1">
      <span
        className="absolute inset-y-0 right-0"
        style={{
          width,
          background: side === "bid" ? "rgba(40,204,149,0.22)" : "rgba(251,113,133,0.22)",
        }}
      />
      <span className="relative">{toCents(price).toFixed(1)}¢</span>
      <span className="relative text-white/55">{formatQty(size)}</span>
    </div>
  );
}

function DepthBars({
  kalshi,
  poly,
}: {
  kalshi: { bids: BookLevel[]; asks: BookLevel[] };
  poly: { bids: BookLevel[]; asks: BookLevel[] };
}) {
  const rows = [
    { label: "Kalshi", bids: sideSize(kalshi.bids), asks: sideSize(kalshi.asks), accent: KALSHI_GREEN },
    { label: "Polymarket", bids: sideSize(poly.bids), asks: sideSize(poly.asks), accent: POLYMARKET_BLUE },
  ];
  const max = Math.max(1, ...rows.map((row) => row.bids + row.asks));
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-6">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-2 flex items-center justify-between text-xl">
            <span style={{ color: row.accent }}>{row.label}</span>
            <span className="font-mono text-white/50">
              {formatQty(row.bids)} bid · {formatQty(row.asks)} ask
            </span>
          </div>
          <div className="flex h-8 overflow-hidden rounded-full bg-white/10">
            <span className="h-full bg-[#28CC95]" style={{ width: `${(row.bids / max) * 100}%` }} />
            <span className="h-full bg-[#fb7185]" style={{ width: `${(row.asks / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardMosaic({ widgets }: { widgets: DashboardWidget[] }) {
  return (
    <div className="flex min-h-0 flex-1 flex-wrap content-start gap-3">
      {widgets.slice(0, 8).map((widget) => {
        const full = widget.layout === "full" || widget.type === "liveline";
        return (
          <div
            key={widget.id}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]"
            style={{
              flex: full ? "1 1 100%" : "1 1 calc(50% - 6px)",
              minHeight: full ? 88 : 72,
            }}
          >
            <div className="flex items-center justify-between px-4 pt-3">
              <p className="text-lg font-medium">{widget.title}</p>
              <span
                className="size-2.5 rounded-full"
                style={{
                  background:
                    widget.type === "liveline" || widget.id.includes("kalshi")
                      ? KALSHI_GREEN
                      : POLYMARKET_BLUE,
                }}
              />
            </div>
            <div
              className="mx-4 mb-3 mt-3 h-7 rounded-full opacity-70"
              style={{
                background: `linear-gradient(90deg, ${POLYMARKET_BLUE} 0%, ${KALSHI_GREEN} 100%)`,
                opacity: 0.35,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
