"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Check, Copy, Download, Loader2, Plus, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import {
  buildShareModel,
  formatShareChange,
  formatSharePrice,
  shareCaption,
} from "@/components/dashboardComposer/dashboardShareModel";
import { cn } from "@/lib/utils";

const UP = "#28CC95";
const DOWN = "#fb7185";
const BLUE = "#2E5CFF";

function sparkGeometry(points, width, height) {
  if (!points || points.length < 2) return { line: "", area: "" };
  const values = points.map((point) => point.price);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad = Math.max((rawMax - rawMin) * 0.18, 0.0001);
  const lo = rawMin - pad;
  const hi = rawMax + pad;
  const spanV = hi - lo;
  const t0 = points[0].t;
  const spanT = Math.max(points[points.length - 1].t - t0, 1);
  const coords = points.map((point) => {
    const x = ((point.t - t0) / spanT) * width;
    const y = height - ((point.price - lo) / spanV) * height;
    return [x, y];
  });
  const line = coords.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1];
  const area = `${line} L ${last[0].toFixed(1)} ${height} L ${coords[0][0].toFixed(1)} ${height} Z`;
  return { line, area };
}

function formatQty(value) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return abs >= 10 ? String(Math.round(value)) : value.toFixed(1);
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

async function dataUrlToFile(dataUrl, filename) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

function pieceLabel(asset) {
  if (asset.kind === "price") return "Price";
  if (asset.kind === "book") return "Book";
  return "Sheet";
}

export function DashboardShareDialog({ open, onOpenChange }) {
  const canvas = useWorkspaceCanvas();
  const ctx = useMyStateV2();
  const cardRef = useRef(null);
  const [activeId, setActiveId] = useState("");
  const [removedIds, setRemovedIds] = useState([]);
  const [membership, setMembership] = useState(null);
  const [headline, setHeadline] = useState("");
  const [caption, setCaption] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(null);
  const [copied, setCopied] = useState(false);

  const model = useMemo(
    () =>
      buildShareModel({
        tabs: ctx?.workspaceStartTabs,
        blocksByPage: canvas?.blocksByPage,
        activeTabId: ctx?.activeWorkspaceStartTabId,
        dashboardName: canvas?.dashboardName,
      }),
    [canvas?.blocksByPage, canvas?.dashboardName, ctx?.activeWorkspaceStartTabId, ctx?.workspaceStartTabs],
  );

  const visibleConfigs = model.configs.filter((config) => !removedIds.includes(config.id));
  const removed = model.configs.filter((config) => removedIds.includes(config.id));
  const active = visibleConfigs.find((config) => config.id === activeId) || visibleConfigs[0] || null;
  const selectedIds = membership == null ? active?.assetIds || [] : membership;
  const selected = selectedIds.map((id) => model.assets.find((asset) => asset.id === id)).filter(Boolean);
  const available = model.assets.filter((asset) => !selectedIds.includes(asset.id));

  useEffect(() => {
    if (!open) return;
    setRemovedIds([]);
    setMembership(null);
    setDirty(false);
    setCopied(false);
    setActiveId("");
  }, [open]);

  useEffect(() => {
    if (!open || dirty || !active) return;
    const picked = (membership == null ? active.assetIds : membership)
      .map((id) => model.assets.find((asset) => asset.id === id))
      .filter(Boolean);
    setHeadline(active.headline || model.dashboardName);
    setCaption(shareCaption(picked, model.dashboardName));
  }, [active, dirty, membership, model.assets, model.dashboardName, open]);

  const chooseConfig = (id) => {
    setActiveId(id);
    setMembership(null);
    setDirty(false);
  };

  const setPieces = (ids) => {
    setMembership(ids);
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
      /* keep the editable caption */
    } finally {
      setBusy(null);
    }
  }, [caption]);

  const handleX = useCallback(() => {
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
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://lycheedata.com")}`,
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
      const payload = { files: [file], text: caption, title: headline, url: "https://lycheedata.com" };
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
        overlayClassName="z-[560]"
        className="z-[560] flex max-h-[92vh] w-[min(100%,72rem)] max-w-[72rem] flex-col gap-4 overflow-hidden sm:rounded-2xl"
      >
        <DialogHeader>
          <DialogTitle>Share this dashboard</DialogTitle>
          <DialogDescription>
            These cards are built from the sheets on every tab. Add or remove pieces, edit the copy, then download an image or post it.
            Instagram and TikTok need a saved image plus the caption.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-5 overflow-hidden lg:grid-cols-[minmax(0,22rem)_1fr]">
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Configurations</p>
                {removed.length ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                        <Plus className="size-3" />
                        Add
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="!z-[580] w-64">
                      {removed.map((config) => (
                        <DropdownMenuItem
                          key={config.id}
                          onSelect={() => {
                            setRemovedIds((prev) => prev.filter((id) => id !== config.id));
                            chooseConfig(config.id);
                          }}
                        >
                          {config.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
              <div className="flex max-h-52 flex-col gap-1.5 overflow-y-auto">
                {visibleConfigs.map((config) => {
                  const on = config.id === active?.id;
                  return (
                    <div
                      key={config.id}
                      className={cn(
                        "flex items-start gap-1 rounded-xl border px-2 py-1.5",
                        on ? "border-foreground/25 bg-foreground/[0.04]" : "border-border",
                      )}
                    >
                      <button type="button" onClick={() => chooseConfig(config.id)} className="min-w-0 flex-1 px-1 py-0.5 text-left">
                        <p className="truncate text-[13px] font-medium">{config.label}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{config.blurb}</p>
                      </button>
                      {visibleConfigs.length > 1 ? (
                        <button
                          type="button"
                          aria-label={`Remove ${config.label}`}
                          onClick={() => {
                            setRemovedIds((prev) => [...prev, config.id]);
                            if (on) {
                              const next = visibleConfigs.find((item) => item.id !== config.id);
                              if (next) chooseConfig(next.id);
                            }
                          }}
                          className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <X className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {model.assets.length ? (
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">On this card</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setPieces(selectedIds.filter((id) => id !== asset.id))}
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-foreground/15 bg-foreground px-2.5 py-1 text-[11px] font-medium text-background"
                    >
                      <span className="truncate">{asset.market || asset.title}</span>
                      <span className="opacity-70">{pieceLabel(asset)}</span>
                      <X className="size-3 shrink-0" />
                    </button>
                  ))}
                  {available.length ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="size-3" />
                          Add a piece
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="!z-[580] max-h-72 w-72 overflow-y-auto">
                        {available.map((asset) => (
                          <DropdownMenuItem key={asset.id} onSelect={() => setPieces([...selectedIds, asset.id])}>
                            <span className="truncate">{asset.market || asset.title}</span>
                            <span className="ml-auto pl-3 text-[11px] text-muted-foreground">{pieceLabel(asset)}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="workspace-share-headline">Headline</Label>
              <Input
                id="workspace-share-headline"
                value={headline}
                maxLength={140}
                onChange={(event) => {
                  setDirty(true);
                  setHeadline(event.target.value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="workspace-share-caption">Caption</Label>
              <Textarea
                id="workspace-share-caption"
                value={caption}
                onChange={(event) => {
                  setDirty(true);
                  setCaption(event.target.value);
                }}
                className="min-h-[8rem] font-mono text-xs"
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
              Instagram and TikTok don’t accept a web post. Save the image, paste the caption, and reply with lycheedata.com so people can build their own dashboard.
            </p>
          </div>

          <div className="flex min-h-0 items-start justify-center overflow-auto rounded-xl border border-border bg-zinc-950/80 p-4">
            <div className="relative shrink-0 overflow-hidden rounded-lg shadow-2xl" style={{ width: 1080 * 0.4, height: 1350 * 0.4 }}>
              <ShareCard
                cardRef={cardRef}
                headline={headline || model.dashboardName}
                emphasis={active?.emphasis || "empty"}
                assets={selected}
                tabs={model.tabs}
                dashboardName={model.dashboardName}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShareCard({ cardRef, headline, emphasis, assets, tabs, dashboardName }) {
  const prices = assets.filter((asset) => asset.kind === "price" && asset.points?.length >= 2);
  const books = assets.filter((asset) => asset.kind === "book" && (asset.bids?.length || asset.asks?.length));
  const sheets = assets.filter((asset) => asset.kind === "sheet");
  const hero = emphasis === "compare" ? null : prices[0] || null;
  const compared = emphasis === "compare" ? prices.slice(0, 4) : [];
  const showMosaic = emphasis === "mosaic" || emphasis === "empty";
  const accent = hero && hero.changePct != null && hero.changePct < 0 ? DOWN : hero ? UP : BLUE;

  return (
    <article
      ref={cardRef}
      className="relative flex flex-col overflow-hidden text-white"
      style={{
        width: 1080,
        height: 1350,
        transform: "scale(0.4)",
        transformOrigin: "top left",
        background: "#111318",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div className="h-2 shrink-0" style={{ background: `linear-gradient(90deg, ${BLUE}, ${UP})` }} />
      <div className="flex items-center justify-between px-14 pt-10">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="" width={56} height={56} className="size-14 rounded-full object-contain" />
          <div>
            <p className="text-2xl font-semibold tracking-tight">Created with Lychee</p>
            <p className="text-lg uppercase tracking-[0.22em] text-white/45">Dashboard</p>
          </div>
        </div>
        <p className="max-w-[16rem] truncate rounded-full border border-white/15 px-5 py-2 font-mono text-lg text-white/70">
          {dashboardName}
        </p>
      </div>

      <div className="px-14 pt-7">
        <p className="line-clamp-3 text-[40px] font-semibold leading-[1.15] tracking-tight">{headline}</p>
        {hero?.caption ? <p className="mt-3 line-clamp-2 text-xl text-white/50">{hero.caption}</p> : null}
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-5 px-14">
        {hero ? (
          <div className="flex min-h-0 flex-[1.3] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7">
            <div className="mb-2 flex items-end justify-between gap-6">
              <div>
                <p className="text-lg uppercase tracking-[0.16em] text-white/45">{hero.side || "Price"}</p>
                <p className="mt-1 font-mono text-6xl font-semibold leading-none" style={{ color: accent }}>
                  {formatSharePrice(hero.last)}
                </p>
              </div>
              {formatShareChange(hero.changePct) ? (
                <p className="font-mono text-3xl" style={{ color: accent }}>
                  {formatShareChange(hero.changePct)}
                </p>
              ) : null}
            </div>
            <PriceSpark points={hero.points} color={accent} />
          </div>
        ) : null}

        {compared.length ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {compared.map((price) => {
              const color = price.changePct != null && price.changePct < 0 ? DOWN : UP;
              return (
                <div key={price.id} className="flex min-h-0 flex-1 items-center gap-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] px-7">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-3 text-[28px] font-semibold leading-tight">{price.market || price.title}</p>
                    <p className="mt-2 truncate text-lg text-white/45">{price.side || price.tabName}</p>
                  </div>
                  <PriceSpark points={price.points} color={color} compact />
                  <div className="w-40 shrink-0 text-right">
                    <p className="font-mono text-4xl font-semibold leading-none" style={{ color }}>
                      {formatSharePrice(price.last)}
                    </p>
                    <p className="mt-2 font-mono text-xl" style={{ color }}>
                      {formatShareChange(price.changePct) || "—"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {books.length ? (
          <div className={cn("grid min-h-0 gap-4", books.length > 1 ? "grid-cols-2" : "grid-cols-1", hero ? "flex-[0.9]" : "flex-1")}>
            {books.slice(0, 2).map((book) => (
              <BookPanel key={book.id} book={book} />
            ))}
          </div>
        ) : null}

        {(emphasis === "hero" || emphasis === "books") && sheets.length ? (
          <div className="grid shrink-0 grid-cols-2 gap-3">
            {sheets.slice(0, 4).map((sheet) => (
              <div key={sheet.id} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
                <p className="truncate text-lg uppercase tracking-[0.14em] text-white/40">{sheet.title}</p>
                <p className="mt-2 line-clamp-2 text-2xl font-medium leading-snug">{sheet.caption || sheet.market || sheet.tabName}</p>
              </div>
            ))}
          </div>
        ) : null}

        {showMosaic ? <WorkspaceMosaic assets={assets} tabs={tabs} dashboardName={dashboardName} /> : null}
      </div>

      <div className="mt-auto px-14 pb-10 pt-6">
        <div className="flex items-end justify-between gap-8 border-t border-white/10 pt-6">
          <div>
            <p className="text-3xl font-semibold">Created with Lychee</p>
            <p className="mt-1 text-xl text-white/50">{assets.length ? `${assets.length} pieces` : "Your dashboard"}</p>
          </div>
          <div className="text-right">
            <p className="text-xl text-white/50">Build your own</p>
            <p className="font-mono text-2xl text-white/90">lycheedata.com</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function PriceSpark({ points, color, compact = false }) {
  const geo = sparkGeometry(points, compact ? 280 : 900, compact ? 88 : 280);
  return (
    <svg viewBox={compact ? "0 0 280 88" : "0 0 900 280"} className={cn(compact ? "h-24 w-64 shrink-0" : "min-h-0 w-full flex-1")} role="img" aria-label="Price">
      {geo.area ? <path d={geo.area} fill={color} opacity="0.16" /> : null}
      {geo.line ? <path d={geo.line} fill="none" stroke={color} strokeWidth={compact ? 4 : 6} strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  );
}

function BookPanel({ book }) {
  const max = Math.max(1, book.bidSize + book.askSize, ...book.bids.map((level) => level.size), ...book.asks.map((level) => level.size));
  const asks = [...book.asks].slice(0, 4).reverse();
  const bids = book.bids.slice(0, 4);
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-lg uppercase tracking-[0.16em] text-white/45">Order book</p>
          <p className="mt-1 line-clamp-1 text-2xl font-semibold">{book.market || book.title}</p>
        </div>
        <p className="font-mono text-3xl font-semibold">{formatSharePrice(book.mid)}</p>
      </div>
      <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-white/10">
        <span className="h-full" style={{ width: `${(book.bidSize / max) * 100}%`, background: UP }} />
        <span className="h-full" style={{ width: `${(book.askSize / max) * 100}%`, background: DOWN }} />
      </div>
      <div className="space-y-1.5 font-mono text-lg">
        {asks.map((level, index) => (
          <LevelRow key={`a-${index}`} price={level.price} size={level.size} max={max} side="ask" />
        ))}
        <div className="h-px bg-white/10" />
        {bids.map((level, index) => (
          <LevelRow key={`b-${index}`} price={level.price} size={level.size} max={max} side="bid" />
        ))}
      </div>
    </div>
  );
}

function LevelRow({ price, size, max, side }) {
  return (
    <div className="relative flex items-center justify-between overflow-hidden rounded-md px-2 py-1">
      <span
        className="absolute inset-y-0 right-0"
        style={{
          width: `${Math.max(8, (size / max) * 100)}%`,
          background: side === "bid" ? "rgba(40,204,149,0.22)" : "rgba(251,113,133,0.22)",
        }}
      />
      <span className="relative">{formatSharePrice(price)}</span>
      <span className="relative text-white/55">{formatQty(size)}</span>
    </div>
  );
}

function WorkspaceMosaic({ assets, tabs, dashboardName }) {
  const groups = (tabs.length ? tabs : [{ id: "none", name: dashboardName, charts: [] }])
    .map((tab) => ({
      ...tab,
      pieces: assets.filter((asset) => asset.tabId === tab.id),
    }))
    .filter((tab) => tab.pieces.length);
  const list = groups.length ? groups : [{ id: "none", name: dashboardName, charts: [], pieces: [] }];
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <p className="mb-4 text-lg uppercase tracking-[0.16em] text-white/45">Workspace</p>
      <div className="flex min-h-0 flex-1 flex-wrap content-start gap-3">
        {list.slice(0, 6).map((tab) => (
          <div key={tab.id} className="min-w-[46%] flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
            <p className="truncate text-2xl font-semibold">{tab.name}</p>
            <p className="mt-1 text-lg text-white/40">
              {tab.pieces.length} sheets{tab.charts?.length ? ` · ${tab.charts.length} charts` : ""}
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              {tab.pieces.slice(0, 3).map((asset) => (
                <p key={asset.id} className="truncate text-lg text-white/70">
                  {asset.market || asset.title}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
