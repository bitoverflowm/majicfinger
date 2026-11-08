"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { HolderMarketBrowser } from "./holderMarketBrowser";
import { HolderTraderBrowser } from "./holderTraderBrowser";

const MODE_KEY = "lychee:holderTerminal:browseMode";
const MODES = [
  { id: "markets", label: "Browse markets" },
  { id: "holders", label: "Browse holders" },
];

/** Markets or holders, remembered per browser. */
function useBrowseMode() {
  const [mode, setMode] = useState("markets");

  useEffect(() => {
    try {
      if (window.localStorage.getItem(MODE_KEY) === "holders") setMode("holders");
    } catch {
      /* storage blocked */
    }
  }, []);

  const changeMode = useCallback((next) => {
    setMode(next);
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      /* storage blocked */
    }
  }, []);

  return [mode, changeMode];
}

function BrowseModeTabs({ mode, onChange }) {
  return (
    <div role="tablist" aria-label="Browse" className="flex items-baseline gap-4">
      {MODES.map((item) => (
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
  const [mode, onModeChange] = useBrowseMode();
  const [holdersOpened, setHoldersOpened] = useState(mode === "holders");
  useEffect(() => {
    if (mode === "holders") setHoldersOpened(true);
  }, [mode]);

  const heading = <BrowseModeTabs mode={mode} onChange={onModeChange} />;
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
