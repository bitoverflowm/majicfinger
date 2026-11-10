"use client";

import { forwardRef, useState } from "react";
import { GripVertical, Maximize2, Minimize2, X } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { cn } from "@/lib/utils";
import { PIECE_KIND_LABEL } from "./shareLibrary";
import { SharePiece } from "./SharePiece";

function PieceFailed() {
  return <p className="flex flex-1 items-center justify-center px-4 text-center text-[12px] text-muted-foreground">This piece couldn&apos;t be drawn. Remove it or pick another.</p>;
}

/** Card sizes in layout pixels; `scale` takes them to the exported image. */
export const SHARE_FORMATS = {
  portrait: { label: "Portrait", ratio: "4:5", w: 720, h: 900, scale: 1.5, hint: "Instagram, LinkedIn" },
  square: { label: "Square", ratio: "1:1", w: 720, h: 720, scale: 1.5, hint: "Instagram, X" },
  landscape: { label: "Landscape", ratio: "16:9", w: 960, h: 540, scale: 2, hint: "X, LinkedIn, slides" },
  story: { label: "Story", ratio: "9:16", w: 540, h: 960, scale: 2, hint: "Stories, TikTok, Reels" },
};

export const SHARE_ACCENTS = {
  lychee: { label: "Lychee", colors: ["#0d99ff", "#28cc95"] },
  violet: { label: "Violet", colors: ["#7c3aed", "#ec4899"] },
  sunset: { label: "Sunset", colors: ["#f97316", "#f43f5e"] },
  mono: { label: "Mono", colors: ["#a3a3a3", "#f5f5f5"] },
};

/** Elements marked with this stay out of exported images: the editing handles. */
export const SHARE_CHROME = "data-share-chrome";

export function shareCardFilter(node) {
  return !(node instanceof Element && node.hasAttribute(SHARE_CHROME));
}

/** Drag type for pieces dragged in from the library. */
export const PIECE_DRAG_TYPE = "application/x-lychee-share-piece";

function draggedPiece(event) {
  return event.dataTransfer?.types?.includes(PIECE_DRAG_TYPE);
}

function Slot({ item, piece, headline, editable, dragging, onDragStart, onDragEnd, onDropOn, onDropPiece, onToggleSpan, onRemove }) {
  const [over, setOver] = useState(false);
  // The headline usually names the market already; don't repeat it over every piece.
  const tag = piece?.detail && piece.detail !== headline ? piece.detail : "";
  return (
    <div
      draggable={editable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.key);
        onDragStart(item.key);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (!editable || (!draggedPiece(event) && (!dragging || dragging === item.key))) return;
        event.preventDefault();
        event.stopPropagation();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setOver(false);
        const pieceId = event.dataTransfer.getData(PIECE_DRAG_TYPE);
        if (pieceId) onDropPiece?.(pieceId, item.key);
        else onDropOn(item.key);
      }}
      className={cn(
        "group/slot relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[18px] border border-border/70 bg-card/80 shadow-sm",
        editable && "cursor-grab active:cursor-grabbing",
        dragging === item.key && "opacity-40",
        over && "ring-2 ring-[#0d99ff]",
      )}
      style={{ gridColumn: item.span === 2 ? "span 2 / span 2" : "span 1 / span 1" }}
    >
      <div className="flex shrink-0 items-baseline gap-2 px-3.5 pb-1 pt-2.5">
        <p className="min-w-0 shrink-0 truncate text-[12px] font-semibold text-foreground" style={{ maxWidth: tag ? "60%" : "100%" }}>
          {piece?.title || PIECE_KIND_LABEL[piece?.kind] || "Piece"}
        </p>
        {tag ? <p className="min-w-0 flex-1 truncate text-right text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">{tag}</p> : null}
      </div>
      <div className="pointer-events-none flex min-h-0 flex-1 flex-col">
        {piece ? (
          <ErrorBoundary name="SharePiece" resetKey={piece} fallback={<PieceFailed />}>
            <SharePiece piece={piece} />
          </ErrorBoundary>
        ) : null}
      </div>
      {editable ? (
        <div
          {...{ [SHARE_CHROME]: "" }}
          className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-lg border border-border bg-background/95 p-0.5 opacity-0 shadow-sm transition-opacity group-hover/slot:opacity-100"
        >
          <span className="inline-flex size-6 items-center justify-center text-muted-foreground" aria-hidden>
            <GripVertical className="size-3.5" />
          </span>
          <button
            type="button"
            aria-label={item.span === 2 ? "Make half width" : "Make full width"}
            onClick={() => onToggleSpan(item.key)}
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {item.span === 2 ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
          <button
            type="button"
            aria-label={`Remove ${piece?.title || "piece"}`}
            onClick={() => onRemove(item.key)}
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * A share card: the Lychee header, a headline, the user's pieces in a two-column grid they
 * arrange by dragging, and a footer that says where it came from.
 */
export const ShareCard = forwardRef(function ShareCard(
  { format, theme, accent, headline, subhead, handle, url, items, pieces, editable = true, onItemsChange, onDropPiece },
  ref,
) {
  const [dropping, setDropping] = useState(false);
  const spec = SHARE_FORMATS[format] || SHARE_FORMATS.portrait;
  const [from, to] = (SHARE_ACCENTS[accent] || SHARE_ACCENTS.lychee).colors;
  const [dragging, setDragging] = useState("");
  const dark = theme !== "light";
  const narrow = spec.w < 640;
  const cols = narrow ? 1 : 2;
  const rows = Math.max(1, Math.ceil(items.reduce((sum, item) => sum + (cols === 1 ? 2 : item.span), 0) / 2));
  const move = (key, target) => {
    if (!key || key === target) return;
    const list = [...items];
    const fromIndex = list.findIndex((item) => item.key === key);
    const toIndex = list.findIndex((item) => item.key === target);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    onItemsChange?.(list);
  };

  return (
    <article
      ref={ref}
      className={cn("relative flex flex-col overflow-hidden", dark ? "dark bg-[#0b0d12] text-white" : "share-light bg-[#f6f7f9] text-neutral-900")}
      style={{ width: spec.w, height: spec.h, fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 60% at 0% 0%, ${from}${dark ? "33" : "22"}, transparent 60%), radial-gradient(90% 50% at 100% 100%, ${to}${dark ? "26" : "1a"}, transparent 60%)`,
        }}
      />
      <div className="relative h-1.5 shrink-0" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />
      <div className="relative flex min-h-0 flex-1 flex-col px-7 pb-5 pt-5">
        <header className="flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={26} height={26} className="size-[26px] rounded-full object-contain" />
            <span className="text-[15px] font-semibold tracking-tight">Lychee</span>
          </div>
          {handle ? (
            <span className={cn("truncate rounded-full border px-2.5 py-0.5 font-mono text-[12px]", dark ? "border-white/15 text-white/70" : "border-black/10 text-neutral-600")}>
              @{handle}
            </span>
          ) : null}
        </header>
        {headline ? <h2 className="mt-4 line-clamp-2 shrink-0 text-[28px] font-semibold leading-[1.15] tracking-tight">{headline}</h2> : null}
        {subhead ? <p className={cn("mt-1.5 line-clamp-2 shrink-0 text-[14px] leading-snug", dark ? "text-white/60" : "text-neutral-600")}>{subhead}</p> : null}
        <div
          className={cn("mt-4 grid min-h-0 flex-1 gap-3 rounded-[20px]", dropping && "ring-2 ring-[#0d99ff] ring-offset-4 ring-offset-transparent")}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
          onDragOver={(event) => {
            if (!editable || !draggedPiece(event)) return;
            event.preventDefault();
            setDropping(true);
          }}
          onDragLeave={() => setDropping(false)}
          onDrop={(event) => {
            setDropping(false);
            const pieceId = event.dataTransfer.getData(PIECE_DRAG_TYPE);
            if (!pieceId) return;
            event.preventDefault();
            onDropPiece?.(pieceId, "");
          }}
        >
          {items.length ? (
            items.map((item) => (
              <Slot
                key={item.key}
                item={cols === 1 ? { ...item, span: 1 } : item}
                piece={pieces[item.pieceId]}
                headline={headline}
                editable={editable}
                dragging={dragging}
                onDragStart={setDragging}
                onDragEnd={() => setDragging("")}
                onDropOn={(target) => {
                  move(dragging, target);
                  setDragging("");
                }}
                onDropPiece={onDropPiece}
                onToggleSpan={(key) => onItemsChange?.(items.map((entry) => (entry.key === key ? { ...entry, span: entry.span === 2 ? 1 : 2 } : entry)))}
                onRemove={(key) => onItemsChange?.(items.filter((entry) => entry.key !== key))}
              />
            ))
          ) : (
            <div
              {...{ [SHARE_CHROME]: "" }}
              className={cn(
                "col-span-full flex items-center justify-center rounded-[18px] border border-dashed text-center text-[14px]",
                dark ? "border-white/20 text-white/50" : "border-black/15 text-neutral-500",
              )}
            >
              Add pieces from the left to build your card.
            </div>
          )}
        </div>
        <footer className={cn("mt-4 flex shrink-0 items-center justify-between gap-3 border-t pt-3", dark ? "border-white/10" : "border-black/10")}>
          <p className="shrink-0 text-[13px] font-medium">Made with Lychee</p>
          <p className={cn("min-w-0 truncate font-mono text-[12.5px]", dark ? "text-white/75" : "text-neutral-700")}>{url}</p>
        </footer>
      </div>
    </article>
  );
});
