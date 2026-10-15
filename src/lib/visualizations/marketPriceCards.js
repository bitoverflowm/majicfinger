import { formatCents, sheetRecords } from "@/lib/visualizations/datasetDescriptor";

function priceOf(row, field) {
  if (!field) return null;
  const n = Number(row?.[field]);
  return Number.isFinite(n) ? n : null;
}

/**
 * One stat card per market-price row. The headline is the buy price.
 * The caption carries the outcome, the sell price, and the spread.
 * @param {object | null | undefined} sheet
 * @param {object | null | undefined} dataset
 */
export function marketPriceCards(sheet, dataset) {
  const fields = dataset?.fields || {};
  const buyField = fields.value || fields.bid || "buy_price";
  const sellField = fields.ask || "sell_price";
  const titleField = fields.label || "market_title";
  const outcomeField = fields.outcome || "outcome";
  return sheetRecords(sheet).map((row) => {
    const title = String(row?.[titleField] ?? "").trim();
    const outcome = String(row?.[outcomeField] ?? "").trim();
    const buy = priceOf(row, buyField);
    const sell = priceOf(row, sellField);
    const headline = buy != null ? buy : sell;
    const caption = [
      title && outcome ? outcome : "",
      buy != null && sell != null ? `Sell ${formatCents(sell)}` : "",
      buy != null && sell != null ? `Spread ${formatCents(sell - buy)}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      label: title || outcome || "Market",
      value: headline != null ? headline : 0,
      format: () => (headline != null ? formatCents(headline) : "—"),
      caption: caption || (headline != null ? "" : "No price"),
    };
  });
}

/** Chart block height that fits the first cards, then scrolls. */
export function statCardBlockHeight(count) {
  const n = Math.max(1, Math.min(8, Math.floor(Number(count) || 0)));
  return 64 + n * 118;
}
