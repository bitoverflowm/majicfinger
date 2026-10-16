/**
 * Polymarket's lake stores CTF Exchange fills, not priced trades. Each fill swaps USDC
 * (asset 0) for outcome shares, and both amounts carry 6 decimals. The price, outcome,
 * and side a chart needs come from those two legs and the market's outcome tokens.
 */

const UNIT = 1e6;

/** Columns added in front of the raw fill columns. Ids match the polymarket:trades descriptor. */
export const POLYMARKET_FILL_COLUMNS = [
  { id: "outcome", title: "Outcome", type: "string", description: "Outcome the shares belong to" },
  { id: "side", title: "Side", type: "string", description: "Taker side. BUY when the taker paid USDC for shares" },
  { id: "price", title: "Price", type: "number", description: "USDC paid per share, 0 to 1" },
  { id: "size", title: "Size", type: "number", description: "Shares filled" },
  { id: "usdc_amount", title: "USDC", type: "number", description: "USDC exchanged in the fill" },
];

/** Raw fill columns stored in 6-decimal units. */
export const POLYMARKET_FILL_AMOUNTS = new Set(["maker_amount", "taker_amount", "fee"]);

/**
 * Outcome labels from a market's `outcomes` field: a JSON array or a comma list.
 * @param {unknown} value
 * @returns {string[]}
 */
export function marketOutcomes(value) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
  } catch {
    // Some exports keep the list unquoted.
  }
  return raw
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function units(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n / UNIT : null;
}

function outcomeFor(index, tokens, outcomes) {
  if (index < 0) return "";
  if (outcomes[index]) return outcomes[index];
  if (tokens.length === 2) return index === 0 ? "Yes" : "No";
  return `Outcome ${index + 1}`;
}

/**
 * One fill with readable amounts and its price, outcome, side, size, and USDC.
 * A fill that does not swap USDC for shares keeps blank price fields.
 * @param {Record<string, unknown>} row
 * @param {string[]} tokens the market's clob token ids, in outcome order
 * @param {string[]} [outcomes] labels in the same order
 */
export function priceFill(row, tokens, outcomes = []) {
  const makerAsset = String(row?.maker_asset_id ?? "").trim();
  const takerAsset = String(row?.taker_asset_id ?? "").trim();
  const makerAmount = units(row?.maker_amount);
  const takerAmount = units(row?.taker_amount);
  const amounts = { maker_amount: makerAmount, taker_amount: takerAmount, fee: units(row?.fee) };
  const makerPaid = makerAsset === "0";
  const takerPaid = takerAsset === "0";
  if (makerPaid === takerPaid) {
    return { ...row, ...amounts, outcome: "", side: "", price: null, size: null, usdc_amount: null };
  }
  const token = makerPaid ? takerAsset : makerAsset;
  const usdc = makerPaid ? makerAmount : takerAmount;
  const shares = makerPaid ? takerAmount : makerAmount;
  const price = usdc != null && shares ? Math.round((usdc / shares) * 1e4) / 1e4 : null;
  return {
    ...row,
    ...amounts,
    outcome: outcomeFor((tokens || []).indexOf(token), tokens || [], outcomes || []),
    side: takerPaid ? "BUY" : "SELL",
    price,
    size: shares,
    usdc_amount: usdc,
  };
}
