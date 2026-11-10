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

const MODES = [
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "motion", label: "Video & GIF", icon: Film },
];

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

/** Whether this browser can hand an image to another app (the phone share sheet, mostly). */
function canShareFiles() {
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File([""], "card.png", { type: "image/png" })] });
  } catch {
    return false;
  }
}

function Section({ title, action, children }) {
  return (
    <section className="space-y-2">
      <div className="flex h-5 items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Segmented({ label, options, value, onChange, className }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-lg bg-muted p-0.5", className)}>
      {options.map((option) => {
        const on = value === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.id)}
            className={cn(
              "inline-flex h-7 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[12px] font-medium transition-colors",
              on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ResetButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="text-[11px] font-medium text-muted-foreground hover:text-foreground">
      Reset
    </button>
  );
}

/** A box drawn at the format's aspect ratio. */
function RatioGlyph({ spec, on }) {
  const long = 16;
  const scale = long / Math.max(spec.w, spec.h);
  return (
    <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden>
      <span
        className={cn("rounded-[3px] border-[1.5px]", on ? "border-[#0d99ff] bg-[#0d99ff]/15" : "border-muted-foreground/60")}
        style={{ width: Math.round(spec.w * scale), height: Math.round(spec.h * scale) }}
      />
    </span>
  );
}

function Library({ groups, onToggle, onMotion, used }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const total = groups.reduce((sum, group) => sum + group.pieces.length, 0);
  const shown = groups
    .map((group) => ({
      ...group,
      pieces: needle
        ? group.pieces.filter((piece) => `${piece.title} ${piece.detail} ${group.label}`.toLowerCase().includes(needle))
        : group.pieces,
    }))
    .filter((group) => group.pieces.length);
  return (
    <aside aria-label="Pieces" className="flex min-h-0 flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold text-foreground">Pieces</h3>
        <span className="text-[11.5px] tabular-nums text-muted-foreground">{used.size ? `${used.size} on card` : `${total} available`}</span>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a panel, sheet or chart"
          aria-label="Find a piece"
          className="h-8 pl-8 text-[13px]"
        />
      </div>
      <div className="-mr-1 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {shown.length ? (
          shown.map((group) => (
            <section key={group.tab.id} aria-label={group.label}>
              <p className="sticky top-0 z-10 truncate bg-background pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
                      className={cn(
                        "group/piece flex items-center gap-1 rounded-lg border pr-1 transition-colors",
                        inUse ? "border-[#0d99ff]/40 bg-[#0d99ff]/[0.06]" : "border-border/70 bg-card hover:border-foreground/20 hover:bg-muted/40",
                      )}
                    >
                      <button
                        type="button"
                        aria-pressed={inUse}
                        onClick={() => onToggle(piece.id)}
                        title={inUse ? "Take it off the card" : "Add it to the card, or drag it to a spot"}
                        className="flex min-w-0 flex-1 cursor-grab items-center gap-2.5 py-1.5 pl-2 text-left active:cursor-grabbing"
                      >
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-md",
                            inUse ? "bg-[#0d99ff] text-white" : "bg-muted text-muted-foreground group-hover/piece:text-foreground",
                          )}
                          aria-hidden
                        >
                          {inUse ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium text-foreground">{piece.title}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {PIECE_KIND_LABEL[piece.kind]}
                            {piece.detail && piece.detail !== group.label && piece.detail !== group.subject ? ` · ${piece.detail}` : ""}
                          </span>
                        </span>
                        {inUse ? null : <Plus className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/piece:opacity-100" aria-hidden />}
                      </button>
                      {piece.motion ? (
                        <button
                          type="button"
                          onClick={() => onMotion(piece.id)}
                          aria-label={`Animate ${piece.title}`}
                          title="Record it drawing itself, as a video or GIF"
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                        >
                          <Film className="size-3.5" />
                        </button>
                      ) : null}
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
    </aside>
  );
}

function ScaledPreview({ spec, children }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth - 48;
      const h = el.clientHeight - 48;
      if (w > 0 && h > 0) setScale(Math.min(1, w / spec.w, h / spec.h));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [spec.h, spec.w]);
  return (
    <div
      ref={ref}
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/50 bg-[radial-gradient(theme(colors.neutral.300)_1px,transparent_1px)] bg-[length:18px_18px] dark:bg-[radial-gradient(theme(colors.neutral.800)_1px,transparent_1px)]"
    >
      {scale ? (
        <div className="relative shrink-0 overflow-hidden rounded-lg shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]" style={{ width: spec.w * scale, height: spec.h * scale }}>
          <div className="absolute left-0 top-0" style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
            {children}
          </div>
        </div>
      ) : null}
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
  const [shareable] = useState(canShareFiles);
  const cardRef = useRef(null);

  const spec = SHARE_FORMATS[format];
  const displayUrl = shareUrl.replace(/^https?:\/\//, "");
  const cardPieces = items.map((item) => pieces[item.pieceId]).filter(Boolean);
  const motionPiece = pieces[motionId] || cardPieces.find((piece) => piece.motion) || groups.flatMap((group) => group.pieces).find((piece) => piece.motion) || null;
  const used = useMemo(() => new Set(items.map((item) => item.pieceId)), [items]);
  const firstGroup = groups.find((group) => group.pieces.some((piece) => piece.id === cardPieces[0]?.id));
  const autoHeadline = firstGroup?.subject || cardPieces[0]?.detail || defaultHeadline;
  const autoSubhead = cardPieces.length > 1 ? cardPieces.map((piece) => piece.title).slice(0, 3).join(" · ") : cardPieces[0]?.title || "";
  const empty = !items.length;

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
  const togglePiece = (pieceId) => {
    if (used.has(pieceId)) {
      setMode("image");
      setItems((prev) => prev.filter((item) => item.pieceId !== pieceId));
    } else addPiece(pieceId);
  };
  const animatePiece = (pieceId) => {
    setMotionId(pieceId);
    setMode("motion");
  };
  const edit = (field, setter) => (event) => {
    setEdited((prev) => ({ ...prev, [field]: true }));
    setter(event.target.value);
  };
  const reset = (field) => () => setEdited((prev) => ({ ...prev, [field]: false }));

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
      await navigator.share({ files: [file], text: caption, title: headline }).catch((error) => {
        if (error?.name !== "AbortError") throw error;
      });
    });
  const copyText = (kind, text) => async () => {
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    flash(kind);
  };
  const open = (href) => window.open(href, "_blank", "noopener,noreferrer");
  const enc = encodeURIComponent;
  const title = headline || defaultHeadline;
  const networks = [
    { id: "x", label: "X", href: `https://x.com/intent/post?text=${enc(caption)}` },
    { id: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}` },
    { id: "reddit", label: "Reddit", href: `https://www.reddit.com/submit?url=${enc(shareUrl)}&title=${enc(title)}` },
    { id: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(title)}` },
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${enc(caption)}` },
    { id: "email", label: "Email", href: `mailto:?subject=${enc(title)}&body=${enc(caption)}` },
  ];

  return (
    <ShareSessions tabs={sessionTabs}>
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[15.5rem_minmax(0,1fr)_18rem]">
        <Library groups={groups} used={used} onToggle={togglePiece} onMotion={animatePiece} />

        <div className="flex min-h-0 flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <Segmented label="What to make" options={MODES} value={mode} onChange={setMode} />
            {mode === "image" && !empty ? (
              <div className="flex min-w-0 items-center gap-3">
                <p className="truncate text-[11.5px] text-muted-foreground">Drag to reorder · hover a piece to resize or remove it</p>
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="shrink-0 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            ) : mode === "motion" && motionPiece ? (
              <p className="truncate text-[11.5px] text-muted-foreground">Animating {motionPiece.title}</p>
            ) : null}
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

        <div className="flex min-h-0 flex-col">
          <div className="-mr-1 min-h-0 flex-1 space-y-5 overflow-y-auto pb-4 pr-1">
            <Section title="Format">
              <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Format">
                {Object.entries(SHARE_FORMATS).map(([id, item]) => {
                  const on = format === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setFormat(id)}
                      title={`Good for ${item.hint}`}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors",
                        on ? "border-[#0d99ff] bg-[#0d99ff]/[0.06]" : "border-border hover:border-foreground/20",
                      )}
                    >
                      <RatioGlyph spec={item} on={on} />
                      <span className="min-w-0">
                        <span className="block text-[12px] font-medium text-foreground">{item.label}</span>
                        <span className="block text-[10.5px] tabular-nums text-muted-foreground">{item.ratio}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">Good for {spec.hint}.</p>
            </Section>

            <Section title="Look">
              <div className="flex items-center gap-3">
                <Segmented
                  label="Theme"
                  options={[
                    { id: "dark", label: "Dark" },
                    { id: "light", label: "Light" },
                  ]}
                  value={theme}
                  onChange={setTheme}
                  className="w-[7.5rem]"
                />
                <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Accent">
                  {Object.entries(SHARE_ACCENTS).map(([id, item]) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={accent === id}
                      aria-label={item.label}
                      title={item.label}
                      onClick={() => setAccent(id)}
                      className={cn(
                        "size-6 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                        accent === id ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-border",
                      )}
                      style={{ background: `linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1]})` }}
                    />
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Headline" action={edited.headline ? <ResetButton onClick={reset("headline")} /> : null}>
              <Input id="share-headline" aria-label="Headline" value={headline} maxLength={120} onChange={edit("headline", setHeadline)} className="h-8 text-[13px]" />
            </Section>
            {mode === "image" ? (
              <Section title="Subheading" action={edited.subhead ? <ResetButton onClick={reset("subhead")} /> : null}>
                <Input id="share-subhead" aria-label="Subheading" value={subhead} maxLength={160} onChange={edit("subhead", setSubhead)} className="h-8 text-[13px]" />
              </Section>
            ) : null}

            <Section
              title="Post"
              action={
                <span className="flex items-center gap-3">
                  {edited.caption ? <ResetButton onClick={reset("caption")} /> : null}
                  <button type="button" onClick={copyText("caption", caption)} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                    {copied === "caption" ? <Check className="size-3" /> : <Copy className="size-3" />}
                    {copied === "caption" ? "Copied" : "Copy text"}
                  </button>
                </span>
              }
            >
              <Textarea id="share-caption" aria-label="Post text" value={caption} onChange={edit("caption", setCaption)} className="min-h-[6.5rem] text-[12px] leading-relaxed" />
              <div className="grid grid-cols-3 gap-1.5">
                {networks.map((network) => (
                  <Button key={network.id} type="button" size="sm" variant="outline" className="h-8 px-2 text-[12px]" onClick={() => open(network.href)}>
                    {network.label}
                  </Button>
                ))}
              </div>
              <button
                type="button"
                onClick={copyText("link", shareUrl)}
                className="flex h-8 w-full items-center gap-2 rounded-md border border-dashed border-border px-2.5 text-left text-[12px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
              >
                {copied === "link" ? <Check className="size-3.5 shrink-0 text-emerald-600" /> : <Link2 className="size-3.5 shrink-0" />}
                <span className="min-w-0 flex-1 truncate font-mono text-[11.5px]">{displayUrl}</span>
                <span className="shrink-0 font-medium">{copied === "link" ? "Copied" : "Copy link"}</span>
              </button>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Networks take the text and link. Attach the image or video you download to the post.
              </p>
            </Section>
          </div>

          {mode === "image" ? (
            <div className="space-y-1.5 border-t border-border/70 pt-3">
              <Button type="button" className="h-9 w-full" onClick={download} disabled={!!busy || empty}>
                {busy === "png" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Download PNG
              </Button>
              <div className={cn("grid gap-1.5", shareable ? "grid-cols-2" : "grid-cols-1")}>
                <Button type="button" size="sm" variant="outline" onClick={copyImage} disabled={!!busy || empty}>
                  {busy === "copy-image" ? <Loader2 className="size-3.5 animate-spin" /> : copied === "image" ? <Check className="size-3.5" /> : <ClipboardCopy className="size-3.5" />}
                  {copied === "image" ? "Copied" : "Copy image"}
                </Button>
                {shareable ? (
                  <Button type="button" size="sm" variant="outline" onClick={nativeShare} disabled={!!busy || empty} title="Send it to Instagram, TikTok or any app">
                    {busy === "native" ? <Loader2 className="size-3.5 animate-spin" /> : <Share2 className="size-3.5" />}
                    Share to app
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ShareSessions>
  );
}
