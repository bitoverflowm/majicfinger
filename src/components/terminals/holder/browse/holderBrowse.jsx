"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";
import { HolderMarketBrowser } from "./holderMarketBrowser";
import { HolderTraderBrowser } from "./holderTraderBrowser";

const MODE_KEY = "lychee:holderTerminal:browseMode";
const MODES = [
  { id: "markets", label: "Browse markets" },
  { id: "holders", label: "Browse holders" },
];

/** Homepage Explore locks browse to one side; dashboard keeps both. */
function lockedBrowseMode(surface) {
  if (surface === "markets") return "markets";
  if (surface === "holders") return "holders";
  return null;
}

/** Markets or holders, remembered per browser. */
function useBrowseMode(locked = null) {
  const [mode, setMode] = useState(locked || "markets");

  useEffect(() => {
    if (locked) {
      setMode(locked);
      return;
    }
    try {
      if (window.localStorage.getItem(MODE_KEY) === "holders") setMode("holders");
    } catch {
      /* storage blocked */
    }
  }, [locked]);

  const changeMode = useCallback(
    (next) => {
      if (locked) return;
      setMode(next);
      try {
        window.localStorage.setItem(MODE_KEY, next);
      } catch {
        /* storage blocked */
      }
    },
    [locked],
  );

  return [locked || mode, changeMode];
}

function BrowseModeTabs({ mode, onChange, modes = MODES }) {
  if (modes.length === 1) {
    return <p className="text-[15px] font-semibold text-foreground">{modes[0].label}</p>;
  }
  return (
    <div role="tablist" aria-label="Browse" className="flex items-baseline gap-4">
      {modes.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={mode === item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            "text-[15px] font-semibold transition-colors",
            mode === item.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Markets and holders to browse before searching. The market browser stays mounted while holders
 * show, so its live feed and new market alerts keep running.
 *
 * @param {{ onPick: (subjects: object[]) => void, className?: string }} props
 */
export function HolderBrowse({ onPick, className }) {
  const locked = lockedBrowseMode(useMyStateV2()?.landingDemoSurface);
  const [mode, onModeChange] = useBrowseMode(locked);
  const [holdersOpened, setHoldersOpened] = useState(mode === "holders");
  const modes = useMemo(
    () => (locked ? MODES.filter((item) => item.id === locked) : MODES),
    [locked],
  );
  useEffect(() => {
    if (mode === "holders") setHoldersOpened(true);
  }, [mode]);

  const heading = <BrowseModeTabs mode={mode} onChange={onModeChange} modes={modes} />;
  return (
    <div className={className}>
      <div hidden={mode !== "markets"}>
        <HolderMarketBrowser onPick={onPick} heading={heading} onReveal={() => onModeChange("markets")} />
      </div>
      {holdersOpened ? (
        <div hidden={mode !== "holders"}>
          <HolderTraderBrowser onPick={onPick} heading={heading} />
        </div>
      ) : null}
    </div>
  );
}
