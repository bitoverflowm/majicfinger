import { loadPolymarketTraderJoin } from "@/components/dashboardComposer/polymarketLiveBuild";
import { TRADER_ACTIVITY_ENDPOINT_ID } from "@/lib/polymarketLive/traderActivityCompose";
import { TRADER_PNL_ENDPOINT_ID } from "@/lib/polymarketLive/traderPnlCompose";
import { TRADER_POSITIONS_ENDPOINT_ID } from "@/lib/polymarketLive/traderPositionsCompose";
import { polymarketGet } from "./polymarketTradeHistorySource";

export const RECIPE_POLYMARKET_HOLDER_ANALYSIS = "polymarketHolderAnalysis";

/** Holder pages carry profit columns, which Polymarket caps at 100 holders per outcome. */
const HOLDER_PAGE_SIZE = 100;
export const HOLDER_PAGES = 3;
export const TOP_TRADER_COUNT = 5;
export const TRADER_ROW_LIMIT = 500;

export const HOLDER_COLUMNS = [
  { id: "rank", title: "Rank", type: "number", exact: true },
  { id: "name", title: "Trader", type: "string" },
  { id: "amount", title: "Shares", type: "number" },
  { id: "share_pct", title: "% of listed shares", type: "number" },
  { id: "current_value", title: "Value (USDC)", type: "number" },
  { id: "avg_price", title: "Avg price", type: "number" },
  { id: "total_pnl", title: "Total PnL", type: "number" },
  { id: "both_sides", title: "Holds both sides", type: "boolean" },
  { id: "new_wallet", title: "New wallet", type: "boolean" },
  { id: "age_days", title: "Age (days)", type: "number", exact: true },
  { id: "wallet_created", title: "Wallet created", type: "date", dateEpoch: "iso" },
  { id: "proxy_wallet", title: "Wallet", type: "string" },
  { id: "outcome", title: "Outcome", type: "string" },
  { id: "market_title", title: "Market", type: "string" },
  { id: "condition_id", title: "Condition id", type: "string" },
];

export const BOTH_SIDES_COLUMN = { id: "both_sides", title: "Holds both sides", type: "boolean" };

/** A wallet whose Polymarket profile is younger than this is flagged as new. */
export const NEW_WALLET_DAYS = 30;
/** Polymarket's batch profile lookup takes at most 100 addresses. */
const PROFILE_BATCH = 100;
const DAY_MS = 86_400_000;

function num(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function shortWallet(wallet) {
  const text = String(wallet || "");
  return text.length > 10 ? `${text.slice(0, 6)}…${text.slice(-4)}` : text;
}

/** Display name, then the generated handle, then a shortened wallet. */
export function holderLabel(holder) {
  const name = String(holder?.name || "").trim();
  if (name && !/^0x[a-fA-F0-9]{40}/.test(name)) return name;
  const pseudonym = String(holder?.pseudonym || "").trim();
  return pseudonym || shortWallet(holder?.proxy_wallet || name);
}

function holderValue(holder) {
  const value = num(holder?.current_value);
  if (value != null) return value;
  const shares = num(holder?.amount) || 0;
  return shares * (num(holder?.current_price) || 0);
}

function sideIndex(meta, tokenId, outcomeIndex) {
  const at = (meta.tokenIds || []).map(String).indexOf(String(tokenId || ""));
  if (at >= 0) return at;
  const n = Number(outcomeIndex);
  return n === 0 || n === 1 ? n : -1;
}

/**
 * When each wallet's Polymarket profile was set up, in ms. Contracts and wallets without a
 * profile are left out. A failed batch leaves its wallets blank rather than failing the pull.
 */
export async function pullWalletCreated(wallets, { signal } = {}) {
  const list = [...new Set((wallets || []).filter((wallet) => /^0x[a-f0-9]{40}$/.test(wallet)))];
  const batches = [];
  for (let at = 0; at < list.length; at += PROFILE_BATCH) batches.push(list.slice(at, at + PROFILE_BATCH));
  const results = await Promise.allSettled(
    batches.map((batch) => polymarketGet("getPublicProfilesBatch", { addresses: batch.join(",") }, signal, { retries: 2 })),
  );
  const created = new Map();
  for (const result of results) {
    if (result.status === "rejected") {
      if (result.reason?.name === "AbortError") throw result.reason;
      continue;
    }
    const root = Array.isArray(result.value) ? result.value[0] : result.value;
    for (const profile of Array.isArray(root?.profiles) ? root.profiles : []) {
      const ms = Date.parse(String(profile?.createdAt || ""));
      const wallet = String(profile?.address || profile?.proxyWallet || "").toLowerCase();
      if (wallet && Number.isFinite(ms)) created.set(wallet, ms);
    }
  }
  return created;
}

/** Days since the wallet was set up, and whether that's recent enough to flag. */
export function walletAge(createdMs, now = Date.now()) {
  if (!Number.isFinite(createdMs)) return { wallet_created: "", age_days: null, new_wallet: false };
  const days = Math.max(0, Math.floor((now - createdMs) / DAY_MS));
  return { wallet_created: new Date(createdMs).toISOString(), age_days: days, new_wallet: days < NEW_WALLET_DAYS };
}

/**
 * The market's largest holders on each outcome, with profit columns. Each page adds up to 100
 * holders per outcome. A wallet listed on both outcomes is flagged on both rows, and so is a
 * wallet set up in the last 30 days.
 */
export async function pullMarketHolders(meta, { pages = 1, signal, onProgress } = {}) {
  const outcomes = meta.outcomes?.length >= 2 ? meta.outcomes.slice(0, 2) : ["Yes", "No"];
  const buckets = outcomes.map(() => []);
  let cursor = "";
  let more = false;
  for (let page = 0; page < pages; page += 1) {
    const body = await polymarketGet(
      "getHoldersByMarket",
      { condition: meta.conditionId, limit: String(HOLDER_PAGE_SIZE), include_pnl: "true", ...(cursor ? { cursor } : {}) },
      signal,
      { retries: 3, onWait: (seconds) => onProgress?.(`Polymarket is busy · retrying in ${seconds}s`) },
    );
    const root = Array.isArray(body) ? body[0] : body;
    for (const group of Array.isArray(root?.data) ? root.data : []) {
      for (const holder of Array.isArray(group?.holders) ? group.holders : []) {
        const index = sideIndex(meta, group?.token_id || holder?.token_id, holder?.outcome_index);
        if (index === 0 || index === 1) buckets[index].push(holder);
      }
    }
    cursor = String(root?.pagination?.next_cursor || "").trim();
    more = Boolean(root?.pagination?.has_more && cursor);
    onProgress?.(`Read ${buckets[0].length.toLocaleString()} ${outcomes[0]} and ${buckets[1].length.toLocaleString()} ${outcomes[1]} holders`);
    if (!more) break;
  }

  const wallets = buckets.map((list) => new Set(list.map((holder) => String(holder.proxy_wallet || "").toLowerCase())));
  const both = new Set([...wallets[0]].filter((wallet) => wallet && wallets[1].has(wallet)));
  onProgress?.("Checking when each wallet was set up");
  const created = await pullWalletCreated([...wallets[0], ...wallets[1]], { signal });
  const now = Date.now();
  const fresh = new Set();
  const sides = buckets.map((list, index) => {
    const sorted = [...list].sort((a, b) => (num(b.amount) || 0) - (num(a.amount) || 0));
    const total = sorted.reduce((sum, holder) => sum + (num(holder.amount) || 0), 0);
    return {
      outcome: outcomes[index],
      tokenId: String(meta.tokenIds?.[index] || ""),
      rows: sorted.map((holder, at) => {
        const wallet = String(holder.proxy_wallet || "").toLowerCase();
        const amount = num(holder.amount);
        const age = walletAge(created.get(wallet), now);
        if (age.new_wallet) fresh.add(wallet);
        return {
          rank: at + 1,
          name: holderLabel(holder),
          pseudonym: String(holder.pseudonym || ""),
          has_profile: Boolean(String(holder.name || "").trim() || String(holder.pseudonym || "").trim()),
          proxy_wallet: wallet,
          outcome: outcomes[index],
          outcome_index: index,
          amount,
          share_pct: total > 0 && amount != null ? Math.round((amount / total) * 10000) / 100 : null,
          avg_price: num(holder.avg_price),
          current_price: num(holder.current_price),
          current_value: num(holder.current_value),
          total_pnl: num(holder.total_pnl),
          both_sides: both.has(wallet),
          ...age,
          market_title: meta.title,
          condition_id: meta.conditionId,
        };
      }),
    };
  });
  return { sides, bothCount: both.size, newCount: fresh.size, truncated: more };
}

/**
 * The traders with the most money in this market, counting both outcomes. Each one keeps what it
 * holds on each side, so a two-sided holder can be flagged.
 */
export function topHolderTraders(sides, count = TOP_TRADER_COUNT) {
  const byWallet = new Map();
  for (const side of sides || []) {
    for (const row of side.rows || []) {
      const wallet = row.proxy_wallet;
      if (!/^0x[a-f0-9]{40}$/.test(wallet)) continue;
      const entry = byWallet.get(wallet) || {
        wallet,
        label: row.name,
        hasProfile: row.has_profile !== false,
        isNew: row.new_wallet === true,
        ageDays: row.age_days ?? null,
        value: 0,
        sides: [],
      };
      const value = holderValue(row);
      entry.value += value;
      entry.sides.push({ outcome: side.outcome, shares: row.amount || 0, value, rank: row.rank });
      byWallet.set(wallet, entry);
    }
  }
  return [...byWallet.values()]
    .map((entry) => ({ ...entry, both: entry.sides.length > 1 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, count);
}

export const PROTOCOL_CONTRACT = /protocol contract/i;

/**
 * Top holders that are traders. Polymarket's own contracts (adapters, exchanges) can hold big
 * positions but have no positions, activity, or PnL of their own, so they are skipped. Only
 * wallets without a profile are checked, since contracts never have one.
 */
export async function screenTopTraders(candidates, { count = TOP_TRADER_COUNT, signal } = {}) {
  const picked = [];
  const skipped = [];
  for (const trader of candidates || []) {
    if (picked.length >= count) break;
    if (!trader.hasProfile) {
      try {
        await polymarketGet("getTraderPositions", { user: trader.wallet, limit: "1" }, signal);
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        if (PROTOCOL_CONTRACT.test(String(err?.message || ""))) {
          skipped.push(trader);
          continue;
        }
      }
    }
    picked.push(trader);
  }
  return { traders: picked, skipped };
}

/** Markets where the trader still holds more than one outcome. */
function flagBothSides(rows) {
  const held = new Map();
  for (const row of rows) {
    const key = String(row.condition_id || "").toLowerCase();
    if (!key || !(Number(row.current_size) > 0)) continue;
    if (!held.has(key)) held.set(key, new Set());
    held.get(key).add(String(row.outcome || row.outcome_index));
  }
  return rows.map((row) => ({ ...row, both_sides: (held.get(String(row.condition_id || "").toLowerCase())?.size || 0) > 1 }));
}

const RATE_LIMITED = /too many requests|rate limit|\b429\b/i;
const RETRY_SECONDS = [2, 4, 8];

/** Polymarket rate-limits trader endpoints in bursts, so a limited part waits and tries again. */
async function withRetry(load, onWait) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await load();
    } catch (err) {
      const seconds = RETRY_SECONDS[attempt];
      if (!seconds || !RATE_LIMITED.test(String(err?.message || ""))) throw err;
      onWait?.(seconds);
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    }
  }
}

/** One trader's open positions, activity, and PnL. A part that fails comes back with its error. */
export async function pullTraderBundle(trader, { onWait } = {}) {
  const pick = { address: trader.wallet, label: trader.label };
  const limits = { rowLimit: TRADER_ROW_LIMIT, planLimit: TRADER_ROW_LIMIT };
  const load = (endpointId) => withRetry(() => loadPolymarketTraderJoin(endpointId, pick, limits), onWait);
  const [positions, activity, pnl] = await Promise.allSettled([
    load(TRADER_POSITIONS_ENDPOINT_ID),
    load(TRADER_ACTIVITY_ENDPOINT_ID),
    load(TRADER_PNL_ENDPOINT_ID),
  ]);
  const settle = (result) =>
    result.status === "fulfilled" ? { ...result.value, error: "" } : { columns: [], rows: [], error: result.reason?.message || "Pull failed" };
  const held = settle(positions);
  if (held.rows.length) {
    held.columns = [...held.columns.filter((column) => column.id !== BOTH_SIDES_COLUMN.id), BOTH_SIDES_COLUMN];
    held.rows = flagBothSides(held.rows);
  }
  return { positions: held, activity: settle(activity), pnl: settle(pnl) };
}
