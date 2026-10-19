"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { FeatureTip } from "@/components/ui/feature-tip";
import { cn } from "@/lib/utils";

const DEMO_QUERY = "election";
const DEMO_SUGGESTIONS = [
  { title: "Presidential Election Winner 2028", ticker: "PRES-2028" },
  { title: "Which party wins the Senate?", ticker: "SENATE-26" },
  { title: "NYC Mayoral Election", ticker: "NYCMAYOR-25" },
];
const TYPE_MS = 110;
const HOLD_MS = 2600;
const RESET_MS = 500;

const NOUNS = {
  market: { one: "market", many: "markets" },
  event: { one: "event", many: "events" },
  series: { one: "series", many: "series" },
  forecast: { one: "event or series", many: "events or series" },
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Zoomed-in search bar: types a query, then suggestions drop in. Loops. */
function SearchTipAnimation() {
  const reduced = usePrefersReducedMotion();
  const [typed, setTyped] = useState(0);
  const [loop, setLoop] = useState(0);
  const [fading, setFading] = useState(false);
  const count = reduced ? DEMO_QUERY.length : typed;
  const showResults = count === DEMO_QUERY.length;

  useEffect(() => {
    if (reduced) return;
    if (typed < DEMO_QUERY.length) {
      const timer = window.setTimeout(() => setTyped((value) => value + 1), typed === 0 ? 500 : TYPE_MS);
      return () => window.clearTimeout(timer);
    }
    const hold = window.setTimeout(() => setFading(true), HOLD_MS);
    const reset = window.setTimeout(() => {
      setFading(false);
      setTyped(0);
      setLoop((value) => value + 1);
    }, HOLD_MS + RESET_MS);
    return () => {
      window.clearTimeout(hold);
      window.clearTimeout(reset);
    };
  }, [typed, reduced]);

  return (
    <div
      aria-hidden
      className={cn("w-full px-4 transition-opacity duration-500", fading ? "opacity-0" : "opacity-100")}
    >
      <div className="flex h-9 items-center gap-2 rounded-lg border border-[#0d99ff]/50 bg-white px-3 shadow-[0_0_0_3px_rgba(13,153,255,0.15)] dark:bg-neutral-900">
        <Search className="size-4 shrink-0 text-neutral-400" />
        <span className="truncate text-[14px] text-neutral-900 dark:text-neutral-100">
          {DEMO_QUERY.slice(0, count)}
        </span>
        <span className="-ml-1.5 h-4 w-px animate-pulse bg-[#0d99ff]" />
      </div>
      {showResults ? (
        <ul key={loop} className="mt-1.5 overflow-hidden rounded-lg bg-white py-1 shadow-sm dark:bg-neutral-900">
          {DEMO_SUGGESTIONS.map((item, index) => (
            <li
              key={item.ticker}
              style={{ animationDelay: reduced ? undefined : `${index * 90}ms`, animationFillMode: "both" }}
              className={cn(
                "flex items-center justify-between gap-2 px-3 py-1",
                !reduced && "animate-in fade-in-0 slide-in-from-top-1 duration-300",
                index === 0 && "bg-[#0d99ff]/10",
              )}
            >
              <span className="truncate text-[11px] font-medium text-neutral-800 dark:text-neutral-100">{item.title}</span>
              <span className="shrink-0 font-mono text-[9px] text-neutral-500">{item.ticker}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * "Search for your market" tip, shown next to the market / event / series search
 * wherever it sits (left panel or preview). Waits for the data type tip.
 */
export function SearchFeatureTip({ anchorRef, kind = "market", required = false, side = "right", open = true }) {
  const noun = NOUNS[kind] || NOUNS.market;
  const description = [
    `If you know your ${noun.one} ticker, enter it here. You can keep adding multiple.`,
    "You can also just search anything here and Lychee will give you suggestions, based on search findings.",
  ];
  if (!required) {
    description.push(
      <>
        You also <strong className="font-semibold">do not have to</strong> search specific {noun.many} and can just search
        for {noun.many} based on your attribute filter requirements below.
      </>,
    );
  }

  return (
    <FeatureTip
      id="integration-build-search"
      after="integration-build-data-type"
      anchorRef={anchorRef}
      open={open}
      side={side}
      align={side === "right" || side === "left" ? "start" : "center"}
      sideOffset={14}
      className="w-[296px]"
      mediaClassName="items-start pt-5"
      media={<SearchTipAnimation />}
      title="Search for your market"
      description={description}
      action={{ label: "Ok" }}
      closeOnAction
    />
  );
}
