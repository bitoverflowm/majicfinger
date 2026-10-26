"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Check, Database, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  KALSHI_HISTORICAL_DEEP_CAPTION,
  kalshiHistoricalV2Caption,
  kalshiLiveCaption,
  useKalshiHistoricalCutoffDisplay,
} from "@/hooks/useKalshiHistoricalCutoffDisplay";
import { SpectrumLoadingState } from "@/components/ui/spectrum-loading-state";
import { IntegrationSamplePreview } from "@/components/dashboardComposer/integrationPreviewView";
import {
  isLivePreviewId,
  prefetchIntegrationPreviews,
} from "@/components/dashboardComposer/integrationPreviewSample";
import { LandingDemoMembersOnlyPortal } from "@/components/dashboardComposer/landingDemoMembersOnly";
import { buildIntegrationPickerRows } from "@/lib/connectIntegrationPickerRows";
import { cn } from "@/lib/utils";

const loadBuildWorkspace = () => import("@/components/dashboardComposer/integrationBuildWorkspace");

// The build workspace is the largest module behind the picker; the homepage demo opens on the picker.
const IntegrationBuildWorkspace = dynamic(
  () => import("@/components/dashboardComposer/integrationBuildWorkspace").then((m) => m.IntegrationBuildWorkspace),
  {
    loading: () => (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <SpectrumLoadingState label="Loading" />
      </div>
    ),
  },
);

function whenIdle(work) {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(work, { timeout: 2000 });
    return () => window.cancelIdleCallback(handle);
  }
  const timer = window.setTimeout(work, 300);
  return () => window.clearTimeout(timer);
}

const IntegrationConnectContext = createContext(null);

export function useIntegrationConnect() {
  return useContext(IntegrationConnectContext);
}

const PRIMARY_ORDER = [
  "kalshiHistorical",
  "kalshiHistoricalV2",
  "kalshiLive",
  "polymarketHistorical",
  "polymarket",
  "chainlink",
];

const BETA_ORDER = ["binance"];

const LANDING_DEMO_LOCKED_INTEGRATIONS = ["kalshiHistoricalV2"];

const LOGO_BG = {
  kalshiHistorical: "bg-[#28CC95]",
  kalshiHistoricalV2: "bg-[#28CC95]",
  kalshiLive: "bg-[#28CC95]",
  polymarket: "bg-[#2E5CFF]",
  polymarketHistorical: "bg-[#2E5CFF]",
  chainlink: "bg-[#375BD2]",
  binance: "bg-black",
};

const LOGO_MARK = {
  kalshiHistorical: "KH",
  kalshiHistoricalV2: "KH",
  kalshiLive: "K",
  polymarket: "P",
  polymarketHistorical: "PH",
  chainlink: "CL",
  binance: "B",
  coinGecko: "CG",
  geckoDex: "GT",
  twitter: "X",
  wallStreetBets: "WSB",
  productHunt: "Pr",
  shortSqueeze: "SS",
  secEdgar: "SEC",
  censusGov: "US",
  crunchbase: "CB",
  hackerNews: "HN",
  usTreasuries: "UT",
};

function logoMark(row) {
  if (LOGO_MARK[row?.id]) return LOGO_MARK[row.id];
  const words = String(row?.name || "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length > 1) return words.map((word) => word[0]).join("").slice(0, 3).toUpperCase();
  return (words[0] || "?").slice(0, 1).toUpperCase();
}

function rowsInOrder(rows, ids) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

function Logo({ row }) {
  const brandBg = LOGO_BG[row.id];
  const mark = logoMark(row);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);
  useEffect(() => {
    const node = imgRef.current;
    if (node?.complete && node.naturalWidth > 0) setLoaded(true);
  }, [row.logoPath]);
  const markClass = brandBg
    ? "text-[11px] font-semibold tracking-tight text-white"
    : "text-[13px] font-semibold text-foreground";

  if (!row.logoPath) {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted text-[13px] font-semibold text-foreground">
        {mark}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative flex size-9 shrink-0 overflow-hidden rounded-lg",
        brandBg || "border border-border/70 bg-background",
      )}
    >
      <span className={cn("absolute inset-0 flex items-center justify-center", markClass, loaded && "opacity-0")} aria-hidden>
        {mark}
      </span>
      <img
        src={row.logoPath}
        alt=""
        width={36}
        height={36}
        decoding="async"
        ref={imgRef}
        onLoad={() => setLoaded(true)}
        className={cn("size-full object-contain p-1", loaded ? "opacity-100" : "opacity-0")}
      />
    </span>
  );
}

function PreviewTable({ item }) {
  return (
    <article className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <header className="border-b border-border/50 px-3 py-2.5">
        <p className="text-[13px] font-semibold text-foreground">{item.title}</p>
        <p className="text-[11px] text-muted-foreground">{item.caption}</p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border/50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {item.columns.map((column) => (
                <th key={column} className="px-3 py-2 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {item.rows.map((cells) => (
              <tr key={cells.join("|")} className="border-b border-border/40 last:border-0">
                {cells.map((cell, cellIndex) => (
                  <td
                    key={`${cell}-${cellIndex}`}
                    className={cn(
                      "px-3 py-2.5 text-[12px]",
                      cellIndex === 0 ? "font-medium text-foreground" : "font-mono text-muted-foreground",
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function previewFrames(row) {
  return [
    {
      title: row?.name || "Sheet",
      caption: "A typical sheet from this source",
      columns: ["Field", "Value"],
      rows: [["—", "—"]],
    },
  ];
}

function PreviewBody({ row, description }) {
  const frames = previewFrames(row);
  return (
    <>
      {description ? (
        <p className="mt-3 text-[13px] leading-relaxed text-foreground/90">{description}</p>
      ) : null}
      {isLivePreviewId(row?.id) ? (
        <IntegrationSamplePreview integrationId={row.id} />
      ) : (
        <div className="mt-5 space-y-3">
          {frames.map((item) => (
            <PreviewTable key={item.title} item={item} />
          ))}
        </div>
      )}
    </>
  );
}

function PreviewPane({ row, description }) {
  const signature = `${row?.id || ""}\0${description || ""}`;
  const latestRef = useRef({ signature, row, description });
  const paneRef = useRef(null);
  const [leaving, setLeaving] = useState(null);

  useEffect(() => {
    if (latestRef.current.signature === signature) return undefined;
    const previous = latestRef.current;
    latestRef.current = { signature, row, description };
    if (paneRef.current) paneRef.current.scrollTop = 0;
    setLeaving(previous);
    const timer = window.setTimeout(() => setLeaving(null), 520);
    return () => window.clearTimeout(timer);
  }, [signature, row, description]);

  return (
    <div
      ref={paneRef}
      className="flex min-h-0 flex-1 flex-col justify-start overflow-y-auto bg-[#e6edf3] px-6 pb-6 pt-12 dark:bg-[#1c232b]"
    >
      <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
        <Database className="size-4 text-muted-foreground" aria-hidden />
        What this looks like in Lychee
      </div>
      <div className="relative">
        {leaving ? (
          <div
            key={leaving.signature}
            className="pointer-events-none absolute inset-x-0 top-0 animate-out fade-out duration-500 ease-out fill-mode-forwards motion-reduce:animate-none"
            aria-hidden
          >
            <PreviewBody row={leaving.row} description={leaving.description} />
          </div>
        ) : null}
        <div
          key={signature}
          className="animate-in fade-in duration-500 ease-out motion-reduce:animate-none"
        >
          <PreviewBody row={row} description={description} />
        </div>
      </div>
    </div>
  );
}

const REALTIME_IDS = new Set(["kalshiLive", "polymarket", "chainlink", "binance"]);

function RealTimeTag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
      <span className="relative flex size-1.5" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
      </span>
      Real-Time
    </span>
  );
}

function cutoffCaption(row, cutoffLabel) {
  if (row.listCaptionKey === "kalshiHistoricalCutoff") return kalshiHistoricalV2Caption(cutoffLabel);
  if (row.listCaptionKey === "kalshiLiveCutoff") return kalshiLiveCaption(cutoffLabel);
  return null;
}

/** First sentence, or the clause before an em dash. Used when a row has no short caption. */
function succinctDescription(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  const clause = value.split(/\s[—–]\s/)[0].trim();
  const sentence = value.split(/(?<=[.!?])\s/)[0].trim();
  const pick = clause.length < value.length && clause.length <= 88 ? clause : sentence;
  return pick.length > 96 ? `${pick.slice(0, 93).trim()}…` : pick;
}

function pillCaption(row, cutoffLabel) {
  const live = cutoffCaption(row, cutoffLabel);
  if (live) return live;
  if (row.listCaption) return row.listCaption;
  if (row.id === "kalshiHistorical") return KALSHI_HISTORICAL_DEEP_CAPTION;
  return succinctDescription(row.description);
}

function IntegrationOption({ row, active, hovered, onSelect, onHover, cutoffLabel, cutoffLoading }) {
  const liveCaption = cutoffCaption(row, cutoffLabel);
  const caption = pillCaption(row, cutoffLabel);
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={() => onSelect(row.id)}
      onMouseEnter={() => onHover?.(row.id)}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors duration-200",
        active
          ? "border-[#2f6fed] bg-[#e7f0ff] dark:border-blue-400 dark:bg-blue-500/15"
          : hovered
            ? "border-foreground/20 bg-muted"
            : "border-border/70 bg-background",
      )}
    >
      <Logo row={row} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-foreground">{row.name}</span>
          {REALTIME_IDS.has(row.id) ? <RealTimeTag /> : null}
        </span>
        {liveCaption && cutoffLoading ? (
          <Skeleton className="mt-1.5 h-3.5 w-56 bg-muted-foreground/20" />
        ) : (
          <span className="mt-0.5 line-clamp-2 block text-[12px] leading-relaxed text-muted-foreground">
            {caption}
          </span>
        )}
      </span>
      {active ? (
        <Check className="ml-1 size-4 shrink-0 self-center text-[#2f6fed] dark:text-blue-400" aria-hidden />
      ) : null}
    </button>
  );
}

/** Picker, then the build workspace. Shared by the dialog and the inline landing demo. */
function IntegrationConnectFlow({
  inline = false,
  withClose = !inline,
  title = "Which integration should feed this dashboard?",
  onCancel,
  onPhaseChange,
  onSelectIntegration,
  lockedIds,
  onLockedSelect,
  startIntegrationId = null,
}) {
  const rows = useMemo(() => buildIntegrationPickerRows(), []);
  const primary = rowsInOrder(rows, PRIMARY_ORDER);
  const beta = rowsInOrder(rows, BETA_ORDER);
  const listed = new Set([...PRIMARY_ORDER, ...BETA_ORDER]);
  const comingSoon = rows.filter((row) => !listed.has(row.id));
  const selectable = [...primary, ...beta];
  const startable = !!startIntegrationId && selectable.some((row) => row.id === startIntegrationId);
  const [selectedId, setSelectedId] = useState(startable ? startIntegrationId : null);
  const [hoveredId, setHoveredId] = useState(null);
  const [phase, setPhase] = useState(startable ? "build" : "pick");
  const selected = selectable.find((row) => row.id === selectedId) || null;
  const hovered = rows.find((row) => row.id === hoveredId) || null;
  const shown = hovered || selected || primary[0] || null;
  const { cutoffLabel, loading: cutoffLoading } = useKalshiHistoricalCutoffDisplay();
  // Radix titles throw outside a Dialog, so the inline flow uses plain headings.
  const Title = inline ? "h2" : DialogTitle;
  const Description = inline ? "p" : DialogDescription;

  useEffect(() => {
    prefetchIntegrationPreviews();
    return whenIdle(() => void loadBuildWorkspace());
  }, []);

  const changePhase = (next) => {
    setPhase(next);
    onPhaseChange?.(next);
  };

  const select = (id) => {
    if (lockedIds?.includes(id)) {
      onLockedSelect?.(rows.find((row) => row.id === id) || { id });
      return;
    }
    setSelectedId(id);
    onSelectIntegration?.(id);
  };

  if (phase === "build" && selected) {
    return (
      <>
        <Title className="sr-only">{selected.name} preview</Title>
        <IntegrationBuildWorkspace integrationId={selected.id} onBack={() => changePhase("pick")} />
      </>
    );
  }

  return (
        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="flex min-h-0 flex-col bg-background">
            <div className={cn("px-6 pb-3 pt-6", withClose && "pr-12")}>
              <Title className="text-xl font-semibold tracking-tight text-foreground">{title}</Title>
              <Description className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Pick a source. You’ll shape the pull in the next step.
              </Description>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 pb-4">
              <div role="listbox" aria-label="Integrations" className="space-y-2">
                {primary.map((row) => (
                  <IntegrationOption
                    key={row.id}
                    row={row}
                    active={row.id === selected?.id}
                    hovered={row.id === hoveredId && row.id !== selected?.id}
                    onSelect={select}
                    onHover={setHoveredId}
                    cutoffLabel={cutoffLabel}
                    cutoffLoading={cutoffLoading}
                  />
                ))}
              </div>
              {beta.length ? (
                <div className="pt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Beta
                  </p>
                  <div role="listbox" aria-label="Beta integrations" className="space-y-2">
                    {beta.map((row) => (
                      <IntegrationOption
                        key={row.id}
                        row={row}
                        active={row.id === selected?.id}
                        hovered={row.id === hoveredId && row.id !== selected?.id}
                        onSelect={select}
                        onHover={setHoveredId}
                        cutoffLabel={cutoffLabel}
                        cutoffLoading={cutoffLoading}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {comingSoon.length ? (
                <div className="pt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Coming soon
                  </p>
                  <div className="space-y-2">
                    {comingSoon.map((row) => (
                      <div
                        key={row.id}
                        onMouseEnter={() => setHoveredId(row.id)}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors duration-200",
                          hoveredId === row.id
                            ? "border-foreground/20 bg-muted"
                            : "border-border/60 bg-muted/20",
                        )}
                      >
                        <Logo row={row} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-foreground">{row.name}</span>
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Coming soon
                            </span>
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-[12px] leading-relaxed text-muted-foreground">
                            {pillCaption(row, cutoffLabel)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            {selected ? (
              <div className="flex shrink-0 items-center justify-end gap-2 px-6 py-4">
                {onCancel ? (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Previous
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="bg-[#2f6fed] text-white hover:bg-[#2f6fed]/90"
                  onClick={() => changePhase("build")}
                >
                  Start building
                  <ArrowRight />
                </Button>
              </div>
            ) : null}
          </div>
          {shown ? (
            <PreviewPane row={shown} description={hovered?.description || ""} />
          ) : null}
        </div>
  );
}

export function IntegrationConnectDialog({ open, onOpenChange }) {
  const [phase, setPhase] = useState("pick");

  useEffect(() => {
    if (!open) setPhase("pick");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[560] bg-black/40"
        className={cn(
          "z-[560] flex max-w-none flex-col gap-0 overflow-hidden border-border/70 p-0 shadow-xl sm:rounded-2xl",
          phase === "build"
            ? "h-[min(900px,94vh)] w-[min(1180px,calc(100vw-1.5rem))]"
            : "max-h-[min(880px,92vh)] w-[min(980px,calc(100vw-2rem))]",
        )}
      >
        {open ? (
          <IntegrationConnectFlow onCancel={() => onOpenChange(false)} onPhaseChange={setPhase} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Landing demo picker. On the landing page it fills the demo card; once the demo is
 * active it floats over the demo dashboard like the dialog does. One element in both
 * layouts so a selection made in the card carries into the modal.
 */
export function IntegrationConnectLandingDemo({ active = false, onSelectIntegration, initialIntegrationId = null }) {
  const connect = useIntegrationConnect();
  // Only the first open skips the picker; adding data later starts from the full list.
  const [startId, setStartId] = useState(initialIntegrationId);
  const [phase, setPhase] = useState(initialIntegrationId ? "build" : "pick");
  const [lockedFeature, setLockedFeature] = useState(null);
  const closeLocked = useCallback(() => setLockedFeature(null), []);

  useEffect(() => {
    if (connect?.inlineOpen) return;
    setPhase("pick");
    setStartId(null);
  }, [connect?.inlineOpen]);

  if (!connect?.inlineOpen) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-[45] flex",
        active
          ? "items-center justify-center bg-black/40 p-4 animate-in fade-in-0 duration-200"
          : "flex-col bg-background",
      )}
    >
      <div
        className={cn(
          "relative flex min-h-0 flex-col overflow-hidden bg-background",
          active
            ? cn(
                "rounded-2xl border border-border/70 shadow-xl animate-in fade-in-0 zoom-in-95 duration-200",
                phase === "build"
                  ? "h-[min(900px,94%)] w-[min(1180px,calc(100%-1.5rem))]"
                  : "max-h-[min(880px,92%)] w-[min(980px,calc(100%-2rem))]",
              )
            : "flex-1",
        )}
      >
        {active ? (
          <button
            type="button"
            aria-label="Close"
            onClick={() => connect.close()}
            className="absolute right-4 top-4 z-10 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        ) : null}
        {/* The sidebar hides rather than unmounts when the demo activates, so the flow keeps its selection. */}
        <div className="flex min-h-0 flex-1">
          <aside
            className={cn(
              "hidden w-1/4 shrink-0 flex-col border-r border-border bg-muted/30 px-5 pt-6",
              !active && "md:flex",
            )}
          >
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Recipes</h2>
          </aside>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <IntegrationConnectFlow
              inline
              withClose={active}
              title="What is the first venue you want to research with Lychee?"
              onPhaseChange={setPhase}
              onSelectIntegration={onSelectIntegration}
              lockedIds={LANDING_DEMO_LOCKED_INTEGRATIONS}
              onLockedSelect={(row) => setLockedFeature(row.name || "This integration")}
              startIntegrationId={startId}
            />
          </div>
        </div>
      </div>
      <LandingDemoMembersOnlyPortal open={!!lockedFeature} feature={lockedFeature} onClose={closeLocked} />
    </div>
  );
}

/**
 * `inlineStart` opens the inline flow on mount. `close()` dismisses both the
 * dialog and the inline flow, which is how a finished run reveals the canvas.
 * `inlineOnly` routes `open()` to the inline flow instead of the dialog.
 */
export function IntegrationConnectProvider({ children, inlineStart = false, inlineOnly = false }) {
  const [open, setOpen] = useState(false);
  const [inlineOpen, setInlineOpen] = useState(inlineStart);
  const value = useMemo(
    () => ({
      open: () => (inlineOnly ? setInlineOpen(true) : setOpen(true)),
      close: () => {
        setOpen(false);
        setInlineOpen(false);
      },
      inlineOpen,
    }),
    [inlineOnly, inlineOpen],
  );
  return (
    <IntegrationConnectContext.Provider value={value}>
      {children}
      <IntegrationConnectDialog open={open} onOpenChange={setOpen} />
    </IntegrationConnectContext.Provider>
  );
}
