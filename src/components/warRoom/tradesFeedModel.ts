/**
 * War Room trades tape model — maps Kalshi / Polymarket fills into a compact row.
 *
 * Whale / BIG threshold: notional USD ≥ {@link WHALE_NOTIONAL_USD}, or Kalshi block trade.
 * Notional = price (0–1) × size (shares/contracts). Documented in internal/trades-feed-enrichment.md.
 */

/** Dollar notional at or above this marks a row BIG / whale. */
export const WHALE_NOTIONAL_USD = 2_500;

export type TradeAction = "buy" | "sell";
export type TradeOutcome = "yes" | "no";
export type PositionIntent = "loading_up" | "offloading" | "building_opposite";

export type TradeRow = {
  id: string;
  /** Yes-equivalent 0–1 probability for chart stitching. */
  price: number;
  /** Price of the outcome that traded (0–1). */
  fillPrice: number;
  size?: number | null;
  /** Buy/sell when known from book side or Polymarket side. */
  action?: TradeAction | null;
  /** Yes/No when known from venue outcome fields. */
  outcome?: TradeOutcome | null;
  /** Venue trader id (wallet or user id). */
  traderId?: string | null;
  /** Display name / handle when the venue sends one. */
  traderLabel?: string | null;
  notionalUsd?: number | null;
  big?: boolean;
  /** Real Kalshi `is_block_trade` only. */
  blockTrade?: boolean;
  /** Heuristic from the current tape window when traderId is known. */
  intent?: PositionIntent | null;
  at: number;
  /** @deprecated Prefer `action`. Kept for older call sites. */
  side?: string | null;
};

function asProb(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n > 1 && n <= 100) return n / 100;
  if (n < 0 || n > 1) return null;
  return n;
}

function parseAction(raw: unknown): TradeAction | null {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (s === "buy" || s === "bid" || s.includes("buy")) return "buy";
  if (s === "sell" || s === "ask" || s.includes("sell")) return "sell";
  return null;
}

function parseOutcome(raw: unknown): TradeOutcome | null {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (s === "yes" || s.startsWith("yes")) return "yes";
  if (s === "no" || s.startsWith("no")) return "no";
  return null;
}

function shortWallet(addr: string): string {
  const a = addr.trim();
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function traderLabelFromPoly(row: Record<string, unknown>): string | null {
  const name = String(row.name || row.user_name || row.userName || "").trim();
  const pseudo = String(row.pseudonym || "").trim();
  // Polymarket sometimes echoes the wallet as "name"; prefer a real handle.
  if (name && !/^0x[0-9a-fA-F]{40}$/.test(name)) return name;
  if (pseudo) return pseudo;
  return null;
}

export function notionalUsd(price: number | null | undefined, size: number | null | undefined): number | null {
  if (price == null || size == null || !Number.isFinite(price) || !Number.isFinite(size)) return null;
  return Number((price * size).toFixed(2));
}

export function isBigTrade(opts: {
  notionalUsd?: number | null;
  blockTrade?: boolean | null;
}): boolean {
  if (opts.blockTrade) return true;
  return opts.notionalUsd != null && opts.notionalUsd >= WHALE_NOTIONAL_USD;
}

/** Unwrap Polymarket proxy / v2 shapes into trade objects. */
export function unwrapPolymarketTradeRows(payload: unknown): Record<string, unknown>[] {
  if (payload == null) return [];
  if (Array.isArray(payload)) {
    if (
      payload.length === 1 &&
      payload[0] &&
      typeof payload[0] === "object" &&
      Array.isArray((payload[0] as { data?: unknown }).data)
    ) {
      return (payload[0] as { data: Record<string, unknown>[] }).data;
    }
    const out: Record<string, unknown>[] = [];
    for (const item of payload) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (Array.isArray(row.data)) {
        for (const inner of row.data) {
          if (inner && typeof inner === "object") out.push(inner as Record<string, unknown>);
        }
        continue;
      }
      if ("price" in row || "side" in row || "outcome" in row || "proxy_wallet" in row || "proxyWallet" in row) {
        out.push(row);
      }
    }
    return out;
  }
  if (typeof payload === "object") {
    const body = payload as Record<string, unknown>;
    if (Array.isArray(body.data)) return body.data as Record<string, unknown>[];
    if (Array.isArray(body.trades)) return body.trades as Record<string, unknown>[];
  }
  return [];
}

export function mapKalshiTradeRow(
  row: Record<string, unknown>,
  index: number,
  ticker: string,
): TradeRow | null {
  const fillPrice = asProb(row.yes_price_dollars ?? row.yes_price);
  if (fillPrice == null) return null;
  const at = Date.parse(String(row.created_time || "")) || Date.now() - index * 1000;
  const id = String(row.trade_id || row.id || `${ticker}-${at}`);
  const sizeRaw = Number(row.count_fp ?? row.count);
  const size = Number.isFinite(sizeRaw) && sizeRaw > 0 ? sizeRaw : null;
  const outcome = parseOutcome(row.taker_outcome_side ?? row.taker_side);
  const action = parseAction(row.taker_book_side);
  const traderId =
    String(row.taker_user_id || row.maker_user_id || row.user_id || "").trim() || null;
  const traderLabel =
    String(row.taker_nickname || row.maker_nickname || row.nickname || "").trim() || null;
  const blockTrade =
    typeof row.is_block_trade === "boolean"
      ? row.is_block_trade
      : String(row.is_block_trade || "")
          .trim()
          .toLowerCase() === "true";
  const notion = notionalUsd(fillPrice, size);
  // Public Kalshi market trades are priced on YES; chart uses the same.
  return {
    id,
    price: fillPrice,
    fillPrice,
    size,
    action,
    outcome,
    traderId,
    traderLabel,
    notionalUsd: notion,
    blockTrade: blockTrade || undefined,
    big: isBigTrade({ notionalUsd: notion, blockTrade }),
    at,
    side: action,
  };
}

export function mapPolymarketTradeRow(
  row: Record<string, unknown>,
  index: number,
  conditionId: string,
  yesTokenId?: string | null,
): TradeRow | null {
  if (!row || typeof row !== "object") return null;
  const token = String(row.token_id || row.tokenId || row.asset || row.asset_id || "").trim();
  const fillPrice = asProb(row.price);
  if (fillPrice == null) return null;
  const outcome =
    parseOutcome(row.outcome) ||
    (yesTokenId && token && token === yesTokenId ? "yes" : yesTokenId && token ? "no" : null);
  const rawTs = Number(row.timestamp ?? row.createdAt ?? row.match_time);
  const at = Number.isFinite(rawTs)
    ? rawTs < 1e12
      ? rawTs * 1000
      : rawTs
    : Date.now() - index * 1000;
  const id = String(row.transaction_hash || row.transactionHash || row.id || `${conditionId}-${at}-${fillPrice}`);
  const sizeRaw = Number(row.size);
  const size = Number.isFinite(sizeRaw) && sizeRaw > 0 ? sizeRaw : null;
  const action = parseAction(row.side || row.type);
  const wallet = String(row.proxy_wallet || row.proxyWallet || row.maker_address || row.taker_address || "")
    .trim()
    .toLowerCase();
  const traderId = wallet || null;
  const label = traderLabelFromPoly(row) || (traderId ? shortWallet(traderId) : null);
  const notion = notionalUsd(fillPrice, size);
  // Stitch chart on YES: invert NO fills.
  const chartPrice = outcome === "no" ? 1 - fillPrice : fillPrice;
  return {
    id,
    price: chartPrice,
    fillPrice,
    size,
    action,
    outcome,
    traderId,
    traderLabel: label,
    notionalUsd: notion,
    big: isBigTrade({ notionalUsd: notion }),
    at,
    side: action,
  };
}

export function mapLivePolymarketTrade(opts: {
  id: string;
  price: number;
  size?: number | null;
  side?: string | null;
  at: number;
  /** When the socket is subscribed to the YES token only. */
  outcome?: TradeOutcome | null;
}): TradeRow {
  const fillPrice = opts.price;
  const size = opts.size != null && Number.isFinite(opts.size) && opts.size > 0 ? opts.size : null;
  const action = parseAction(opts.side);
  const notion = notionalUsd(fillPrice, size);
  return {
    id: opts.id,
    price: fillPrice,
    fillPrice,
    size,
    action,
    outcome: opts.outcome ?? "yes",
    traderId: null,
    traderLabel: null,
    notionalUsd: notion,
    big: isBigTrade({ notionalUsd: notion }),
    at: opts.at,
    side: action,
  };
}

/**
 * Position-intent heuristics from the visible tape only (newest-first).
 * Requires a real traderId — never invents identity.
 */
export function annotateTradeIntents(trades: TradeRow[]): TradeRow[] {
  return trades.map((trade, index) => {
    if (!trade.traderId || !trade.action) {
      return trade.intent == null ? trade : { ...trade, intent: null };
    }
    const older: TradeRow[] = [];
    for (let j = index + 1; j < trades.length && older.length < 5; j += 1) {
      if (trades[j]?.traderId === trade.traderId) older.push(trades[j]);
    }
    let intent: PositionIntent | null = null;
    if (trade.action === "sell") {
      intent = "offloading";
    } else if (trade.action === "buy" && trade.outcome) {
      const priorBuy = older.find((row) => row.action === "buy" && row.outcome);
      if (priorBuy?.outcome && priorBuy.outcome !== trade.outcome) {
        intent = "building_opposite";
      } else if (older.some((row) => row.action === "buy" && row.outcome === trade.outcome)) {
        intent = "loading_up";
      }
    }
    if (trade.intent === intent) return trade;
    return { ...trade, intent };
  });
}

export function intentLabel(intent: PositionIntent | null | undefined): string | null {
  if (intent === "loading_up") return "loading up";
  if (intent === "offloading") return "offloading";
  if (intent === "building_opposite") return "building opposite";
  return null;
}
