function cents(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return null;
  const p = n > 1.5 ? n : n * 100;
  return `${Math.round(p)}¢`;
}

function lineForMarket(m) {
  const venue = m.venue === "kalshi" ? "Kalshi" : "Poly";
  const price = cents(m.yes_price);
  const title = String(m.title || "").replace(/\s+/g, " ").trim().slice(0, 72);
  const bits = [venue, title];
  if (price) bits.push(price);
  return bits.filter(Boolean).join(" · ");
}

/**
 * Public X copy from a gated pack. No MCP tool names. No "fact check".
 */
export function formatXReply(pack) {
  const mode = pack?.intent?.mode;
  const markets = (pack?.markets || []).slice(0, 2);
  const lookalikes = (pack?.lookalikes || []).slice(0, 1);
  const news = (pack?.news || []).slice(0, 2);
  const take = String(pack?.take || "").replace(/\s+/g, " ").trim();
  const cta = "lycheedata.com/jarvis";

  if (pack?.status === "needs_clarification") {
    return pack.ask_user || "Reply under the post and tag me again with a market, wallet, or news item.";
  }

  if (mode === "pulse") {
    const alerts = pack?.pulse_alerts || [];
    const h1 = alerts[0]?.headline || take;
    const h2 = alerts[1]?.headline;
    return [h1, h2 ? `Also: ${h2}` : null, cta].filter(Boolean).join("\n").slice(0, 380);
  }

  if (mode === "verify") {
    const head =
      pack.verdict === "backed"
        ? "Lychee data lines up with that."
        : pack.verdict === "conflicts"
          ? "Lychee data does not back that as stated."
          : "Can't back that from Lychee listed markets yet.";
    const body = [head, markets[0] ? lineForMarket(markets[0]) : null, take, cta].filter(Boolean);
    return body.join("\n").slice(0, 380);
  }

  if (mode === "news_impact") {
    if (!markets.length || pack.verdict === "none") {
      return [`No listed Kalshi/Poly market tied to that news in Lychee.`, take, cta].filter(Boolean).join("\n").slice(0, 380);
    }
    const head =
      pack.verdict === "cousin"
        ? "Not a clean match — closest listed books:"
        : `Markets this news can hit (${markets.length} listed):`;
    const extra = news[0]?.title ? `Also seeing: ${String(news[0].title).slice(0, 80)}` : null;
    return [head, ...markets.map(lineForMarket), take, extra, cta].filter(Boolean).join("\n").slice(0, 420);
  }

  if (pack.verdict === "none") {
    const cousin = lookalikes[0] || markets[0];
    return [
      `No listed market for that exact thing.`,
      cousin ? `Closest: ${lineForMarket(cousin)}` : null,
      take,
      cta,
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 380);
  }

  const head =
    pack.verdict === "cousin"
      ? "Not the same event — closest listed:"
      : markets.length
        ? `Yes — ${markets.length} listed.`
        : take || "Lychee scan:";
  const whale = pack.whale_line && pack.whale_line !== take ? pack.whale_line : null;
  return [head, ...markets.map(lineForMarket), lookalikes[0] ? `Lookalike: ${lineForMarket(lookalikes[0])}` : null, whale || take, cta]
    .filter(Boolean)
    .join("\n")
    .slice(0, 420);
}
