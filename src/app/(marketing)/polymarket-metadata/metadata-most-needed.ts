/** Extract "Most Needed metadata" view models from Polymarket resolve / debug JSON. */

export type OutcomeBadgeTone = "yes" | "no" | "other" | "neutral";

export type ClobTokenRow = {
  tokenId: string;
  outcomeLabel: string;
  tone: OutcomeBadgeTone;
  highlighted: boolean;
};

export type MarketCardModel = {
  kind: "market";
  title: string;
  entityId: string;
  slug: string | null;
  conditionId: string | null;
  oddsLine: string | null;
  volumeLine: string | null;
  clobTokens: ClobTokenRow[];
};

export type EventCardModel = {
  kind: "event";
  title: string;
  entityId: string;
  slug: string | null;
  volumeLine: string | null;
  summaryLine: string;
  marketCount: number;
};

export type MostNeededView =
  | { focus: "market"; primary: MarketCardModel; subMarkets: [] }
  | { focus: "event"; primary: EventCardModel; subMarkets: MarketCardModel[] };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function parseJsonObject(jsonText: string): Record<string, unknown> | null {
  const t = jsonText.trim();
  if (!t || t === "Loading…") return null;
  try {
    const v = JSON.parse(t) as unknown;
    return asRecord(v);
  } catch {
    return null;
  }
}

export function parseOutcomesAndPrices(market: Record<string, unknown>): {
  outcomes: string[];
  outcomePrices: string[];
} {
  let outcomes: unknown = market.outcomes;
  let outcomePrices: unknown = market.outcomePrices;
  if (typeof outcomes === "string") {
    try {
      outcomes = JSON.parse(outcomes);
    } catch {
      outcomes = [];
    }
  }
  if (typeof outcomePrices === "string") {
    try {
      outcomePrices = JSON.parse(outcomePrices);
    } catch {
      outcomePrices = [];
    }
  }
  const o = Array.isArray(outcomes) ? outcomes.map((x) => String(x)) : [];
  const p = Array.isArray(outcomePrices) ? outcomePrices.map((x) => String(x)) : [];
  return { outcomes: o, outcomePrices: p };
}

export function parseTokenIdsFromMarket(market: Record<string, unknown>): string[] {
  let ids: unknown = market.clobTokenIds ?? market.clob_token_ids;
  if (typeof ids === "string") {
    const raw = ids;
    try {
      ids = JSON.parse(raw);
    } catch {
      ids = raw.includes(",") ? raw.split(",").map((s) => s.trim()) : [raw];
    }
  }
  return Array.isArray(ids) ? ids.filter(Boolean).map((s) => String(s).trim()) : [];
}

function toneForOutcome(label: string): OutcomeBadgeTone {
  const l = label.trim().toLowerCase();
  if (l === "yes") return "yes";
  if (l === "no") return "no";
  return "other";
}

function formatUsdish(n: unknown): string | null {
  if (n == null || n === "") return null;
  const num = typeof n === "number" ? n : Number(String(n).replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: num >= 1_000_000 ? 0 : 2,
    notation: num >= 1_000_000 ? "compact" : "standard",
  }).format(num);
}

function formatOddsLine(market: Record<string, unknown>): string | null {
  const { outcomes, outcomePrices } = parseOutcomesAndPrices(market);
  if (!outcomes.length) {
    const last = market.lastTradePrice;
    const bb = market.bestBid;
    const ba = market.bestAsk;
    if (last != null || bb != null || ba != null) {
      const parts: string[] = [];
      if (last != null) parts.push(`Last ${Number(last).toFixed(2)}`);
      if (bb != null && ba != null) parts.push(`Bid/Ask ${Number(bb).toFixed(2)} / ${Number(ba).toFixed(2)}`);
      return parts.length ? parts.join(" · ") : null;
    }
    return null;
  }
  const parts: string[] = [];
  const n = Math.min(outcomes.length, outcomePrices.length);
  for (let i = 0; i < n; i++) {
    const p = parseFloat(outcomePrices[i] ?? "");
    const pct = Number.isFinite(p) ? `${(p * 100).toFixed(1)}%` : "n/a";
    parts.push(`${outcomes[i]} ${pct}`);
  }
  return parts.join(" · ") || null;
}

function formatVolumeLine(obj: Record<string, unknown>): string | null {
  const v24 = obj.volume24hr ?? obj.volume24hrClob;
  const v = obj.volume ?? obj.volumeNum ?? obj.volumeClob;
  const primary = v24 != null && String(v24).trim() !== "" ? v24 : v;
  const formatted = formatUsdish(primary);
  if (!formatted) return null;
  if (v24 != null && String(v24).trim() !== "") return `${formatted} (24h)`;
  return formatted;
}

function firstMarketFromArray(data: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
  for (const k of keys) {
    const v = data[k];
    if (Array.isArray(v) && v.length > 0) {
      const first = asRecord(v[0]);
      if (first) return first;
    }
  }
  return null;
}

function pickMarketRecord(data: Record<string, unknown>): Record<string, unknown> | null {
  const direct = asRecord(data.market)
    ?? asRecord(data.marketById)
    ?? asRecord(data.marketBySlug);
  if (direct) return direct;
  const fromArr =
    firstMarketFromArray(data, ["marketsByConditionId", "gammaMarketsByConditionFromToken"]) ?? null;
  if (fromArr) return fromArr;
  const clob = asRecord(data.marketByToken);
  if (clob?.condition_id) {
    const primary = clob.primary_token_id != null ? String(clob.primary_token_id) : "";
    const secondary = clob.secondary_token_id != null ? String(clob.secondary_token_id) : "";
    const tokens = [primary, secondary].filter(Boolean);
    return {
      question: "Market (from CLOB token lookup)",
      id: "",
      slug: null,
      conditionId: String(clob.condition_id),
      outcomes: tokens.length === 2 ? JSON.stringify(["Primary (CLOB)", "Secondary (CLOB)"]) : "[]",
      outcomePrices: "[]",
      clobTokenIds: JSON.stringify(tokens),
      volume24hr: null,
      volume: null,
    };
  }
  return null;
}

function pickEventRecord(data: Record<string, unknown>): Record<string, unknown> | null {
  return asRecord(data.event) ?? asRecord(data.eventById) ?? asRecord(data.eventBySlug);
}

function parseEventMarkets(event: Record<string, unknown>): Record<string, unknown>[] {
  let raw = event.markets;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.map((m) => asRecord(m)).filter(Boolean) as Record<string, unknown>[];
}

function highlightTokenSet(
  data: Record<string, unknown>,
  searchQuery: string,
): Set<string> {
  const ids = new Set<string>();
  const sel = asRecord(data.selection);
  const tid = sel?.tokenId != null ? String(sel.tokenId).trim() : "";
  if (tid) ids.add(tid);
  const q = searchQuery.trim();
  if (/^\d{20,}$/.test(q)) ids.add(q);
  const parsed = asRecord(data.parsed);
  const pt = parsed?.tokenId != null ? String(parsed.tokenId).trim() : "";
  if (pt) ids.add(pt);
  return ids;
}

function marketToCardModel(market: Record<string, unknown>, highlight: Set<string>): MarketCardModel {
  const title =
    String(market.question ?? market.groupItemTitle ?? market.title ?? "Market").trim() || "Market";
  const entityId = String(market.id ?? "").trim();
  const slug = market.slug != null && String(market.slug).trim() !== "" ? String(market.slug) : null;
  const conditionIdRaw = market.conditionId ?? market.condition_id;
  const conditionId =
    conditionIdRaw != null && String(conditionIdRaw).trim() !== "" ? String(conditionIdRaw).trim() : null;

  const { outcomes, outcomePrices } = parseOutcomesAndPrices(market);
  const tokenIds = parseTokenIdsFromMarket(market);

  const clobTokens: ClobTokenRow[] = tokenIds.map((tokenId, i) => {
    const outcomeLabel =
      outcomes[i] ??
      (tokenIds.length === 2 ? (i === 0 ? "Outcome 1" : "Outcome 2") : `Outcome ${i + 1}`);
    const isNeutral = /primary \(clob\)|secondary \(clob\)/i.test(outcomeLabel);
    const tone: OutcomeBadgeTone = isNeutral ? "neutral" : toneForOutcome(outcomeLabel);
    return {
      tokenId,
      outcomeLabel,
      tone,
      highlighted: highlight.has(tokenId),
    };
  });

  return {
    kind: "market",
    title,
    entityId,
    slug,
    conditionId,
    oddsLine: formatOddsLine(market),
    volumeLine: formatVolumeLine(market),
    clobTokens,
  };
}

function eventToCardModel(event: Record<string, unknown>, markets: Record<string, unknown>[]): EventCardModel {
  const title = String(event.title ?? event.ticker ?? "Event").trim() || "Event";
  const entityId = String(event.id ?? "").trim();
  const slug = event.slug != null && String(event.slug).trim() !== "" ? String(event.slug) : null;
  const vol = formatVolumeLine(event);
  const count = markets.length;
  return {
    kind: "event",
    title,
    entityId,
    slug,
    volumeLine: vol,
    summaryLine:
      count > 0
        ? `${count} market${count === 1 ? "" : "s"} in this event; odds and tokens are listed per market below.`
        : "No nested markets in this event payload.",
    marketCount: count,
  };
}

function resolveFocus(
  data: Record<string, unknown>,
  resultEntity: "event" | "market" | null,
): "event" | "market" | null {
  const sel = asRecord(data.selection);
  const ent = sel?.entity != null ? String(sel.entity) : "";
  if (ent === "event" || ent === "market") return ent as "event" | "market";
  if (resultEntity === "event" || resultEntity === "market") return resultEntity;
  if (pickMarketRecord(data)) return "market";
  if (pickEventRecord(data)) return "event";
  return null;
}

/** Matches suggestion list entity pills (event = emerald, market = violet). */
export function cardEntityPillClass(entity: "event" | "market"): string {
  if (entity === "event") {
    return "bg-emerald-500/15 text-emerald-900 ring-1 ring-emerald-600/25 dark:bg-emerald-400/15 dark:text-emerald-100 dark:ring-emerald-400/35";
  }
  return "bg-violet-500/15 text-violet-900 ring-1 ring-violet-600/25 dark:bg-violet-400/15 dark:text-violet-100 dark:ring-violet-400/35";
}

export function outcomeBadgeClass(tone: OutcomeBadgeTone): string {
  switch (tone) {
    case "yes":
      return "bg-emerald-500/15 text-emerald-900 ring-1 ring-emerald-600/30 dark:bg-emerald-400/15 dark:text-emerald-100 dark:ring-emerald-400/40";
    case "no":
      return "bg-rose-500/15 text-rose-900 ring-1 ring-rose-600/30 dark:bg-rose-400/15 dark:text-rose-100 dark:ring-rose-400/40";
    case "neutral":
      return "bg-slate-500/10 text-slate-700 ring-1 ring-slate-500/25 dark:text-slate-200 dark:ring-slate-400/30";
    default:
      return "bg-violet-500/15 text-violet-900 ring-1 ring-violet-600/25 dark:bg-violet-400/15 dark:text-violet-100 dark:ring-violet-400/35";
  }
}

export function buildMostNeededView(
  jsonText: string,
  resultEntity: "event" | "market" | null,
  searchQuery: string,
): MostNeededView | null {
  const data = parseJsonObject(jsonText);
  if (!data) return null;

  const focus = resolveFocus(data, resultEntity);
  const highlight = highlightTokenSet(data, searchQuery);

  if (focus === "market") {
    const market = pickMarketRecord(data);
    if (!market) return null;
    const primary = marketToCardModel(market, highlight);
    const hasCore =
      Boolean(primary.entityId) ||
      Boolean(primary.slug) ||
      Boolean(primary.conditionId) ||
      primary.clobTokens.length > 0;
    if (!hasCore) return null;
    return { focus: "market", primary, subMarkets: [] };
  }

  if (focus === "event") {
    const event = pickEventRecord(data);
    if (!event) return null;
    const markets = parseEventMarkets(event);
    const primary = eventToCardModel(event, markets);
    const subMarkets = markets.map((m) => marketToCardModel(m, highlight));
    return { focus: "event", primary, subMarkets };
  }

  return null;
}
