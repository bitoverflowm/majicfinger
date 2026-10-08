"use client";

import { useReducedMotion } from "framer-motion";

import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { POLYMARKET_CLOSED_ORDERBOOK_MESSAGE } from "@/components/dashboardComposer/polymarketLiveBuild";

const ACCENT = "#0d99ff";

const BIDS = [
  { price: "0.42", width: "78%" },
  { price: "0.41", width: "52%" },
];
const ASKS = [
  { price: "0.58", width: "64%" },
  { price: "0.59", width: "38%" },
];

/**
 * The book is open, the orders drain, then a cover closes on the last price.
 * Reduced motion stays on the closed cover.
 */
export function ClosedOrderbookExplainer() {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex h-full min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <style>{`
        @keyframes closed-book-bar {
          0%, 22% { transform: scaleX(1); opacity: 1; }
          40%, 84% { transform: scaleX(0); opacity: 0; }
          100% { transform: scaleX(1); opacity: 1; }
        }
        @keyframes closed-book-cover {
          0%, 40% { transform: translateY(-105%); }
          52%, 84% { transform: translateY(0); }
          100% { transform: translateY(-105%); }
        }
        @keyframes closed-book-open {
          0%, 22% { opacity: 1; }
          40%, 84% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes closed-book-shut {
          0%, 40% { opacity: 0; }
          52%, 84% { opacity: 1; }
          100% { opacity: 0; }
        }
        .closed-book-bar { animation: closed-book-bar 6.6s ease-in-out infinite; }
        .closed-book-cover { animation: closed-book-cover 6.6s ease-in-out infinite; }
        .closed-book-open { animation: closed-book-open 6.6s ease-in-out infinite; }
        .closed-book-shut { animation: closed-book-shut 6.6s ease-in-out infinite; }
      `}</style>
      <FlickeringGrid
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        squareSize={3}
        gridGap={5}
        flickerChance={reduce ? 0 : 0.16}
        color="rgb(13, 153, 255)"
        maxOpacity={0.18}
      />
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-5 px-6 py-8">
        <p className="max-w-md text-center text-[13px] leading-relaxed text-muted-foreground">
          {POLYMARKET_CLOSED_ORDERBOOK_MESSAGE}
        </p>
        <div className="w-full max-w-[300px] overflow-hidden rounded-xl border border-border/70 bg-background/95 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Order book</span>
            <span className="relative h-5 w-14">
              <span
                className={`absolute inset-0 inline-flex items-center justify-center rounded-full text-[10px] font-medium ${reduce ? "opacity-0" : "closed-book-open"}`}
                style={{ color: ACCENT, backgroundColor: "rgb(13 153 255 / 0.12)" }}
              >
                Open
              </span>
              <span
                className={`absolute inset-0 inline-flex items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium text-foreground ${reduce ? "" : "closed-book-shut"}`}
                style={reduce ? undefined : { opacity: 0 }}
              >
                Closed
              </span>
            </span>
          </div>
          <div className="relative h-[148px]">
            <div className="grid h-full grid-cols-2 gap-2 px-3 py-2.5">
              <BookSide label="Buy" rows={BIDS} origin="left" reduce={reduce} />
              <BookSide label="Sell" rows={ASKS} origin="right" reduce={reduce} />
            </div>
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center border-t border-border/70 bg-background ${reduce ? "" : "closed-book-cover"}`}
              style={reduce ? undefined : { transform: "translateY(-105%)" }}
            >
              <span className="text-[13px] font-semibold tracking-wide text-foreground">Closed</span>
              <span className="mt-1 font-mono text-[11px] text-muted-foreground">Last price 0.58</span>
              <span className="mt-2 text-[10px] text-muted-foreground">Orders are no longer on the book</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookSide({ label, rows, origin, reduce }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className={`text-[10px] font-semibold text-muted-foreground ${origin === "right" ? "text-right" : ""}`}>{label}</span>
      {rows.map((row) => (
        <div key={row.price} className={`flex items-center gap-1.5 ${origin === "right" ? "flex-row-reverse" : ""}`}>
          <span className="w-8 shrink-0 font-mono text-[10px] text-foreground">{row.price}</span>
          <div className="relative h-3.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-muted/50">
            <span
              className={`absolute inset-y-0 rounded-sm ${reduce ? "" : "closed-book-bar"}`}
              style={{
                width: row.width,
                backgroundColor: origin === "left" ? "rgb(13 153 255 / 0.72)" : "rgb(13 153 255 / 0.28)",
                transformOrigin: origin === "left" ? "left center" : "right center",
                [origin === "left" ? "left" : "right"]: 0,
                ...(reduce ? { transform: "scaleX(0)", opacity: 0 } : null),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
