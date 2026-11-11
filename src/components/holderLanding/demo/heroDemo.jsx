"use client";

import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SquareTerminal } from "lucide-react";
import { TraderTradeToast } from "@/components/terminals/holder/traderTradeAlerts";
import { cn } from "@/lib/utils";
import { HomeCanvas, MarketCanvas, DemoSearchPanel, TraderCanvas } from "./demoCanvas";
import { DemoFeed, DemoMarketSession, DemoTraderSession, useDemoPairs } from "./demoSession";
import { SCENES, openingPanel, parseView, releasedAt, sceneFor, scrollAt, stepValue, tabsAt, viewAt } from "./demoScript";

const DESIGN_W = 1280;
const DESIGN_H = 720;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const TYPE_MS = 55;
const CUT_OUT_MS = 220;
const CUT_IN_MS = 560;
const CUT_SHIFT = 40;
const REVEAL_WAIT_MS = 900;
const PIN_MIN_MS = 1800;
const PIN_MAX_MS = 5000;
const SETTLED_FRAMES = 20;
const PRESS_MS = 450;
/** The next scene's views are built out of sight this long before it starts. */
const PREWARM_AHEAD_MS = 3500;

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

/**
 * A selector, a panel, a button in a panel by its label, a panel's latest news bar, or its busiest
 * headline marker. Looked for in the view on screen first, since views built ahead share panels.
 */
function findTarget(root, spec) {
  if (!root || !spec) return null;
  const scope = root.querySelector("[data-demo-active]") || root;
  if (typeof spec === "string") return scope.querySelector(spec) || root.querySelector(spec);
  const panel = scope.querySelector(`[data-demo-panel="${spec.panel}"]`);
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

/**
 * Cuts the canvas to the panel the script asks for instead of scrolling past everything in between:
 * the canvas slides off the way a scroll would go, jumps, and slides back in. Switching to another
 * view slides the old one off first, then calls `onShow` to put the new one up, which slides in
 * from below. Afterwards it stays pinned to the panel while panels above fill in, paused or not,
 * until the visitor scrolls the canvas themselves. `off` skips the motion.
 */
function useCanvasCut(scrollerRef, contentRef, { target, paused, want, shown, onShow, off }) {
  const entered = useRef(null);
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (want !== shown && (off || paused || !scroller)) {
      onShow(want);
      return undefined;
    }
    if (!scroller || !content || off) return undefined;
    let frame = 0;
    let motion = null;
    // The canvas itself slides, not its content, so the slide never changes how far it can scroll.
    const slide = (from, to, duration, easing) => {
      motion?.cancel();
      motion = scroller.animate([from, to], { duration, easing, fill: "both" });
      return motion;
    };
    const away = (down) => ({ opacity: 0, transform: `translateY(${down ? -CUT_SHIFT : CUT_SHIFT}px)` });
    const cleanup = () => {
      window.cancelAnimationFrame(frame);
      motion?.cancel();
    };
    if (want !== shown) {
      slide({ opacity: 1, transform: "none" }, away(true), CUT_OUT_MS, "cubic-bezier(0.4, 0, 1, 1)").onfinish = () => onShow(want);
      return cleanup;
    }
    const fresh = entered.current !== shown;
    entered.current = shown;
    /** Where the target sits in the view on screen, and whether the canvas is tall enough yet to bring it to the top. */
    const goal = () => {
      if (!target || target === "top") return { to: 0, reachable: true };
      const el = content.querySelector(`[data-demo-active] [data-demo-panel="${target}"]`);
      if (!el) return null;
      const scale = scroller.getBoundingClientRect().height / scroller.clientHeight || 1;
      const offset = (el.getBoundingClientRect().top - content.getBoundingClientRect().top) / scale;
      const max = scroller.scrollHeight - scroller.clientHeight;
      return { to: Math.max(0, Math.min(max, offset)), reachable: offset <= max + 1 };
    };
    const started = performance.now();
    let last = null;
    let still = 0;
    const pin = (now) => {
      const next = goal();
      if (next) scroller.scrollTop = next.to;
      still = next && next.to === last ? still + 1 : 0;
      last = next?.to;
      const elapsed = now - started;
      if (elapsed < PIN_MAX_MS && (elapsed < PIN_MIN_MS || still < SETTLED_FRAMES)) frame = window.requestAnimationFrame(pin);
    };
    // Held out of sight until the panel can sit at the top, so it doesn't land low and then jump.
    const enter = (down) => {
      const hidden = away(!down);
      slide(hidden, hidden, 1, "linear");
      const from = performance.now();
      const wait = (now) => {
        const next = goal();
        if (next) scroller.scrollTop = next.to;
        if (!next?.reachable && now - from < REVEAL_WAIT_MS) {
          frame = window.requestAnimationFrame(wait);
          return;
        }
        slide(hidden, { opacity: 1, transform: "none" }, CUT_IN_MS, EASE);
        frame = window.requestAnimationFrame(pin);
      };
      wait(from);
    };
    const release = () => window.cancelAnimationFrame(frame);
    const next = goal();
    if (paused) {
      frame = window.requestAnimationFrame(pin);
      for (const type of ["wheel", "touchstart", "pointerdown"]) scroller.addEventListener(type, release, { passive: true });
    } else if (fresh) enter(true);
    else if (!next || Math.abs(next.to - scroller.scrollTop) < 2) frame = window.requestAnimationFrame(pin);
    else {
      const down = next.to > scroller.scrollTop;
      slide({ opacity: 1, transform: "none" }, away(down), CUT_OUT_MS, "cubic-bezier(0.4, 0, 1, 1)").onfinish = () => enter(down);
    }
    return () => {
      cleanup();
      for (const type of ["wheel", "touchstart", "pointerdown"]) scroller.removeEventListener(type, release);
    };
  }, [scrollerRef, contentRef, target, paused, want, shown, onShow, off]);
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

/** A tab's name and picture: the trader's name and avatar, or the market's question and icon. */
function tabLabel(view, pairs) {
  if (view === "home") return { label: "Holder Terminal", icon: "" };
  const { kind, pair } = parseView(view);
  const snap = pairs[pair];
  if (!snap) return { label: "Loading…", icon: "" };
  if (kind === "trader") return { label: snap.trader.displayName, icon: snap.trader.profile.rows[0]?.profileImage || "", round: true };
  return { label: snap.market.meta.title, icon: snap.market.meta.icon || "" };
}

function TabBar({ tabs, active, pairs }) {
  return (
    <div className="relative z-10 flex h-11 shrink-0 items-center gap-3 border-b border-border bg-muted px-3.5">
      <div className="flex gap-1.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {tabs.map((view) => {
          const { label, icon, round } = tabLabel(view, pairs);
          return (
            <span
              key={view}
              data-demo-tab={view}
              className={cn(
                "flex min-w-0 max-w-[240px] items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors duration-300",
                view === active ? "shrink-0 bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
              style={{ animation: `hd-arrive 420ms ${EASE} both` }}
            >
              {icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={icon} alt="" className={cn("size-3.5 shrink-0 object-cover", round ? "rounded-full" : "rounded-[3px]")} />
              ) : (
                <SquareTerminal className="size-3.5 shrink-0" aria-hidden />
              )}
              <span className="truncate">{label}</span>
            </span>
          );
        })}
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

function CanvasSkeleton() {
  return (
    <div className="grid grid-cols-6 gap-3">
      <div className="col-span-6 h-[150px] animate-pulse rounded-xl bg-background/70" />
      <div className="col-span-2 h-[300px] animate-pulse rounded-xl bg-background/70" />
      <div className="col-span-4 h-[300px] animate-pulse rounded-xl bg-background/70" />
    </div>
  );
}

const VIEW_ORDER = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The hero's terminal, running on the saved markets and traders. `clock` comes from
 * `useDemoClock` so the hero copy can follow the same scenes. Hovering pauses it (`onPause`) and
 * explains the panel under the pointer. Each market and trader is its own view; the ones coming
 * up next are built out of sight ahead of time, so switching to them is instant.
 */
export default function HeroDemo({ clock, paused, onPause, reduced, onReady }) {
  const pairs = useDemoPairs();
  const ready = !!pairs[0];
  useEffect(() => {
    if (ready) onReady?.();
  }, [onReady, ready]);
  const frameRef = useRef(null);
  const stageRef = useRef(null);
  const scrollerRef = useRef(null);
  const contentRef = useRef(null);
  const zoom = useStageZoom(frameRef);
  const [hovered, setHovered] = useState("");
  const [merged, setMerged] = useState(false);
  const [flags, setFlags] = useState({ newWallet: true, firstTrade: true, bothSides: true });
  const [pressedAt, setPressedAt] = useState(null);
  const { scene, t, run, jump } = clock;
  const current = SCENES[scene];
  const want = viewAt(scene, t);
  const [shown, setShown] = useState(want);
  const scroll = scrollAt(scene, t);
  const cursor = stepValue(scene, t, "cursor", null);
  useEffect(() => {
    if (scene !== 0 || t > 0) return;
    setMerged(false);
    setFlags({ newWallet: true, firstTrade: true, bothSides: true });
  }, [scene, t]);

  const nextScene = (scene + 1) % SCENES.length;
  const nextUp = t >= current.ms - PREWARM_AHEAD_MS ? `${viewAt(nextScene, 0)},${viewAt(nextScene, Infinity)}` : "";
  // Built in the background, so putting a heavy dashboard together never holds up the animation on screen.
  const warm = useDeferredValue([viewAt(scene, Infinity), ...nextUp.split(",")].filter(Boolean).join(","));
  const views = [...new Set([shown, want, ...warm.split(",").filter(Boolean)])].sort(VIEW_ORDER);

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

  useCanvasCut(scrollerRef, contentRef, { target: scroll, paused, want, shown, onShow: setShown, off: !ready || !zoom || reduced });

  const open = useCallback(
    (view) => {
      const found = sceneFor(view);
      if (found) jump(found.scene, found.t);
    },
    [jump],
  );
  const actions = useMemo(
    () => ({
      pick() {},
      pickMarket() {},
      nameSubject() {},
      explore() {},
      pickTrader: ({ address }) => {
        const pair = pairs.findIndex((snap) => snap && address?.toLowerCase() === snap.trader.subject.address);
        if (pair >= 0) open(`trader:${pair}`);
      },
    }),
    [open, pairs],
  );
  const onFlag = useCallback((id) => setFlags((prev) => ({ ...prev, [id]: !prev[id] })), []);

  // The home view shows this scene's search, or the next scene's while it's built ahead.
  const searchScene = current.search ? scene : SCENES[nextScene].search ? nextScene : -1;
  const search = searchScene >= 0 ? SCENES[searchScene].search : null;
  const searchT = searchScene === scene ? t : 0;
  const searchPair = searchScene >= 0 ? pairs[SCENES[searchScene].subject.pair] : null;
  const searchMode = search?.mode === "trader" && searchT >= search.tab ? "trader" : "market";
  const query = (searchMode === "trader" ? searchPair?.trader.displayName : searchPair?.query) || "";
  const typedCount = search ? Math.max(0, Math.min(query.length, Math.floor((searchT - search.type) / TYPE_MS))) : 0;
  const suggestions = useMemo(() => {
    if (!searchPair) return [];
    if (searchMode !== "trader") return searchPair.suggestions;
    const profile = searchPair.trader.profile.rows[0];
    const pnl = Number(searchPair.trader.pnl.rows.at(-1)?.realized_pnl);
    return [
      {
        title: searchPair.trader.displayName,
        icon: profile?.profileImage,
        handle: profile?.xUsername ? `@${profile.xUsername}` : "",
        pnl: Number.isFinite(pnl) ? pnl : null,
      },
    ];
  }, [searchMode, searchPair]);

  const alertPair = current.alert ? pairs[current.subject.pair] : null;
  const alert = alertPair && t >= current.alert[0] && t < current.alert[1];
  const alertTrade = useMemo(() => {
    if (!alertPair) return null;
    const fills = Object.values(alertPair.feeds.fills)[0] || [];
    return fills.find((row) => String(row.side).toUpperCase() === "BUY") || fills[0] || null;
  }, [alertPair]);
  const alertPairIndex = alertPair ? current.subject.pair : -1;

  const onPointerMove = (event) => {
    const panel = event.target.closest?.("[data-demo-panel]")?.getAttribute("data-demo-panel") || "";
    setHovered((prev) => (prev === panel ? prev : panel));
  };

  const renderView = (view) => {
    const hover = view === shown && paused ? hovered : "";
    if (view === "home") {
      return (
        <HomeCanvas
          search={
            <DemoSearchPanel
              mode={searchMode}
              query={query}
              typed={query.slice(0, typedCount)}
              focused={!!search && searchT >= search.focus}
              open={!!search && searchT >= search.suggest}
              highlight={!!search && searchT >= search.highlight}
              suggestions={suggestions}
              hovered={view === shown ? hovered : ""}
            />
          }
        />
      );
    }
    const { kind, pair } = parseView(view);
    const snap = pairs[pair];
    if (!snap) return <CanvasSkeleton />;
    return (
      <DemoFeed snap={snap}>
        {kind === "market" ? (
          <DemoMarketSession
            snap={snap}
            released={releasedAt(view, scene, t)}
            merged={merged}
            onMerged={setMerged}
            flags={flags}
            onFlag={onFlag}
            actions={actions}
          >
            <MarketCanvas hovered={hover} lead={openingPanel(view, scene)} />
          </DemoMarketSession>
        ) : (
          <DemoTraderSession snap={snap} actions={actions}>
            <TraderCanvas hovered={hover} lead={openingPanel(view, scene)} />
          </DemoTraderSession>
        )}
      </DemoFeed>
    );
  };

  const tabs = tabsAt(scene, t);
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
        <div ref={stageRef} className="relative flex flex-col bg-[#eef1f5]" style={{ width: DESIGN_W, height: DESIGN_H, zoom }}>
          <TabBar tabs={shown === "home" ? [...tabs, "home"] : tabs} active={shown} pairs={pairs} />
          <div
            ref={scrollerRef}
            className={cn("hero-demo-canvas relative min-h-0 flex-1 bg-[#eef1f5] p-4 [scrollbar-width:none]", paused ? "overflow-y-auto overscroll-contain" : "overflow-hidden")}
          >
            <div ref={contentRef}>
              {!ready ? (
                <CanvasSkeleton />
              ) : (
                views.map((view) => (
                  <div
                    key={view}
                    data-demo-view={view}
                    data-demo-active={view === shown ? "" : undefined}
                    aria-hidden={view === shown ? undefined : true}
                    inert={view === shown ? undefined : ""}
                    className={view === shown ? undefined : "h-0 overflow-hidden"}
                  >
                    {renderView(view)}
                  </div>
                ))
              )}
            </div>
          </div>
          {alert && alertTrade ? (
            <div className="absolute right-5 top-16 z-50" style={{ animation: `hd-alert 420ms ${EASE} both` }}>
              <TraderTradeToast name={alertPair.trader.displayName} trades={[alertTrade]} onPause={() => {}} onView={() => open(`trader:${alertPairIndex}`)} />
            </div>
          ) : null}
          {reduced ? null : <DemoCursor stageRef={stageRef} target={paused ? null : cursor} tick={`${scene}:${Math.floor(t / 300)}:${shown}`} pressedAt={pressedAt} />}
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 z-50 flex justify-center pb-4 transition-opacity duration-300",
              paused ? "opacity-100" : "opacity-0",
            )}
          >
            <span className="rounded-full bg-slate-900/90 px-4 py-2 text-[13px] font-medium text-white shadow-lg">
              Paused · hover any panel to see what it does · real Polymarket data, saved
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
