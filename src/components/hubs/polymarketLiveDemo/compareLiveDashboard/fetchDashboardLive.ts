import { flattenKalshiLiveCandlestickGroups } from "@/lib/kalshiLive/normalizeCandlestickRow";
import { fetchKalshiLiveMarket } from "@/lib/kalshiLive/fetchKalshiLiveMarket";
import { normalizeKalshiLiveOrderbook } from "@/lib/kalshiLive/normalizeOrderbookRow";
import { buildPolymarketCandlestickSeedRows } from "@/lib/polymarketLive/polymarketCandlesticks";
import { normalizePolymarketRealtimeHistoryRows } from "@/lib/polymarketLive/polymarketRealtimeSeed";
import type { HubPolymarketLiveDemoMarket } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoSelection";

import type {
  AgentStep,
  BookLevel,
  CandlePoint,
  DashboardLiveState,
  DashboardPair,
  HolderRow,
  PricePoint,
  TradeRow,
} from "./types";

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseTs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }
  const asNum = Number(value);
  if (Number.isFinite(asNum) && asNum > 0 && /^\d+(\.\d+)?$/.test(String(value || "").trim())) {
    return asNum > 1e12 ? asNum : asNum * 1000;
  }
  const ms = Date.parse(String(value || "").trim());
  return Number.isFinite(ms) ? ms : null;
}

function priceToPct(value: unknown): number | null {
  const n = num(value);
  if (n == null) return null;
  const pct = n <= 1.5 ? n * 100 : n;
  if (pct < 0 || pct > 100) return null;
  return pct;
}

function polyOutcomeTokenId(market: Record<string, unknown> | null, side: "yes" | "no"): string {
  if (!market) return "";
  const pairs = Array.isArray(market.outcomePairs) ? market.outcomePairs : [];
  const outcomes = Array.isArray(market.outcomes) ? market.outcomes.map((row) => String(row)) : [];
  const tokens = Array.isArray(market.tokenIds) ? market.tokenIds.map((row) => String(row)) : [];
  const labels = pairs.length
    ? pairs.map((row) => String((row as { outcome?: string })?.outcome || ""))
    : outcomes;
  const ids = pairs.length
    ? pairs.map((row) => String((row as { tokenId?: string })?.tokenId || ""))
    : tokens;
  const yesIdx = labels.findIndex((label) => label.toLowerCase() === "yes");
  const noIdx = labels.findIndex((label) => label.toLowerCase() === "no");
  if (side === "yes") {
    if (yesIdx >= 0 && ids[yesIdx]) return ids[yesIdx]!;
    return ids[0] || "";
  }
  if (noIdx >= 0 && ids[noIdx]) return ids[noIdx]!;
  return ids[1] || ids[0] || "";
}

export function resolveDashboardPolyToken(pair: DashboardPair): { tokenId: string; invert: boolean } {
  const market = pair.polyMarket as Record<string, unknown>;
  const side = pair.matchFromKalshi ? pair.childSide : "yes";
  const yesId = polyOutcomeTokenId(market, "yes");
  const noId = polyOutcomeTokenId(market, "no");
  if (side !== "no") return { tokenId: yesId, invert: false };
  if (noId && noId !== yesId) return { tokenId: noId, invert: false };
  return { tokenId: yesId, invert: true };
}

export function polyConditionId(market: Record<string, unknown> | null): string {
  if (!market) return "";
  const fromField = String(market.conditionId || "").trim();
  if (fromField) return fromField;
  const id = String(market.id || "").trim();
  return /^0x[a-fA-F0-9]{64}$/.test(id) ? id : "";
}

function invertPct(value: number, invert: boolean): number {
  return invert ? Math.max(0, Math.min(100, 100 - value)) : value;
}

function objectList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    if (payload.length === 1 && Array.isArray(payload[0])) {
      return (payload[0] as unknown[]).filter(
        (row) => row && typeof row === "object",
      ) as Record<string, unknown>[];
    }
    return payload.filter((row) => row && typeof row === "object") as Record<string, unknown>[];
  }
  return payload && typeof payload === "object" ? [payload as Record<string, unknown>] : [];
}

function parseLevels(raw: unknown): BookLevel[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((level) => {
      if (Array.isArray(level) && level.length >= 2) {
        const price = num(level[0]);
        const size = num(level[1]);
        if (price == null || size == null) return null;
        return { price, size };
      }
      if (level && typeof level === "object") {
        const row = level as Record<string, unknown>;
        const price = num(row.price);
        const size = num(row.size ?? row.quantity ?? row.amount);
        if (price == null || size == null) return null;
        return { price, size };
      }
      return null;
    })
    .filter(Boolean) as BookLevel[];
}

function kalshiBookFromRows(rows: Record<string, unknown>[]): { bids: BookLevel[]; asks: BookLevel[] } {
  const yes: BookLevel[] = [];
  const no: BookLevel[] = [];
  for (const row of rows) {
    const price = num(row.price_dollars);
    const size = num(row.quantity_fp);
    if (price == null || size == null) continue;
    const side = String(row.side || "").toLowerCase();
    if (side === "yes") yes.push({ price, size });
    else if (side === "no") no.push({ price, size });
  }
  const bids = yes.sort((a, b) => b.price - a.price);
  const asks = no
    .map((level) => ({ price: Math.max(0, 1 - level.price), size: level.size }))
    .sort((a, b) => a.price - b.price);
  return { bids, asks };
}

function candleFromKalshi(row: Record<string, unknown>): CandlePoint | null {
  const t =
    parseTs(row.end_period_ts) ??
    parseTs(row.time) ??
    parseTs(row.start_period_ts);
  const o = num(row.price_open_dollars ?? row.yes_open_dollars);
  const h = num(row.price_high_dollars ?? row.yes_high_dollars);
  const l = num(row.price_low_dollars ?? row.yes_low_dollars);
  const c = num(row.price_close_dollars ?? row.yes_close_dollars);
  const v = num(row.volume ?? row.volume_fp) ?? 0;
  if (t == null || o == null || h == null || l == null || c == null) return null;
  return { t, o, h, l, c, v };
}

function candleFromPoly(row: Record<string, unknown>): CandlePoint | null {
  const t = parseTs(row.end_period_ts ?? row.time ?? row.start_period_ts);
  const o = num(row.price_open_dollars);
  const h = num(row.price_high_dollars);
  const l = num(row.price_low_dollars);
  const c = num(row.price_close_dollars);
  const v = num(row.volume) ?? 0;
  if (t == null || o == null || h == null || l == null || c == null) return null;
  return { t, o, h, l, c, v };
}

function flattenHolders(payload: unknown, market: HubPolymarketLiveDemoMarket): HolderRow[] {
  const arr = Array.isArray(payload) ? payload : payload != null ? [payload] : [];
  const outcomes = Array.isArray(market.outcomes) ? market.outcomes.map((row) => String(row)) : [];
  const rows: HolderRow[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const meta = item as Record<string, unknown>;
    const holders = Array.isArray(meta.holders) ? meta.holders : meta.proxyWallet != null ? [meta] : [];
    for (const holder of holders) {
      if (!holder || typeof holder !== "object") continue;
      const h = holder as Record<string, unknown>;
      const wallet = String(h.proxyWallet || "").trim();
      if (!wallet) continue;
      const amount = num(h.amount) ?? 0;
      const outcomeIndex = num(h.outcomeIndex) ?? 0;
      rows.push({
        proxyWallet: wallet,
        name: String(h.name || ""),
        pseudonym: String(h.pseudonym || ""),
        profileImage: String(h.profileImageOptimized || h.profileImage || ""),
        amount,
        outcome: outcomes[outcomeIndex] || `Outcome ${outcomeIndex}`,
        verified: Boolean(h.verified),
      });
    }
  }
  return rows.sort((a, b) => b.amount - a.amount).slice(0, 20);
}

async function fetchJson(url: string, signal: AbortSignal, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { Accept: "application/json", ...(init?.headers || {}) },
    signal,
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof (body as { message?: string })?.message === "string"
        ? (body as { message: string }).message
        : typeof (body as { error?: string })?.error === "string"
          ? (body as { error: string }).error
          : `Request failed (${res.status})`,
    );
  }
  return body;
}

async function fetchKalshiTrades(ticker: string, signal: AbortSignal): Promise<Record<string, unknown>[]> {
  const qs = new URLSearchParams({ ticker, limit: "200" });
  const body = (await fetchJson(
    `/api/integrations/kalshi-live/markets/trades?${qs.toString()}`,
    signal,
  )) as { trades?: unknown[] };
  return (Array.isArray(body?.trades) ? body.trades : []).filter(
    (row): row is Record<string, unknown> => Boolean(row && typeof row === "object"),
  );
}

async function fetchKalshiOrderbook(ticker: string, signal: AbortSignal) {
  const qs = new URLSearchParams({ ticker, depth: "40" });
  const body = (await fetchJson(
    `/api/integrations/kalshi-live/markets/orderbook?${qs.toString()}`,
    signal,
  )) as { orderbook_fp?: unknown };
  return kalshiBookFromRows(normalizeKalshiLiveOrderbook(ticker, body?.orderbook_fp));
}

async function fetchKalshiCandles(ticker: string, signal: AbortSignal): Promise<CandlePoint[]> {
  const endTs = Math.floor(Date.now() / 1000);
  const tryRange = async (startTs: number, period: 1 | 60) => {
    const qs = new URLSearchParams({
      market_tickers: ticker,
      start_ts: String(startTs),
      end_ts: String(endTs),
      period_interval: String(period),
      per_ticker: "1",
    });
    const body = (await fetchJson(
      `/api/integrations/kalshi-live/markets/candlesticks?${qs.toString()}`,
      signal,
    )) as { markets?: unknown };
    return flattenKalshiLiveCandlestickGroups(body?.markets)
      .map((row) => candleFromKalshi(row as Record<string, unknown>))
      .filter(Boolean) as CandlePoint[];
  };
  try {
    const minute = await tryRange(endTs - 6 * 3600, 1);
    if (minute.length >= 8) return minute;
  } catch {
    /* fall through to hourly */
  }
  return tryRange(endTs - 7 * 24 * 3600, 60);
}

async function fetchPolyHistory(tokenId: string, signal: AbortSignal): Promise<PricePoint[]> {
  const res = await fetch("/api/integrations/polymarket?query=getBatchPricesHistory", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ markets: [tokenId], interval: "1d", fidelity: 5 }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("Failed to load Polymarket history");
  const rows = normalizePolymarketRealtimeHistoryRows(payload);
  const points: PricePoint[] = [];
  for (const row of rows) {
    const t = parseTs(row.timestamp ?? row.time);
    const pct = priceToPct(row.price);
    if (t == null || pct == null) continue;
    points.push({ t, v: pct });
  }
  return points.sort((a, b) => a.t - b.t);
}

async function fetchPolyTrades(
  conditionId: string,
  tokenId: string,
  signal: AbortSignal,
): Promise<Record<string, unknown>[]> {
  const qs = new URLSearchParams({
    query: "getTradesByMarket",
    market: conditionId,
    limit: "200",
    takerOnly: "false",
    skipFlatten: "true",
  });
  const payload = await fetchJson(`/api/integrations/polymarket?${qs.toString()}`, signal);
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { trades?: unknown[] })?.trades)
      ? (payload as { trades: unknown[] }).trades
      : [];
  return rows.filter((row): row is Record<string, unknown> => {
    if (!row || typeof row !== "object") return false;
    const asset = String((row as Record<string, unknown>).asset || (row as Record<string, unknown>).asset_id || "");
    if (asset && tokenId && asset !== tokenId) return false;
    return true;
  });
}

async function fetchPolyBook(tokenId: string, signal: AbortSignal) {
  const res = await fetch("/api/integrations/polymarket?query=getOrderBooks", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    signal,
    body: JSON.stringify([{ token_id: tokenId }]),
  });
  const payload = await res.json().catch(() => []);
  if (!res.ok) throw new Error("Failed to load Polymarket order book");
  const book = objectList(payload)[0] || {};
  const bids = parseLevels(book.bids).sort((a, b) => b.price - a.price);
  const asks = parseLevels(book.asks).sort((a, b) => a.price - b.price);
  return { bids, asks };
}

async function fetchPolyHolders(conditionId: string, market: HubPolymarketLiveDemoMarket, signal: AbortSignal) {
  const qs = new URLSearchParams({
    query: "getTopHolders",
    market: conditionId,
    limit: "20",
    minBalance: "1",
  });
  const payload = await fetchJson(`/api/integrations/polymarket?${qs.toString()}`, signal);
  return flattenHolders(payload, market);
}

function tradeId(venue: string, row: Record<string, unknown>, index: number): string {
  return (
    String(row.trade_id || row.transaction_hash || row.transactionHash || "") ||
    `${venue}-${index}-${row.created_time || row.timestamp || ""}`
  );
}

function mapKalshiTrades(rows: Record<string, unknown>[]): TradeRow[] {
  return rows
    .map((row, index) => {
      const ts = parseTs(row.created_time ?? row.ts ?? row.timestamp);
      const pct = priceToPct(row.yes_price_dollars ?? row.yes_price ?? row.price);
      if (ts == null || pct == null) return null;
      return {
        id: tradeId("kalshi", row, index),
        venue: "kalshi" as const,
        time: new Date(ts).toISOString(),
        ts,
        side: String(row.taker_side || row.side || "Yes"),
        price: pct,
        size: num(row.count_fp ?? row.count ?? row.size),
      };
    })
    .filter(Boolean) as TradeRow[];
}

function mapPolyTrades(rows: Record<string, unknown>[], invert: boolean): TradeRow[] {
  return rows
    .map((row, index) => {
      const ts = parseTs(row.created_time ?? row.timestamp ?? row.time);
      const pct = priceToPct(row.price ?? row.yes_price_dollars);
      if (ts == null || pct == null) return null;
      return {
        id: tradeId("poly", row, index),
        venue: "polymarket" as const,
        time: new Date(ts).toISOString(),
        ts,
        side: String(row.side || row.outcome || "Yes"),
        price: invertPct(pct, invert),
        size: num(row.size),
      };
    })
    .filter(Boolean) as TradeRow[];
}

function toLivelineRows(trades: TradeRow[]): Record<string, unknown>[] {
  return trades.map((row) => ({
    created_time: row.time,
    time: row.time,
    timestamp: String(row.ts),
    yes_price_dollars: row.price / 100,
    price: row.price / 100,
    size: row.size,
  }));
}

function volumeFromMarket(market: Record<string, unknown> | null, keys: string[]): number | null {
  if (!market) return null;
  for (const key of keys) {
    const n = num(market[key]);
    if (n != null) return n;
  }
  return null;
}

function spreadFromBook(book: { bids: BookLevel[]; asks: BookLevel[] }): number | null {
  const bid = book.bids[0]?.price;
  const ask = book.asks[0]?.price;
  if (bid == null || ask == null) return null;
  const bidPct = bid <= 1.5 ? bid * 100 : bid;
  const askPct = ask <= 1.5 ? ask * 100 : ask;
  return Math.max(0, askPct - bidPct);
}

function step(id: string, tool: string, label: string, args: Record<string, unknown>): AgentStep {
  return {
    id,
    tool,
    label,
    args,
    status: "queued",
    startedAt: null,
    endedAt: null,
    result: "",
  };
}

export const INITIAL_LIVE_STATE: DashboardLiveState = {
  kalshiMarket: null,
  polyHistory: [],
  kalshiTrades: [],
  polyTrades: [],
  kalshiBook: { bids: [], asks: [] },
  polyBook: { bids: [], asks: [] },
  kalshiCandles: [],
  polyCandles: [],
  trades: [],
  holders: [],
  kalshiLastPct: null,
  polyLastPct: null,
  kalshiVolume24h: null,
  kalshiVolumeTotal: null,
  polyVolume24h: null,
  polyVolumeTotal: null,
  kalshiSpread: null,
  polySpread: null,
  slices: {
    markets: "idle",
    trades: "idle",
    books: "idle",
    candles: "idle",
    holders: "idle",
  },
  steps: [
    step("markets", "resolve_markets", "Resolve both venues", {}),
    step("trades", "pull_trades", "Pull live trade tapes", {}),
    step("books", "pull_orderbooks", "Load order books", {}),
    step("candles", "build_candles", "Build OHLC + volume", {}),
    step("holders", "pull_holders", "Rank holders", {}),
  ],
};

export function livelineSeriesFromState(state: DashboardLiveState) {
  return {
    kalshi: toLivelineRows(state.trades.filter((row) => row.venue === "kalshi")),
    poly: toLivelineRows(state.trades.filter((row) => row.venue === "polymarket")),
  };
}

export function patchStep(
  steps: AgentStep[],
  id: string,
  patch: Partial<AgentStep>,
): AgentStep[] {
  return steps.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export async function loadDashboardLive(
  pair: DashboardPair,
  signal: AbortSignal,
  onUpdate: (updater: (prev: DashboardLiveState) => DashboardLiveState) => void,
) {
  const { tokenId, invert } = resolveDashboardPolyToken(pair);
  const conditionId = polyConditionId(pair.polyMarket as Record<string, unknown>);
  const ticker = pair.kalshiTicker;

  const mark = (id: string, status: AgentStep["status"], extra?: Partial<AgentStep>) => {
    onUpdate((prev) => ({
      ...prev,
      steps: patchStep(prev.steps, id, {
        status,
        startedAt: status === "running" ? Date.now() : prev.steps.find((s) => s.id === id)?.startedAt,
        endedAt: status === "done" || status === "error" ? Date.now() : null,
        ...extra,
      }),
    }));
  };

  const run = async <T,>(
    id: string,
    args: Record<string, unknown>,
    slice: string,
    task: () => Promise<T>,
    apply: (value: T, prev: DashboardLiveState) => DashboardLiveState,
    result: (value: T) => string,
  ) => {
    mark(id, "running", { args });
    onUpdate((prev) => ({ ...prev, slices: { ...prev.slices, [slice]: "loading" } }));
    try {
      const value = await task();
      if (signal.aborted) return;
      onUpdate((prev) => {
        const next = apply(value, prev);
        return {
          ...next,
          slices: { ...next.slices, [slice]: "ready" },
          steps: patchStep(next.steps, id, {
            status: "done",
            endedAt: Date.now(),
            result: result(value),
          }),
        };
      });
    } catch (err) {
      if (signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
      onUpdate((prev) => ({
        ...prev,
        slices: { ...prev.slices, [slice]: "error" },
        steps: patchStep(prev.steps, id, {
          status: "error",
          endedAt: Date.now(),
          result: err instanceof Error ? err.message : "Failed",
        }),
      }));
    }
  };

  await run(
    "markets",
    { kalshi: ticker, polymarket: pair.polyTitle },
    "markets",
    async () => fetchKalshiLiveMarket({ marketTicker: ticker, signal }),
    (market, prev) => ({
      ...prev,
      kalshiMarket: market,
      kalshiLastPct: priceToPct(market?.last_price_dollars ?? market?.yes_bid_dollars),
      kalshiVolume24h: volumeFromMarket(market, ["volume_24h_fp", "volume_24h"]),
      kalshiVolumeTotal: volumeFromMarket(market, ["volume_fp", "volume"]),
      polyVolume24h: volumeFromMarket(pair.polyMarket, ["volume24h", "volume24hr", "volume24hrClob"]),
      polyVolumeTotal: volumeFromMarket(pair.polyMarket, ["volume", "volumeNum", "volumeClob"]),
    }),
    () => `Locked ${ticker} against ${pair.polyTitle.slice(0, 42)}`,
  );

  void run(
    "trades",
    { kalshi: ticker, tokenId: tokenId.slice(0, 10) },
    "trades",
    async () => {
      const [kalshi, poly] = await Promise.all([
        fetchKalshiTrades(ticker, signal).catch(() => [] as Record<string, unknown>[]),
        conditionId
          ? fetchPolyTrades(conditionId, tokenId, signal).catch(() => [] as Record<string, unknown>[])
          : Promise.resolve([] as Record<string, unknown>[]),
      ]);
      return { kalshi, poly };
    },
    ({ kalshi, poly }, prev) => {
      const kalshiRows = mapKalshiTrades(kalshi);
      const polyRows = mapPolyTrades(poly, invert);
      const merged = [...kalshiRows, ...polyRows].sort((a, b) => b.ts - a.ts);
      const lastKalshi = kalshiRows[0]?.price ?? prev.kalshiLastPct;
      const lastPoly = polyRows[0]?.price ?? prev.polyLastPct;
      return {
        ...prev,
        kalshiTrades: toLivelineRows(kalshiRows),
        polyTrades: toLivelineRows(polyRows),
        trades: merged.slice(0, 80),
        kalshiLastPct: lastKalshi,
        polyLastPct: lastPoly,
      };
    },
    ({ kalshi, poly }) => `${kalshi.length} Kalshi prints · ${poly.length} Polymarket prints`,
  );

  void run(
    "books",
    { depth: 40 },
    "books",
    async () => {
      const [kalshi, poly] = await Promise.all([
        fetchKalshiOrderbook(ticker, signal).catch(() => ({ bids: [], asks: [] })),
        tokenId
          ? fetchPolyBook(tokenId, signal).catch(() => ({ bids: [], asks: [] }))
          : Promise.resolve({ bids: [], asks: [] }),
      ]);
      return { kalshi, poly };
    },
    ({ kalshi, poly }, prev) => ({
      ...prev,
      kalshiBook: kalshi,
      polyBook: poly,
      kalshiSpread: spreadFromBook(kalshi),
      polySpread: spreadFromBook(poly),
    }),
    ({ kalshi, poly }) =>
      `${kalshi.bids.length + kalshi.asks.length} Kalshi levels · ${poly.bids.length + poly.asks.length} Polymarket levels`,
  );

  void run(
    "candles",
    { interval: "1h" },
    "candles",
    async () => {
      const [kalshi, history] = await Promise.all([
        fetchKalshiCandles(ticker, signal).catch(() => [] as CandlePoint[]),
        tokenId ? fetchPolyHistory(tokenId, signal).catch(() => [] as PricePoint[]) : Promise.resolve([] as PricePoint[]),
      ]);
      const historyRows = history.map((point) => ({
        asset_id: tokenId,
        timestamp: point.t,
        price: invertPct(point.v, invert) / 100,
        size: 0,
      }));
      const poly = buildPolymarketCandlestickSeedRows(historyRows, "1h")
        .map((row: Record<string, unknown>) => candleFromPoly(row))
        .filter(Boolean) as CandlePoint[];
      return { kalshi, poly, history: history.map((point) => ({ ...point, v: invertPct(point.v, invert) })) };
    },
    ({ kalshi, poly, history }, prev) => ({
      ...prev,
      kalshiCandles: kalshi,
      polyCandles: poly,
      polyHistory: history,
      polyLastPct: history.at(-1)?.v ?? prev.polyLastPct,
    }),
    ({ kalshi, poly }) => `${kalshi.length} Kalshi bars · ${poly.length} Polymarket bars`,
  );

  void run(
    "holders",
    { market: conditionId.slice(0, 12) },
    "holders",
    async () =>
      conditionId ? fetchPolyHolders(conditionId, pair.polyMarket, signal).catch(() => [] as HolderRow[]) : [],
    (holders, prev) => ({ ...prev, holders }),
    (holders) => `${holders.length} wallets ranked`,
  );
}

export async function fetchHolderPositions(wallet: string, signal: AbortSignal): Promise<Record<string, unknown>[]> {
  const qs = new URLSearchParams({
    query: "getCurrentPositions",
    user: wallet,
    sizeThreshold: "0",
    limit: "30",
    skipFlatten: "true",
  });
  const payload = await fetchJson(`/api/integrations/polymarket?${qs.toString()}`, signal);
  return objectList(payload);
}
