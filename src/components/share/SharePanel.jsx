"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Check,
  ClipboardCopy,
  Copy,
  Download,
  Film,
  ImageIcon,
  LayoutPanelTop,
  Link2,
  Loader2,
  Mail,
  Plus,
  Search,
  Share2,
  Sparkles,
  Table2,
  Trophy,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { captureNodePng } from "@/components/dashboardComposer/blockExport";
import { cn } from "@/lib/utils";
import { PIECE_DRAG_TYPE, SHARE_ACCENTS, SHARE_FORMATS, ShareCard, shareCardFilter } from "./ShareCard";
import { ShareMotion } from "./MotionStudio";
import { ShareSessions } from "./shareSessions";
import { PIECE_KIND_LABEL, starterPieces } from "./shareLibrary";

const KIND_ICON = {
  panel: LayoutPanelTop,
  chart: BarChart3,
  price: BarChart3,
  book: BarChart3,
  sheet: Table2,
  text: Type,
  score: Trophy,
};

let itemSeq = 0;
function newItem(pieceId, span = 1) {
  itemSeq += 1;
  return { key: `item-${Date.now().toString(36)}-${itemSeq}`, pieceId, span };
}

/** Wide pieces read best across the card; small stat panels sit side by side. */
function defaultSpan(piece) {
  if (!piece) return 1;
  if (piece.kind === "score" || piece.kind === "text") return 1;
  if (piece.block?.panel === "market.stats" || piece.block?.panel === "trader.stats") return 1;
  return 2;
}

function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(",");
  const type = /data:([^;]+)/.exec(head)?.[1] || "image/png";
  const bytes = atob(body);
  const array = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) array[index] = bytes.charCodeAt(index);
  return new Blob([array], { type });
}

function slugName(text) {
  return String(text || "card").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "card";
}

function buildCaption({ headline, pieces, url }) {
  const lines = [headline];
  const picked = pieces.slice(0, 4).map((piece) => `· ${piece.title}${piece.detail && piece.detail !== headline ? ` (${piece.detail})` : ""}`);
  if (picked.length) lines.push("", ...picked);
  lines.push("", url, "Made with Lychee");
  return lines.join("\n");
}

function OptionGroup({ label, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Library({ groups, onAdd, onSolo, onMotion, used }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = groups
    .map((group) => ({
      ...group,
      pieces: needle
        ? group.pieces.filter((piece) => `${piece.title} ${piece.detail} ${group.label}`.toLowerCase().includes(needle))
        : group.pieces,
    }))
    .filter((group) => group.pieces.length);
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a panel, sheet or chart"
          aria-label="Find a piece"
          className="h-8 pl-8 text-[13px]"
        />
      </div>
      <p className="text-[11.5px] text-muted-foreground">Drag onto the card, or use + to add. Every panel, sheet and chart on every tab is here.</p>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {shown.length ? (
          shown.map((group) => (
            <section key={group.tab.id} aria-label={group.label}>
              <p className="sticky top-0 z-10 truncate bg-background py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.pieces.map((piece) => {
                  const Icon = KIND_ICON[piece.kind] || LayoutPanelTop;
                  const inUse = used.has(piece.id);
                  return (
                    <li
                      key={piece.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "copy";
                        event.dataTransfer.setData(PIECE_DRAG_TYPE, piece.id);
                      }}
                      className="group/piece flex cursor-grab items-center gap-2 rounded-lg border border-border/70 bg-card px-2 py-1.5 hover:border-foreground/20 active:cursor-grabbing"
                    >
                      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <button type="button" onClick={() => onSolo(piece.id)} className="min-w-0 flex-1 text-left" title="Make a card of just this">
                        <p className="truncate text-[12.5px] font-medium text-foreground">{piece.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {PIECE_KIND_LABEL[piece.kind]}
                          {piece.detail ? ` · ${piece.detail}` : ""}
                        </p>
                      </button>
                      {piece.motion ? (
                        <button
                          type="button"
                          onClick={() => onMotion(piece.id)}
                          aria-label={`Animate ${piece.title}`}
                          title="Record it as a video or GIF"
                          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Film className="size-3.5" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onAdd(piece.id)}
                        aria-label={`Add ${piece.title} to the card`}
                        className={cn(
                          "inline-flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-muted",
                          inUse ? "text-[#0d99ff]" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {inUse ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        ) : (
          <p className="py-6 text-center text-[12px] text-muted-foreground">
            {groups.length ? "Nothing matches that." : "Add a panel, sheet or chart to a tab and it shows up here."}
          </p>
        )}
      </div>
    </div>
  );
}

function ScaledPreview({ spec, children }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth - 32;
      const h = el.clientHeight - 32;
      if (w > 0 && h > 0) setScale(Math.min(1, w / spec.w, h / spec.h));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [spec.h, spec.w]);
  return (
    <div ref={ref} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-border bg-[repeating-conic-gradient(theme(colors.neutral.100)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] dark:bg-[repeating-conic-gradient(theme(colors.neutral.900)_0%_25%,transparent_0%_50%)]">
      <div className="relative shrink-0 overflow-hidden rounded-lg shadow-2xl" style={{ width: spec.w * scale, height: spec.h * scale }}>
        <div className="absolute left-0 top-0" style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * The Share tab: any piece of the dashboard on a Lychee card, alone or composed with others,
 * exported as an image, a video or a GIF, or posted straight to a network.
 */
export function SharePanel({ groups, activeTabId, handle, shareUrl, defaultHeadline }) {
  const pieces = useMemo(() => Object.fromEntries(groups.flatMap((group) => group.pieces.map((piece) => [piece.id, piece]))), [groups]);
  const [items, setItems] = useState(() => starterPieces(groups, activeTabId).map((id) => newItem(id, 1)));
  const [mode, setMode] = useState("image");
  const [motionId, setMotionId] = useState("");
  const [format, setFormat] = useState("portrait");
  const [theme, setTheme] = useState("dark");
  const [accent, setAccent] = useState("lychee");
  const [headline, setHeadline] = useState("");
  const [subhead, setSubhead] = useState("");
  const [caption, setCaption] = useState("");
  const [edited, setEdited] = useState({ headline: false, subhead: false, caption: false });
  const [busy, setBusy] = useState("");
  const [copied, setCopied] = useState("");
  const cardRef = useRef(null);

  const spec = SHARE_FORMATS[format];
  const displayUrl = shareUrl.replace(/^https?:\/\//, "");
  const cardPieces = items.map((item) => pieces[item.pieceId]).filter(Boolean);
  const motionPiece = pieces[motionId] || cardPieces.find((piece) => piece.motion) || groups.flatMap((group) => group.pieces).find((piece) => piece.motion) || null;
  const used = useMemo(() => new Set(items.map((item) => item.pieceId)), [items]);
  const firstGroup = groups.find((group) => group.pieces.some((piece) => piece.id === cardPieces[0]?.id));
  const autoHeadline = firstGroup?.subject || cardPieces[0]?.detail || defaultHeadline;
  const autoSubhead = cardPieces.length > 1 ? cardPieces.map((piece) => piece.title).slice(0, 3).join(" · ") : cardPieces[0]?.title || "";

  useEffect(() => {
    if (!edited.headline) setHeadline(autoHeadline || "");
  }, [autoHeadline, edited.headline]);
  useEffect(() => {
    if (!edited.subhead) setSubhead(autoSubhead);
  }, [autoSubhead, edited.subhead]);
  useEffect(() => {
    if (!edited.caption) setCaption(buildCaption({ headline: headline || defaultHeadline, pieces: mode === "motion" && motionPiece ? [motionPiece] : cardPieces, url: shareUrl }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edited.caption, headline, defaultHeadline, mode, motionPiece?.id, items, shareUrl]);

  const sessionTabs = useMemo(() => {
    const ids = new Set([...cardPieces.map((piece) => piece.tabId), ...(mode === "motion" && motionPiece ? [motionPiece.tabId] : [])]);
    return groups.map((group) => group.tab).filter((tab) => ids.has(tab.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, items, mode, motionPiece?.id]);

  const addPiece = useCallback(
    (pieceId, beforeKey = "") => {
      setMode("image");
      setItems((prev) => {
        const item = newItem(pieceId, defaultSpan(pieces[pieceId]));
        const index = beforeKey ? prev.findIndex((entry) => entry.key === beforeKey) : -1;
        if (index < 0) return [...prev, item];
        return [...prev.slice(0, index), item, ...prev.slice(index)];
      });
    },
    [pieces],
  );
  const soloPiece = (pieceId) => {
    setMode("image");
    setItems([newItem(pieceId, 2)]);
    setEdited((prev) => ({ ...prev, headline: false, subhead: false }));
  };
  const animatePiece = (pieceId) => {
    setMotionId(pieceId);
    setMode("motion");
  };

  const capture = useCallback(async () => {
    const node = cardRef.current;
    if (!node) throw new Error("The card isn't ready yet.");
    const options = {
      width: spec.w,
      height: spec.h,
      pixelRatio: spec.scale,
      filter: shareCardFilter,
      backgroundColor: theme === "light" ? "#f6f7f9" : "#0b0d12",
    };
    try {
      return await captureNodePng(node, options);
    } catch {
      return captureNodePng(node, { ...options, skipFonts: true });
    }
  }, [spec, theme]);

  const run = async (kind, task) => {
    if (busy) return;
    setBusy(kind);
    try {
      await task();
    } catch (error) {
      toast.error(error?.message || "That didn't work. Try again.");
    } finally {
      setBusy("");
    }
  };
  const flash = (kind) => {
    setCopied(kind);
    window.setTimeout(() => setCopied((value) => (value === kind ? "" : value)), 1600);
  };
  const fileName = `lychee-${slugName(headline)}`;

  const download = () =>
    run("png", async () => {
      const link = document.createElement("a");
      link.href = await capture();
      link.download = `${fileName}.png`;
      link.click();
    });
  const copyImage = () =>
    run("copy-image", async () => {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("This browser can't copy images. Download it instead.");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": capture().then(dataUrlToBlob) })]);
      flash("image");
    });
  const nativeShare = () =>
    run("native", async () => {
      const file = new File([dataUrlToBlob(await capture())], `${fileName}.png`, { type: "image/png" });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], text: caption, title: headline }).catch((error) => {
          if (error?.name !== "AbortError") throw error;
        });
        return;
      }
      throw new Error("Sharing files isn't supported here. Download the image and attach it.");
    });
  const copyText = (kind, text) => async () => {
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    flash(kind);
  };
  const open = (href) => window.open(href, "_blank", "noopener,noreferrer");
  const enc = encodeURIComponent;
  const networks = [
    { id: "x", label: "X", href: `https://x.com/intent/post?text=${enc(caption)}` },
    { id: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}` },
    { id: "reddit", label: "Reddit", href: `https://www.reddit.com/submit?url=${enc(shareUrl)}&title=${enc(headline || defaultHeadline)}` },
    { id: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(headline || defaultHeadline)}` },
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${enc(caption)}` },
  ];

  return (
    <ShareSessions tabs={sessionTabs}>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)_17rem]">
        <Library groups={groups} used={used} onAdd={(id) => addPiece(id)} onSolo={soloPiece} onMotion={animatePiece} />

        <div className="flex min-h-0 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div role="tablist" aria-label="What to make" className="flex items-center rounded-lg border border-border p-0.5">
              {[
                { id: "image", label: "Image", icon: ImageIcon },
                { id: "motion", label: "Video & GIF", icon: Film },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === tab.id}
                  onClick={() => setMode(tab.id)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium",
                    mode === tab.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <tab.icon className="size-3.5" aria-hidden />
                  {tab.label}
                </button>
              ))}
            </div>
            <p className="truncate text-[11.5px] text-muted-foreground">
              {mode === "image" ? "Drag pieces to reorder. Hover one to resize or remove it." : motionPiece ? `Animating ${motionPiece.title}` : ""}
            </p>
          </div>
          {mode === "image" ? (
            <ScaledPreview spec={spec}>
              <ShareCard
                ref={cardRef}
                format={format}
                theme={theme}
                accent={accent}
                headline={headline}
                subhead={subhead}
                handle={handle}
                url={displayUrl}
                items={items}
                pieces={pieces}
                onItemsChange={setItems}
                onDropPiece={addPiece}
              />
            </ScaledPreview>
          ) : motionPiece ? (
            <ShareMotion
              key={motionPiece.id}
              piece={motionPiece}
              format={format}
              theme={theme}
              accent={accent}
              handle={handle}
              url={displayUrl}
              headline={headline}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-center">
              <Sparkles className="size-5 text-muted-foreground" aria-hidden />
              <p className="max-w-sm text-[13px] text-muted-foreground">
                Price charts and PnL lines can be recorded drawing themselves, with the news that broke along the way. Open a market or trader tab to get one.
              </p>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          <OptionGroup label="Size">
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(SHARE_FORMATS).map(([id, item]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={format === id}
                  onClick={() => setFormat(id)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-left",
                    format === id ? "border-[#0d99ff] bg-[#0d99ff]/[0.06]" : "border-border hover:border-foreground/20",
                  )}
                >
                  <span className="block text-[12px] font-medium text-foreground">
                    {item.label} <span className="text-muted-foreground">{item.ratio}</span>
                  </span>
                  <span className="block truncate text-[10.5px] text-muted-foreground">{item.hint}</span>
                </button>
              ))}
            </div>
          </OptionGroup>
          <OptionGroup label="Style">
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border p-0.5">
                {["dark", "light"].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={theme === value}
                    onClick={() => setTheme(value)}
                    className={cn("h-7 rounded-md px-2.5 text-[12px] font-medium capitalize", theme === value ? "bg-foreground text-background" : "text-muted-foreground")}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1" role="radiogroup" aria-label="Accent">
                {Object.entries(SHARE_ACCENTS).map(([id, item]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={accent === id}
                    aria-label={item.label}
                    onClick={() => setAccent(id)}
                    className={cn("size-6 rounded-full border-2", accent === id ? "border-foreground" : "border-transparent")}
                    style={{ background: `linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1]})` }}
                  />
                ))}
              </div>
            </div>
          </OptionGroup>
          <div className="space-y-1.5">
            <Label htmlFor="share-headline" className="text-[12px]">
              Headline
            </Label>
            <Input
              id="share-headline"
              value={headline}
              maxLength={120}
              onChange={(event) => {
                setEdited((prev) => ({ ...prev, headline: true }));
                setHeadline(event.target.value);
              }}
              className="h-8 text-[13px]"
            />
          </div>
          {mode === "image" ? (
            <div className="space-y-1.5">
              <Label htmlFor="share-subhead" className="text-[12px]">
                Subheading
              </Label>
              <Input
                id="share-subhead"
                value={subhead}
                maxLength={160}
                onChange={(event) => {
                  setEdited((prev) => ({ ...prev, subhead: true }));
                  setSubhead(event.target.value);
                }}
                className="h-8 text-[13px]"
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="share-caption" className="text-[12px]">
                Post text
              </Label>
              <button type="button" onClick={copyText("caption", caption)} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                {copied === "caption" ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copied === "caption" ? "Copied" : "Copy"}
              </button>
            </div>
            <Textarea
              id="share-caption"
              value={caption}
              onChange={(event) => {
                setEdited((prev) => ({ ...prev, caption: true }));
                setCaption(event.target.value);
              }}
              className="min-h-[7rem] text-[12px]"
            />
          </div>
          {mode === "image" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <Button type="button" size="sm" onClick={download} disabled={!!busy || !items.length}>
                  {busy === "png" ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                  Download
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={copyImage} disabled={!!busy || !items.length}>
                  {busy === "copy-image" ? <Loader2 className="size-3.5 animate-spin" /> : copied === "image" ? <Check className="size-3.5" /> : <ClipboardCopy className="size-3.5" />}
                  {copied === "image" ? "Copied" : "Copy image"}
                </Button>
              </div>
              <Button type="button" size="sm" variant="outline" className="w-full" onClick={nativeShare} disabled={!!busy || !items.length}>
                {busy === "native" ? <Loader2 className="size-3.5 animate-spin" /> : <Share2 className="size-3.5" />}
                Share to an app (Instagram, TikTok…)
              </Button>
            </div>
          ) : null}
          <OptionGroup label="Post it">
            <div className="grid grid-cols-3 gap-1.5">
              {networks.map((network) => (
                <Button key={network.id} type="button" size="sm" variant="outline" className="h-8 px-2 text-[12px]" onClick={() => open(network.href)}>
                  {network.label}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2 text-[12px]"
                onClick={() => open(`mailto:?subject=${enc(headline || defaultHeadline)}&body=${enc(caption)}`)}
              >
                <Mail className="size-3.5" />
                Email
              </Button>
            </div>
            <Button type="button" size="sm" variant="ghost" className="w-full justify-start text-[12px]" onClick={copyText("link", shareUrl)}>
              {copied === "link" ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
              {copied === "link" ? "Link copied" : `Copy link · ${displayUrl}`}
            </Button>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Networks take text and a link; attach the downloaded image or video to the post. Instagram and TikTok only take posts from their apps, so use Share to an app on your phone.
            </p>
          </OptionGroup>
        </div>
      </div>
    </ShareSessions>
  );
}
