"use client";

import { motion, useReducedMotion } from "framer-motion";

import { BorderBeam } from "@/components/magicui/border-beam";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { cn } from "@/lib/utils";

const KALSHI = "#28CC95";
const POLYMARKET = "#2E5CFF";

function venueStyle(venue) {
  const polymarket = venue === "polymarket";
  return {
    accent: polymarket ? POLYMARKET : KALSHI,
    flicker: polymarket ? "rgb(46, 92, 255)" : "rgb(40, 204, 149)",
    name: polymarket ? "Polymarket Historical" : "Kalshi Historical",
  };
}

function shownPrice(price, venue) {
  if (venue !== "polymarket") return price;
  const cents = Number(String(price).replace("¢", ""));
  return Number.isFinite(cents) ? (cents / 100).toFixed(2) : price;
}

/** Illustration only. These rows are not loaded from Athena. */
const SAMPLE = [
  {
    ticker: "MARKET-A",
    fills: [
      ["14:02", "Yes", "63¢"],
      ["14:01", "No", "37¢"],
    ],
  },
  {
    ticker: "MARKET-B",
    fills: [
      ["09:15", "Yes", "48¢"],
      ["09:14", "Yes", "47¢"],
    ],
  },
  {
    ticker: "MARKET-C",
    fills: [
      ["18:40", "No", "22¢"],
      ["18:39", "Yes", "78¢"],
    ],
  },
];

export const JOIN_EXPLAINER_COPY =
  "Join lets you join your current data table with another data source, like trades.";

const TRADE_SAMPLE = [
  {
    ticker: "MARKET-A",
    fill: ["14:02", "Yes", "63¢"],
    meta: [
      ["Category", "Politics"],
      ["Status", "Finalized"],
      ["Title", "Market A"],
    ],
  },
  {
    ticker: "MARKET-B",
    fill: ["09:15", "Yes", "48¢"],
    meta: [
      ["Category", "Sports"],
      ["Status", "Closed"],
      ["Title", "Market B"],
    ],
  },
  {
    ticker: "MARKET-C",
    fill: ["18:40", "No", "22¢"],
    meta: [
      ["Category", "Weather"],
      ["Status", "Active"],
      ["Title", "Market C"],
    ],
  },
];

export const TRADES_JOIN_EXPLAINER_COPY =
  "Join lets you join this trades table with Kalshi Historical markets and bring market metadata onto each fill.";

function tabClass(selected) {
  return cn(
    "relative -ml-px shrink-0 border border-border/70 px-2 py-1 text-left text-[11px] font-medium leading-none first:ml-0",
    selected ? "z-10 border-[#0d99ff] bg-[#0d99ff]/10 text-[#0d99ff]" : "bg-background text-muted-foreground",
  );
}

const LIVE_DESTINATIONS = ["Trades", "Order book", "Candlesticks"];

/** The tab that appears while Join is hovered. It is not a real sheet. */
export function JoinExplainerTabs({ source = "markets", live = false }) {
  const reduce = useReducedMotion();
  if (live) {
    return (
      <div className="overflow-hidden px-4 pb-1 pt-4">
        <div className="flex">
          <span className={tabClass(false)}>Markets</span>
          {LIVE_DESTINATIONS.map((title, index) => (
            <motion.span
              key={title}
              initial={reduce ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0 }}
              animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.12 * index, ease: "easeOut" }}
              className={tabClass(index === LIVE_DESTINATIONS.length - 1)}
            >
              {title}
            </motion.span>
          ))}
        </div>
      </div>
    );
  }
  const from = source === "trades" ? "Trades" : "Markets";
  const to = source === "trades" ? "Markets" : "Trades";
  return (
    <div className="overflow-hidden px-4 pb-1 pt-4">
      <div className="flex">
        <span className={tabClass(false)}>{from}</span>
        <motion.span
          initial={reduce ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0 }}
          animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className={tabClass(true)}
        >
          {to}
        </motion.span>
      </div>
    </div>
  );
}

function TradesJoinExplainer({ venue = "kalshi" }) {
  const reduce = useReducedMotion();
  const style = venueStyle(venue);
  const copy =
    venue === "polymarket"
      ? "Join lets you join this trades table with Polymarket Historical markets and bring market metadata onto each fill."
      : TRADES_JOIN_EXPLAINER_COPY;
  return (
    <div className="relative flex h-full min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <FlickeringGrid
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        squareSize={3}
        gridGap={5}
        flickerChance={0.16}
        color={style.flicker}
        maxOpacity={0.2}
      />
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-5 px-6 py-8">
        <p className="max-w-md text-center text-[13px] leading-relaxed text-muted-foreground">{copy}</p>
        <div className="flex w-full flex-col gap-2">
          {TRADE_SAMPLE.map((trade, index) => (
            <div key={trade.ticker} className="grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1.15fr)] items-center gap-x-2">
              <div
                className="rounded-xl border px-3 py-2 shadow-sm backdrop-blur-md"
                style={{ borderColor: `${style.accent}80`, backgroundColor: `${style.accent}1a` }}
              >
                <p className="font-mono text-[10px] text-foreground">
                  {trade.fill[0]} · {trade.fill[1]} · {shownPrice(trade.fill[2], venue)}
                </p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{trade.ticker}</p>
              </div>
              <div className="relative h-px overflow-hidden bg-border">
                <motion.span
                  className="absolute inset-y-0 left-0"
                  style={{ backgroundColor: style.accent }}
                  initial={reduce ? false : { width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.15 + index * 0.1, duration: 0.4 }}
                />
              </div>
              <motion.div
                className="relative overflow-hidden rounded-xl border border-border/70 bg-background/90 shadow-sm backdrop-blur-md"
                initial={reduce ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28 + index * 0.1, duration: 0.35 }}
              >
                <BorderBeam size={70} duration={8} delay={index * 1.4} borderWidth={1.2} colorFrom={style.accent} colorTo="#0d99ff" />
                <p className="border-b border-border/60 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                  Markets · <span className="font-mono font-medium">{trade.ticker}</span>
                </p>
                <div className="flex flex-col gap-1 p-1.5">
                  {trade.meta.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-2 py-1 text-[10px]"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MarketsJoinExplainer({ venue = "kalshi" }) {
  const reduce = useReducedMotion();
  const style = venueStyle(venue);

  return (
    <div className="relative flex h-full min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <FlickeringGrid
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        squareSize={3}
        gridGap={5}
        flickerChance={0.16}
        color={style.flicker}
        maxOpacity={0.2}
      />
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-5 px-6 py-8">
        <p className="max-w-md text-center text-[13px] leading-relaxed text-muted-foreground">{JOIN_EXPLAINER_COPY}</p>
        <div className="flex w-full flex-col gap-2">
          {SAMPLE.map((market, index) => (
            <div key={market.ticker} className="grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1.15fr)] items-center gap-x-2">
              <div
                className="rounded-xl border px-3 py-2 shadow-sm backdrop-blur-md"
                style={{ borderColor: `${style.accent}80`, backgroundColor: `${style.accent}1a` }}
              >
                <p className="truncate font-mono text-[10px] text-foreground">{market.ticker}</p>
              </div>
              <div className="relative h-px overflow-hidden bg-border">
                <motion.span
                  className="absolute inset-y-0 left-0"
                  style={{ backgroundColor: style.accent }}
                  initial={reduce ? false : { width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.15 + index * 0.1, duration: 0.4 }}
                />
              </div>
              <motion.div
                className="relative overflow-hidden rounded-xl border border-border/70 bg-background/90 shadow-sm backdrop-blur-md"
                initial={reduce ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28 + index * 0.1, duration: 0.35 }}
              >
                <BorderBeam size={70} duration={8} delay={index * 1.4} borderWidth={1.2} colorFrom={style.accent} colorTo="#0d99ff" />
                <p className="border-b border-border/60 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                  Trades · <span className="font-mono font-medium">{market.ticker}</span>
                </p>
                <div className="flex flex-col gap-1 p-1.5">
                  {market.fills.map((fill) => (
                    <div
                      key={fill.join("-")}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-2 py-1 font-mono text-[10px]"
                    >
                      <span className="text-muted-foreground">{fill[0]}</span>
                      <span>{fill[1]}</span>
                      <span>{shownPrice(fill[2], venue)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const LIVE_SAMPLE = [
  {
    title: "Trades",
    rows: [
      ["14:02", "Yes", "63¢"],
      ["14:01", "No", "37¢"],
    ],
  },
  {
    title: "Order book",
    rows: [
      ["Yes", "64¢", "120"],
      ["No", "36¢", "80"],
    ],
  },
  {
    title: "Candlesticks",
    rows: [
      ["14:00", "Open", "61¢"],
      ["14:01", "Close", "63¢"],
    ],
  },
];

/** One market fans out to the live sheets that hang off its ticker. */
export function LiveMarketsJoinExplainer() {
  const reduce = useReducedMotion();
  const style = venueStyle("kalshi");
  return (
    <div className="relative flex h-full min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <FlickeringGrid
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        squareSize={3}
        gridGap={5}
        flickerChance={0.16}
        color={style.flicker}
        maxOpacity={0.2}
      />
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-5 px-6 py-8">
        <p className="max-w-md text-center text-[13px] leading-relaxed text-muted-foreground">
          Join attaches every market in this pull to the live data on its ticker. Pick trades, the order book, candlesticks, or all of them.
        </p>
        <div className="grid w-full grid-cols-[minmax(0,0.8fr)_2.5rem_minmax(0,1.15fr)] items-center gap-x-2 gap-y-2">
          <div
            className="row-span-3 rounded-xl border px-3 py-3 shadow-sm backdrop-blur-md"
            style={{ borderColor: `${style.accent}80`, backgroundColor: `${style.accent}1a`, gridRow: "span 3" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Markets</p>
            <p className="mt-1 truncate font-mono text-[11px] text-foreground">MARKET-A</p>
          </div>
          {LIVE_SAMPLE.map((sheet, index) => (
            <div key={sheet.title} className="contents">
              <div className="relative h-px overflow-hidden bg-border">
                <motion.span
                  className="absolute inset-y-0 left-0"
                  style={{ backgroundColor: style.accent }}
                  initial={reduce ? false : { width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.12 + index * 0.12, duration: 0.4 }}
                />
              </div>
              <motion.div
                className="relative overflow-hidden rounded-xl border border-border/70 bg-background/90 shadow-sm backdrop-blur-md"
                initial={reduce ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.24 + index * 0.12, duration: 0.35 }}
              >
                <BorderBeam size={70} duration={8} delay={index * 1.2} borderWidth={1.2} colorFrom={style.accent} colorTo="#0d99ff" />
                <p className="border-b border-border/60 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                  {sheet.title} · <span className="font-mono font-medium">MARKET-A</span>
                </p>
                <div className="flex flex-col gap-1 p-1.5">
                  {sheet.rows.map((row) => (
                    <div
                      key={row.join("-")}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-2 py-1 font-mono text-[10px]"
                    >
                      {row.map((cell) => (
                        <span key={cell} className="text-foreground">
                          {cell}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const FANOUT_HERE = {
  candlesticks: "Candlesticks",
  trades: "Trades",
  orderbook: "Order book",
};

const FANOUT_LEAVES = ["Trades", "Order book", "Candlesticks"];

function fanoutHere(tableId) {
  return FANOUT_HERE[tableId] || "This pull";
}

function fanoutAlso(tableId) {
  const here = fanoutHere(tableId);
  return FANOUT_LEAVES.filter((title) => title !== here);
}

function RouteChip({ label, hint, delay, accent, active = false }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden rounded-lg border px-2.5 py-1.5 shadow-sm backdrop-blur-md",
        active ? "" : "border-border/70 bg-background/90",
      )}
      style={active ? { borderColor: `${accent}80`, backgroundColor: `${accent}1a` } : undefined}
    >
      {active ? <BorderBeam size={48} duration={8} delay={delay} borderWidth={1.2} colorFrom={accent} colorTo="#0d99ff" /> : null}
      <p className="text-[12px] font-semibold leading-none text-foreground">{label}</p>
      {hint ? <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{hint}</p> : null}
    </motion.div>
  );
}

/** Hover illustration for a candlestick, trade, or order book pull. */
export function FanoutJoinExplainerTabs({ tableId = "candlesticks" }) {
  const reduce = useReducedMotion();
  const tabs = [fanoutHere(tableId), "Market", "Series", "Markets", ...fanoutAlso(tableId)];
  return (
    <div className="overflow-hidden px-4 pb-1 pt-4">
      <div className="flex">
        {tabs.map((title, index) =>
          index === 0 ? (
            <span key={title} className={tabClass(false)}>
              {title}
            </span>
          ) : (
            <motion.span
              key={title}
              initial={reduce ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0 }}
              animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 * index, ease: "easeOut" }}
              className={tabClass(index === tabs.length - 1)}
            >
              {title}
            </motion.span>
          ),
        )}
      </div>
    </div>
  );
}

/** The sheets a candlestick, trade, or order book pull can open. */
export function FanoutJoinExplainer({ tableId = "candlesticks" }) {
  const reduce = useReducedMotion();
  const style = venueStyle("kalshi");
  const here = fanoutHere(tableId);
  const also = fanoutAlso(tableId);
  return (
    <div className="relative flex h-full min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <FlickeringGrid
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        squareSize={3}
        gridGap={5}
        flickerChance={0.16}
        color={style.flicker}
        maxOpacity={0.2}
      />
      <div className="relative z-10 flex w-full max-w-xl flex-col gap-4 px-6 py-6">
        <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
          From {here.toLowerCase()}, join the parent market, its series, every market in that series, and the trades, order book, and candlesticks on those markets.
        </p>
        <div className="flex flex-col gap-2">
          <RouteChip label={here} hint="This pull" delay={0.05} accent={style.accent} active />
          <div className="ml-3 flex flex-col gap-2 border-l border-border/70 pl-3">
            <RouteChip label="Parent market" hint="Metadata for this market" delay={0.16} accent={style.accent} />
            <div className="flex flex-col gap-2">
              <RouteChip label="Parent series" hint="The series this market belongs to" delay={0.28} accent={style.accent} />
              <div className="ml-3 flex flex-col gap-2 border-l border-border/70 pl-3">
                <RouteChip label="Markets" hint="Every market in the series" delay={0.4} accent={style.accent} />
                <div className="flex flex-wrap gap-1.5">
                  {FANOUT_LEAVES.map((title, index) => (
                    <RouteChip key={title} label={title} delay={0.52 + index * 0.08} accent={style.accent} active={title !== here} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <motion.p
                className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.64, duration: 0.3 }}
              >
                On this market
              </motion.p>
              <div className="flex flex-wrap gap-1.5">
                {also.map((title, index) => (
                  <RouteChip key={title} label={title} delay={0.72 + index * 0.08} accent={style.accent} active />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const POLYMARKET_LIVE_SHEETS = [
  {
    title: "Orderbook",
    rows: [
      ["Yes", "0.64", "120"],
      ["No", "0.36", "80"],
    ],
  },
  {
    title: "Trade History",
    rows: [
      ["14:02", "Yes", "0.63"],
      ["14:01", "No", "0.37"],
    ],
  },
  {
    title: "Price History",
    rows: [
      ["14:00", "0.61"],
      ["14:01", "0.63"],
    ],
  },
];

const POLYMARKET_LIVE_TABS = ["Orderbook", "Trade History", "Price History", "Spreads", "Top Holders"];

function polymarketFanoutLeaves(title) {
  const here = String(title || "").toLowerCase();
  return ["Orderbook", "Spreads", "Open interest", "Price history", "Trade history", "Top holders"].filter((label) => !here.includes(label.toLowerCase()));
}

/** Tabs that appear while Join is hovered on a Polymarket market pull. */
export function PolymarketLiveJoinExplainerTabs() {
  const reduce = useReducedMotion();
  return (
    <div className="overflow-hidden px-4 pb-1 pt-4">
      <div className="flex">
        <span className={tabClass(false)}>Markets</span>
        {POLYMARKET_LIVE_TABS.map((title, index) => (
          <motion.span
            key={title}
            initial={reduce ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0 }}
            animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.12 * index, ease: "easeOut" }}
            className={tabClass(index === POLYMARKET_LIVE_TABS.length - 1)}
          >
            {title}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

/** A Polymarket market pull fans out to a sheet per source, per market. */
export function PolymarketLiveJoinExplainer() {
  const reduce = useReducedMotion();
  const style = venueStyle("polymarket");
  return (
    <div className="relative flex h-full min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <FlickeringGrid
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        squareSize={3}
        gridGap={5}
        flickerChance={0.16}
        color={style.flicker}
        maxOpacity={0.2}
      />
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-5 px-6 py-8">
        <p className="max-w-md text-center text-[13px] leading-relaxed text-muted-foreground">
          Join attaches every market in this pull to its order book, prices, history, trades, spreads, top holders, and the other market sources. Each market keeps its own sheet.
        </p>
        <div className="grid w-full grid-cols-[minmax(0,0.8fr)_2.5rem_minmax(0,1.15fr)] items-center gap-x-2 gap-y-2">
          <div
            className="row-span-3 rounded-xl border px-3 py-3 shadow-sm backdrop-blur-md"
            style={{ borderColor: `${style.accent}80`, backgroundColor: `${style.accent}1a`, gridRow: "span 3" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Markets</p>
            <p className="mt-1 truncate font-mono text-[11px] text-foreground">MARKET-A</p>
          </div>
          {POLYMARKET_LIVE_SHEETS.map((sheet, index) => (
            <div key={sheet.title} className="contents">
              <div className="relative h-px overflow-hidden bg-border">
                <motion.span
                  className="absolute inset-y-0 left-0"
                  style={{ backgroundColor: style.accent }}
                  initial={reduce ? false : { width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.12 + index * 0.12, duration: 0.4 }}
                />
              </div>
              <motion.div
                className="relative overflow-hidden rounded-xl border border-border/70 bg-background/90 shadow-sm backdrop-blur-md"
                initial={reduce ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.24 + index * 0.12, duration: 0.35 }}
              >
                <BorderBeam size={70} duration={8} delay={index * 1.2} borderWidth={1.2} colorFrom={style.accent} colorTo="#0d99ff" />
                <p className="border-b border-border/60 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                  {sheet.title} · <span className="font-mono font-medium">MARKET-A</span>
                </p>
                <div className="flex flex-col gap-1 p-1.5">
                  {sheet.rows.map((row) => (
                    <div
                      key={row.join("-")}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-2 py-1 font-mono text-[10px]"
                    >
                      {row.map((cell) => (
                        <span key={cell} className="text-foreground">
                          {cell}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Tabs that appear while Join is hovered on an order book, trade, or price pull. */
export function PolymarketFanoutJoinExplainerTabs({ title = "This pull" }) {
  const reduce = useReducedMotion();
  const tabs = [title, "Parent market", ...polymarketFanoutLeaves(title).slice(0, 3)];
  return (
    <div className="overflow-hidden px-4 pb-1 pt-4">
      <div className="flex">
        {tabs.map((label, index) =>
          index === 0 ? (
            <span key={label} className={tabClass(false)}>
              {label}
            </span>
          ) : (
            <motion.span
              key={label}
              initial={reduce ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0 }}
              animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 * index, ease: "easeOut" }}
              className={tabClass(index === tabs.length - 1)}
            >
              {label}
            </motion.span>
          ),
        )}
      </div>
    </div>
  );
}

/** An order book, trade, or price pull can open the parent market and every other source. */
export function PolymarketFanoutJoinExplainer({ title = "This pull" }) {
  const reduce = useReducedMotion();
  const style = venueStyle("polymarket");
  const leaves = polymarketFanoutLeaves(title);
  return (
    <div className="relative flex h-full min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <FlickeringGrid
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        squareSize={3}
        gridGap={5}
        flickerChance={0.16}
        color={style.flicker}
        maxOpacity={0.2}
      />
      <div className="relative z-10 flex w-full max-w-xl flex-col gap-4 px-6 py-6">
        <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
          From {title.toLowerCase()}, join the parent market and the other sources on that market. Each source is its own sheet, and each market stays on its own sheet.
        </p>
        <div className="flex flex-col gap-2">
          <RouteChip label={title} hint="This pull" delay={0.05} accent={style.accent} active />
          <div className="ml-3 flex flex-col gap-2 border-l border-border/70 pl-3">
            <RouteChip label="Parent market" hint="The market this pull belongs to" delay={0.18} accent={style.accent} />
            <div className="flex flex-col gap-1.5">
              <motion.p
                className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.32, duration: 0.3 }}
              >
                Also on this market
              </motion.p>
              <div className="flex flex-wrap gap-1.5">
                {leaves.map((label, index) => (
                  <RouteChip key={label} label={label} delay={0.4 + index * 0.08} accent={style.accent} active />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Hover illustration for a leaderboard or trader search. */
export function TraderJoinExplainerTabs({ title = "Leaderboard" }) {
  const reduce = useReducedMotion();
  const tabs = [title, "Profile", "Trades"];
  return (
    <div className="overflow-hidden px-4 pb-1 pt-4">
      <div className="flex">
        {tabs.map((label, index) =>
          index === 0 ? (
            <span key={label} className={tabClass(false)}>
              {label}
            </span>
          ) : (
            <motion.span
              key={label}
              initial={reduce ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0 }}
              animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.12 * index, ease: "easeOut" }}
              className={tabClass(index === tabs.length - 1)}
            >
              {label}
            </motion.span>
          ),
        )}
      </div>
    </div>
  );
}

/** Tabs while Join is hovered on a Polymarket trader pull. */
export function PolymarketTraderJoinExplainerTabs({ title = "This pull", joins = [] }) {
  const reduce = useReducedMotion();
  const labels = [title, ...joins.slice(0, 4).map((item) => item.title), "Save and run"];
  return (
    <div className="overflow-hidden px-4 pb-1 pt-4">
      <div className="flex">
        {labels.map((label, index) =>
          index === 0 ? (
            <span key={label} className={tabClass(false)}>
              {label}
            </span>
          ) : (
            <motion.span
              key={`${label}-${index}`}
              initial={reduce ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0 }}
              animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.08 * index, ease: "easeOut" }}
              className={tabClass(index === labels.length - 1)}
            >
              {label}
            </motion.span>
          ),
        )}
      </div>
    </div>
  );
}

/** Hover illustration for the joins on one Traders endpoint. */
export function PolymarketTraderJoinExplainer({ title = "This pull", joins = [] }) {
  const style = venueStyle("polymarket");
  const shown = joins.slice(0, 5);
  return (
    <div className="relative flex h-full min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <FlickeringGrid
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        squareSize={3}
        gridGap={5}
        flickerChance={0.16}
        color={style.flicker}
        maxOpacity={0.2}
      />
      <div className="relative z-10 flex w-full max-w-md flex-col gap-4 px-6 py-6">
        <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
          From {title}, profile columns land on this sheet. Positions, PnL, activity, and market sources each open their own sheet. The preview shows the first one. The rest are viewable when you hit Save and run.
          {joins.some((item) => item.id === "getTraderPositions" || item.id === "getTraderActivity") &&
          !joins.some((item) => item.anchor === "market")
            ? " Positions and activity name markets, so those rows continue into market metadata, trades, the order book, prices, and top holders."
            : ""}
        </p>
        <div className="flex flex-col gap-2">
          <RouteChip label={title} hint="Traders in this pull" delay={0.05} accent={style.accent} active />
          <div className="ml-3 flex flex-col gap-2 border-l border-border/70 pl-3">
            {shown.map((item, index) => (
              <RouteChip
                key={item.id}
                label={item.title}
                hint={item.placement === "merge" ? "Merged onto this sheet" : item.note || "Own sheet"}
                delay={0.16 + index * 0.08}
                accent={style.accent}
              />
            ))}
            {joins.some((item) => item.id === "getTraderPositions" || item.id === "getTraderActivity") &&
            !joins.some((item) => item.anchor === "market") ? (
              <RouteChip
                label="Markets"
                hint="Metadata, trades, order book, prices, top holders"
                delay={0.16 + shown.length * 0.08}
                accent={style.accent}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A nickname list can open each trader's profile and their public trades. */
export function TraderJoinExplainer({ title = "Leaderboard" }) {
  const style = venueStyle("kalshi");
  return (
    <div className="relative flex h-full min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <FlickeringGrid
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        squareSize={3}
        gridGap={5}
        flickerChance={0.16}
        color={style.flicker}
        maxOpacity={0.2}
      />
      <div className="relative z-10 flex w-full max-w-md flex-col gap-4 px-6 py-6">
        <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
          From this {title.toLowerCase()}, open each trader&apos;s profile or their public trades.
        </p>
        <div className="flex flex-col gap-2">
          <RouteChip label={title} hint="Traders in this list" delay={0.05} accent={style.accent} active />
          <div className="ml-3 flex flex-col gap-2 border-l border-border/70 pl-3">
            <RouteChip label="Profile" hint="Public profile for each trader" delay={0.2} accent={style.accent} />
            <RouteChip label="Trades" hint="Public trades for each trader" delay={0.34} accent={style.accent} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Markets points each contract at its trades. Trades points each fill at market metadata. */
export function JoinExplainer({ source = "markets", venue = "kalshi", live = false }) {
  if (live) return <LiveMarketsJoinExplainer />;
  if (source === "trades") return <TradesJoinExplainer venue={venue} />;
  return <MarketsJoinExplainer venue={venue} />;
}
