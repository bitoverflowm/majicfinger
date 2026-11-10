"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SquareTerminal } from "lucide-react";
import { TraderTradeToast } from "@/components/terminals/holder/traderTradeAlerts";
import { cn } from "@/lib/utils";
import { HomeCanvas, MarketCanvas, DemoSearchPanel, TraderCanvas } from "./demoCanvas";
import { DemoFeed, DemoMarketSession, DemoTraderSession, useDemoSnapshot } from "./demoSession";
import { OPEN_TRADER_AT, SCENES, TRADER_NAME, releasedAt, stepValue, viewAt } from "./demoScript";

const DESIGN_W = 1280;
const DESIGN_H = 720;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const TYPE_FROM = 1300;
const TYPE_MS = 55;
const SUGGEST_AT = 2500;
const SCROLL_MS = 1100;
const SETTLE_MS = 2000;
const SETTLED_FRAMES = 20;
const PRESS_MS = 450;

const DEMO_CSS = `
@keyframes hd-arrive { from { opacity: 0; transform: translateY(14px) scale(0.985) } to { opacity: 1; transform: none } }
@keyframes hd-swap { from { opacity: 0; transform: scale(0.985); filter: blur(2px) } to { opacity: 1; transform: none; filter: none } }
@keyframes hd-caret { 50% { opacity: 0 } }
@keyframes hd-press { from { opacity: .9; transform: scale(.4) } to { opacity: 0; transform: scale(1.6) } }
@keyframes hd-alert { from { opacity: 0; transform: translateX(24px) } to { opacity: 1; transform: none } }
.hero-demo-canvas::-webkit-scrollbar { display: none }
`;

function largest(elements, size) {
  return elements.reduce((best, el) => (best && size(best) >= size(el) ? best : el), null);
}

/** A selector, a panel, a button in a panel by its label, a panel's latest news bar, or its busiest headline marker. */
function findTarget(root, spec) {
  if (!root || !spec) return null;
  if (typeof spec === "string") return root.querySelector(spec);
  const panel = root.querySelector(`[data-demo-panel="${spec.panel}"]`);
  if (!panel) return null;
  if (spec.bar) return [...panel.querySelectorAll('svg[aria-label="Matching articles over time"] rect.cursor-pointer')].at(-1) || null;
  if (spec.marker) return largest([...panel.querySelectorAll('button[aria-label$="headline"], button[aria-label$="headlines"]')], (el) => parseInt(el.getAttribute("aria-label"), 10) || 0);
  if (!spec.text) return panel;
  return [...panel.querySelectorAll("button")].find((button) => button.textContent.trim().startsWith(spec.text)) || null;
}

function press(el) {
  if (!el) return;
  if (typeof el.click === "function") el.click();
  else el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

function easeInOut(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/** The window's width as a share of the design width, so the terminal lays out at desktop size. */
function useStageZoom(ref) {
  const [zoom, setZoom] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setZoom(el.clientWidth / DESIGN_W);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return zoom;
}

/** Moves the canvas to the panel the script asks for, re-measuring every frame as panels fill in. */
function useCanvasScroll(scrollerRef, target, paused, key) {
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || paused) return undefined;
    const goal = () => {
      if (!target || target === "top") return 0;
      const el = scroller.querySelector(`[data-demo-panel="${target}"]`);
      if (!el) return scroller.scrollTop;
      const scale = scroller.getBoundingClientRect().height / scroller.clientHeight || 1;
      const offset = (el.getBoundingClientRect().top - scroller.getBoundingClientRect().top) / scale;
      return Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, scroller.scrollTop + offset - 16));
    };
    const from = scroller.scrollTop;
    const start = performance.now();
    let frame = 0;
    let last = null;
    let still = 0;
    const step = (now) => {
      const progress = Math.min(1, (now - start) / SCROLL_MS);
      const to = goal();
      scroller.scrollTop = from + (to - from) * easeInOut(progress);
      // Panels above can still be filling in, so stay on the target until it stops moving.
      still = progress === 1 && to === last ? still + 1 : 0;
      last = to;
      if (still < SETTLED_FRAMES && now - start < SCROLL_MS + SETTLE_MS) frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [scrollerRef, target, paused, key]);
}

function DemoCursor({ stageRef, target, tick, pressedAt }) {
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const el = findTarget(stage, target);
    if (!stage || !el) return;
    const stageRect = stage.getBoundingClientRect();
    const scale = stageRect.width / DESIGN_W || 1;
    const rect = el.getBoundingClientRect();
    const panel = typeof target === "object" && !target.text && !target.bar && !target.marker;
    const x = (rect.left - stageRect.left) / scale + (panel ? Math.min(rect.width / scale / 2, 220) : rect.width / scale / 2);
    const y = (rect.top - stageRect.top) / scale + (panel ? Math.min(rect.height / scale / 2, 160) : rect.height / scale / 2);
    setPos((prev) => (prev && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.y - y) < 0.5 ? prev : { x, y }));
  }, [stageRef, target, tick]);
  if (!pos) return null;
  const pressed = pressedAt != null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[60]"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, opacity: target ? 1 : 0, transition: `transform 750ms ${EASE}, opacity 300ms ease` }}
    >
      {pressed ? (
        <span key={pressedAt} className="absolute -left-4 -top-4 size-8 rounded-full border-2 border-[#2f6fed]" style={{ animation: "hd-press 600ms ease-out both" }} />
      ) : null}
      <svg width="22" height="22" viewBox="0 0 18 18" className="-translate-x-[3px] -translate-y-[2px] drop-shadow-[0_2px_3px_rgba(15,23,42,0.35)]" style={{ transform: pressed ? "scale(0.88)" : "none", transition: "transform 150ms ease" }}>
        <path d="M3 2 L3 15 L6.6 11.6 L9 16.5 L11.2 15.5 L8.9 10.7 L13.8 10.7 Z" fill="#0f172a" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function TabBar({ view, marketTitle }) {
  const tabs =
    view === "home"
      ? [{ id: "home", label: "Holder Terminal", active: true }]
      : [
          { id: "market", label: marketTitle, active: view === "market" },
          ...(view === "trader" ? [{ id: "trader", label: TRADER_NAME, active: true }] : []),
        ];
  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-muted px-3.5">
      <div className="flex gap-1.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {tabs.map((tab) => (
          <span
            key={tab.id}
            className={cn(
              "flex max-w-[420px] items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors duration-300",
              tab.active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
            style={tab.id === "trader" ? { animation: `hd-arrive 420ms ${EASE} both` } : undefined}
          >
            <SquareTerminal className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{tab.label}</span>
          </span>
        ))}
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <span className="relative flex size-2" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        Live
      </span>
    </div>
  );
}

/**
 * The hero's recorded terminal. `clock` comes from `useDemoClock` so the hero copy can follow
 * the same scenes. Hovering pauses it (`onPause`) and explains the panel under the pointer.
 */
export default function HeroDemo({ clock, paused, onPause, reduced, onReady }) {
  const snap = useDemoSnapshot();
  useEffect(() => {
    if (snap) onReady?.();
  }, [onReady, snap]);
  const frameRef = useRef(null);
  const stageRef = useRef(null);
  const scrollerRef = useRef(null);
  const zoom = useStageZoom(frameRef);
  const [hovered, setHovered] = useState("");
  const [merged, setMerged] = useState(false);
  const [flags, setFlags] = useState({ newWallet: true, firstTrade: true, bothSides: true });
  const [pressedAt, setPressedAt] = useState(null);
  const { scene, t, run, jump } = clock;
  const view = viewAt(scene, t);
  const current = SCENES[scene];
  const scroll = stepValue(scene, t, "scroll", "top");
  const cursor = stepValue(scene, t, "cursor", null);
  useEffect(() => {
    if (scene !== 0 || t > 0) return;
    setMerged(false);
    setFlags({ newWallet: true, firstTrade: true, bothSides: true });
  }, [scene, t]);

  const fired = useRef({ run: -1, scene: -1, done: new Set() });
  useEffect(() => {
    const state = fired.current;
    if (state.run !== run || state.scene !== scene) {
      const done = new Set();
      current.steps.forEach((step, index) => step.at < t && run !== state.run && done.add(index));
      fired.current = { run, scene, done };
    }
    current.steps.forEach((step, index) => {
      if (!step.click || step.at > t || fired.current.done.has(index)) return;
      fired.current.done.add(index);
      setPressedAt(step.at);
      press(findTarget(stageRef.current, step.click));
      window.setTimeout(() => setPressedAt((at) => (at === step.at ? null : at)), PRESS_MS);
    });
  }, [current, run, scene, t]);

  useCanvasScroll(scrollerRef, scroll, paused || reduced, `${view}:${run}`);

  const traderScene = SCENES.findIndex((item) => item.id === "trader");
  const actions = useMemo(
    () => ({
      pick() {},
      pickMarket() {},
      nameSubject() {},
      explore() {},
      pickTrader: ({ address }) => {
        if (snap && address?.toLowerCase() === snap.trader.subject.address) jump(traderScene, OPEN_TRADER_AT);
      },
    }),
    [jump, snap, traderScene],
  );
  const onFlag = useCallback((id) => setFlags((prev) => ({ ...prev, [id]: !prev[id] })), []);

  const typedCount = current.id === "search" ? Math.max(0, Math.min(snap?.query.length || 0, Math.floor((t - TYPE_FROM) / TYPE_MS))) : 0;
  const alert = current.alert && t >= current.alert[0] && t < current.alert[1] && snap;
  const alertTrade = useMemo(() => {
    if (!snap) return null;
    const fills = Object.values(snap.feeds.fills)[0] || [];
    return fills.find((row) => String(row.side).toUpperCase() === "BUY") || fills[0] || null;
  }, [snap]);

  const onPointerMove = (event) => {
    const panel = event.target.closest?.("[data-demo-panel]")?.getAttribute("data-demo-panel") || "";
    setHovered((prev) => (prev === panel ? prev : panel));
  };

  return (
    <div
      ref={frameRef}
      className="relative w-full overflow-hidden rounded-2xl border border-black/10 bg-background shadow-[0_40px_100px_-30px_rgba(15,23,42,0.55)]"
      style={{ aspectRatio: `${DESIGN_W} / ${DESIGN_H}` }}
      onPointerEnter={() => onPause(true)}
      onPointerLeave={() => {
        onPause(false);
        setHovered("");
      }}
      onPointerMove={onPointerMove}
    >
      <style dangerouslySetInnerHTML={{ __html: DEMO_CSS }} />
      {zoom ? (
        <div ref={stageRef} className="relative flex flex-col" style={{ width: DESIGN_W, height: DESIGN_H, zoom }}>
          <TabBar view={view} marketTitle={snap?.market.meta.title || ""} />
          <div
            ref={scrollerRef}
            className={cn("hero-demo-canvas relative min-h-0 flex-1 bg-[#eef1f5] p-4 [scrollbar-width:none]", paused ? "overflow-y-auto overscroll-contain" : "overflow-hidden")}
          >
            {!snap ? (
              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-6 h-[150px] animate-pulse rounded-xl bg-background/70" />
                <div className="col-span-2 h-[300px] animate-pulse rounded-xl bg-background/70" />
                <div className="col-span-4 h-[300px] animate-pulse rounded-xl bg-background/70" />
              </div>
            ) : (
              <DemoFeed snap={snap}>
                {view === "home" ? (
                  <HomeCanvas
                    search={
                      <DemoSearchPanel
                        query={snap.query}
                        typed={snap.query.slice(0, typedCount)}
                        focused={t >= 1100}
                        open={t >= SUGGEST_AT}
                        highlight={t >= 3100}
                        suggestions={snap.suggestions}
                        hovered={hovered}
                      />
                    }
                  />
                ) : view === "market" ? (
                  <DemoMarketSession
                    key={`market:${run}`}
                    snap={snap}
                    released={releasedAt(scene, t)}
                    merged={merged}
                    onMerged={setMerged}
                    flags={flags}
                    onFlag={onFlag}
                    actions={actions}
                  >
                    <MarketCanvas hovered={paused ? hovered : ""} />
                  </DemoMarketSession>
                ) : (
                  <DemoTraderSession key={`trader:${run}`} snap={snap} actions={actions}>
                    <TraderCanvas hovered={paused ? hovered : ""} />
                  </DemoTraderSession>
                )}
              </DemoFeed>
            )}
          </div>
          {alert && alertTrade ? (
            <div className="absolute right-5 top-16 z-50" style={{ animation: `hd-alert 420ms ${EASE} both` }}>
              <TraderTradeToast name={TRADER_NAME} trades={[alertTrade]} onPause={() => {}} onView={() => jump(traderScene, OPEN_TRADER_AT)} />
            </div>
          ) : null}
          {reduced ? null : <DemoCursor stageRef={stageRef} target={paused ? null : cursor} tick={`${scene}:${Math.floor(t / 300)}:${view}`} pressedAt={pressedAt} />}
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 z-50 flex justify-center pb-4 transition-opacity duration-300",
              paused ? "opacity-100" : "opacity-0",
            )}
          >
            <span className="rounded-full bg-slate-900/90 px-4 py-2 text-[13px] font-medium text-white shadow-lg">
              Paused · hover any panel to see what it does · real Polymarket data, recorded
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
