import type { StaticImageData } from "next/image";

import holderActivity from "../../../../public/guide-backdrops/holder-activity.jpg";
import holderFind from "../../../../public/guide-backdrops/holder-find.jpg";
import holderPnl from "../../../../public/guide-backdrops/holder-pnl.jpg";
import holderPositions from "../../../../public/guide-backdrops/holder-positions.jpg";
import holderRun from "../../../../public/guide-backdrops/holder-run.jpg";
import holderTables from "../../../../public/guide-backdrops/holder-tables.jpg";
import holderTreemapBoth from "../../../../public/guide-backdrops/holder-treemap-both.jpg";
import holderTreemapConcentration from "../../../../public/guide-backdrops/holder-treemap-concentration.jpg";
import holderTreemapNew from "../../../../public/guide-backdrops/holder-treemap-new.jpg";
import holderWalkthrough from "../../../../public/guide-backdrops/holder-walkthrough.jpg";
import kalshiCandles from "../../../../public/guide-backdrops/kalshi-candles.jpg";
import kalshiDemo from "../../../../public/guide-backdrops/kalshi-demo.jpg";
import kalshiDetails from "../../../../public/guide-backdrops/kalshi-details.jpg";
import kalshiExport from "../../../../public/guide-backdrops/kalshi-export.jpg";
import kalshiFind from "../../../../public/guide-backdrops/kalshi-find.jpg";
import kalshiRouting from "../../../../public/guide-backdrops/kalshi-routing.jpg";
import kalshiRow from "../../../../public/guide-backdrops/kalshi-row.jpg";
import kalshiRun from "../../../../public/guide-backdrops/kalshi-run.jpg";
import polymarketCandles from "../../../../public/guide-backdrops/polymarket-candles.jpg";
import polymarketDetails from "../../../../public/guide-backdrops/polymarket-details.jpg";
import polymarketExport from "../../../../public/guide-backdrops/polymarket-export.jpg";
import polymarketFills from "../../../../public/guide-backdrops/polymarket-fills.jpg";
import polymarketFind from "../../../../public/guide-backdrops/polymarket-find.jpg";
import polymarketRow from "../../../../public/guide-backdrops/polymarket-row.jpg";
import polymarketRun from "../../../../public/guide-backdrops/polymarket-run.jpg";
import polymarketTimeline from "../../../../public/guide-backdrops/polymarket-timeline.jpg";
import polymarketWalkthrough from "../../../../public/guide-backdrops/polymarket-walkthrough.jpg";

/**
 * Painted backdrops for guide animations. Each key belongs to exactly one figure on the site,
 * so no two animations share a painting; add a new painting rather than reusing a key.
 */
export const GUIDE_BACKDROPS = {
  "holder-activity": holderActivity,
  "holder-find": holderFind,
  "holder-pnl": holderPnl,
  "holder-positions": holderPositions,
  "holder-run": holderRun,
  "holder-tables": holderTables,
  "holder-treemap-both": holderTreemapBoth,
  "holder-treemap-concentration": holderTreemapConcentration,
  "holder-treemap-new": holderTreemapNew,
  "holder-walkthrough": holderWalkthrough,
  "kalshi-candles": kalshiCandles,
  "kalshi-demo": kalshiDemo,
  "kalshi-details": kalshiDetails,
  "kalshi-export": kalshiExport,
  "kalshi-find": kalshiFind,
  "kalshi-routing": kalshiRouting,
  "kalshi-row": kalshiRow,
  "kalshi-run": kalshiRun,
  "polymarket-candles": polymarketCandles,
  "polymarket-details": polymarketDetails,
  "polymarket-export": polymarketExport,
  "polymarket-fills": polymarketFills,
  "polymarket-find": polymarketFind,
  "polymarket-row": polymarketRow,
  "polymarket-run": polymarketRun,
  "polymarket-timeline": polymarketTimeline,
  "polymarket-walkthrough": polymarketWalkthrough,
} satisfies Record<string, StaticImageData>;

export type GuideBackdrop = keyof typeof GUIDE_BACKDROPS;
