function sum(values) {
  return values.reduce((a, b) => a + b, 0);
}

function sortedAmounts(rows) {
  return rows
    .map((r) => Number(r.amount))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => b - a);
}

function concentration(amounts) {
  if (!amounts.length) return null;
  const total = sum(amounts);
  if (!(total > 0)) return null;
  const top1 = amounts[0] / total;
  const top5 = sum(amounts.slice(0, 5)) / total;
  const top10 = sum(amounts.slice(0, 10)) / total;
  return {
    total_shares: total,
    top1_share: top1,
    top5_share: top5,
    top10_share: top10,
    herfindahl:
      amounts.reduce((acc, v) => {
        const p = v / total;
        return acc + p * p;
      }, 0) || null,
  };
}

/**
 * Holder-side analytics + research recommendations (not trade execution).
 */
export function analyzeHolders(rows, { marketTitle = "", yesPrice = null, noPrice = null } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const yes = list.filter((r) => r.outcome === "YES" || r.outcome_index === 0);
  const no = list.filter((r) => r.outcome === "NO" || r.outcome_index === 1);
  const yesAmt = sortedAmounts(yes);
  const noAmt = sortedAmounts(no);
  const yesConc = concentration(yesAmt);
  const noConc = concentration(noAmt);

  const topYes = yes
    .slice()
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((r) => ({
      name: r.name || r.pseudonym || r.proxy_wallet,
      amount: r.amount,
      proxy_wallet: r.proxy_wallet,
    }));
  const topNo = no
    .slice()
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((r) => ({
      name: r.name || r.pseudonym || r.proxy_wallet,
      amount: r.amount,
      proxy_wallet: r.proxy_wallet,
    }));

  const imbalance =
    yesConc && noConc ? (yesConc.total_shares - noConc.total_shares) / Math.max(yesConc.total_shares, noConc.total_shares) : null;

  const inferences = [];
  if (yesConc?.top1_share >= 0.35) {
    inferences.push(
      `YES side is highly concentrated (largest wallet ~${(yesConc.top1_share * 100).toFixed(1)}% of measured YES). Tail risk if that wallet exits.`,
    );
  }
  if (noConc?.top1_share >= 0.35) {
    inferences.push(
      `NO side is highly concentrated (largest wallet ~${(noConc.top1_share * 100).toFixed(1)}% of measured NO).`,
    );
  }
  if (imbalance != null && Math.abs(imbalance) >= 0.25) {
    inferences.push(
      imbalance > 0
        ? "Measured YES open interest among top holders exceeds NO — watch for YES overhang / squeeze dynamics."
        : "Measured NO open interest among top holders exceeds YES — watch for NO overhang.",
    );
  }
  if (Number.isFinite(yesPrice) && Number.isFinite(noPrice) && Math.abs(yesPrice + noPrice - 1) > 0.03) {
    inferences.push("Quoted YES+NO prices deviate from ~1.00 — check stale quotes or fee/spread structure before sizing.");
  }
  if (!inferences.length) {
    inferences.push("Holder distribution looks relatively balanced in this sample; still verify liquidity and event calendar risk.");
  }

  const trade_hypotheses = [];
  if (yesConc?.top1_share >= 0.4) {
    trade_hypotheses.push({
      idea: "Fade or hedge into YES concentration",
      rationale: "A single dominant YES holder can move marks if they reduce; structure risk with defined max loss.",
      risk: "If insider/correct thesis, fading concentration loses.",
    });
  }
  if (imbalance != null && imbalance > 0.3 && Number.isFinite(yesPrice) && yesPrice > 0.7) {
    trade_hypotheses.push({
      idea: "Careful on chasing high YES with concentrated ownership",
      rationale: "Rich YES + concentrated holders raises adverse-selection and exit liquidity risk.",
      risk: "Momentum can persist into announcement windows.",
    });
  }
  if (!trade_hypotheses.length) {
    trade_hypotheses.push({
      idea: "Prefer relative-value across lookalike deadlines over naked directional size",
      rationale: "Same underlying event with different dates often misprices timing; compare holders across contracts.",
      risk: "Event resolution can correlate all legs.",
    });
  }

  return {
    market_title: marketTitle || null,
    prices: { yes: yesPrice, no: noPrice },
    yes: { count: yes.length, concentration: yesConc, top: topYes },
    no: { count: no.length, concentration: noConc, top: topNo },
    imbalance,
    inferences,
    trade_hypotheses,
    risk_checklist: [
      "Liquidity / spread at your intended size",
      "Announcement calendar and resolution source clarity",
      "Wallet overlap / hedging across related markets",
      "Concentration: can one wallet move the mark?",
      "Do not treat hypotheses as advice — size only what you can lose",
    ],
    chart_suggestions: [
      { sheet_kind: "holders", chart_view: "bar", title: "Top holders by shares" },
      { sheet_kind: "holders_summary", chart_view: "bar", title: "YES vs NO top-10 mass" },
    ],
  };
}

export function analyzeTape(rows, { marketTitle = "" } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const prices = list.map((r) => Number(r.price)).filter((n) => Number.isFinite(n));
  const sizes = list.map((r) => Number(r.size)).filter((n) => Number.isFinite(n));
  const buys = list.filter((r) => String(r.side || "").toUpperCase() === "BUY");
  const sells = list.filter((r) => String(r.side || "").toUpperCase() === "SELL");
  const avg = prices.length ? sum(prices) / prices.length : null;
  const vol = sizes.length ? sum(sizes) : null;
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;

  const inferences = [];
  if (buys.length && sells.length) {
    const buyShare = buys.length / (buys.length + sells.length);
    if (buyShare >= 0.65) inferences.push("Tape sample is buy-heavy — short-horizon demand pressure in this window.");
    if (buyShare <= 0.35) inferences.push("Tape sample is sell-heavy — distribution / profit-taking in this window.");
  }
  if (min != null && max != null && max - min >= 0.08) {
    inferences.push(`Wide print range in sample (${min.toFixed(3)}–${max.toFixed(3)}) — elevated short-term volatility.`);
  }
  if (!inferences.length) inferences.push("Tape looks orderly in this sample; still cross-check holders and lookalike deadlines.");

  return {
    market_title: marketTitle || null,
    trade_count: list.length,
    buy_count: buys.length,
    sell_count: sells.length,
    avg_price: avg,
    min_price: min,
    max_price: max,
    size_sum: vol,
    inferences,
    trade_hypotheses: [
      {
        idea: "Use tape only as timing context, not as sole edge",
        rationale: "Small samples overfit; combine with holders + related-market structure.",
        risk: "Spoofing / wash and incomplete public tape.",
      },
    ],
    chart_suggestions: [{ sheet_kind: "trades", chart_view: "trade-price", title: "Recent prints" }],
  };
}

/**
 * Calibration / reliability from forecast rows.
 * Each row: { forecast: 0..1 probability of YES (or event), outcome_won: 0|1|boolean, label? }
 */
export function analyzeCalibration(rows, { title = "", bins = 10 } = {}) {
  const list = (Array.isArray(rows) ? rows : [])
    .map((r) => {
      const forecast = Number(r.forecast ?? r.yes_price ?? r.p ?? r.price);
      let won = r.outcome_won ?? r.yes_won ?? r.won;
      if (typeof won === "boolean") won = won ? 1 : 0;
      won = Number(won);
      return {
        label: r.label || r.title || r.market_title || null,
        forecast,
        outcome_won: won,
      };
    })
    .filter((r) => Number.isFinite(r.forecast) && (r.outcome_won === 0 || r.outcome_won === 1));

  if (!list.length) {
    throw new Error(
      "Need rows with forecast (0–1) and outcome_won (0/1). Pull closed markets + preview_prices, then build those fields.",
    );
  }

  const n = Math.max(2, Math.min(20, Number(bins) || 10));
  const width = 1 / n;
  const buckets = Array.from({ length: n }, (_, i) => ({
    bin: i,
    lo: i * width,
    hi: (i + 1) * width,
    count: 0,
    wins: 0,
    forecast_sum: 0,
  }));

  let brier = 0;
  for (const row of list) {
    const f = Math.min(1, Math.max(0, row.forecast));
    brier += (f - row.outcome_won) ** 2;
    const idx = Math.min(n - 1, Math.floor(f / width));
    const b = buckets[idx];
    b.count += 1;
    b.wins += row.outcome_won;
    b.forecast_sum += f;
  }
  brier /= list.length;

  const reliability = buckets
    .filter((b) => b.count > 0)
    .map((b) => ({
      band: `${b.lo.toFixed(2)}–${b.hi.toFixed(2)}`,
      count: b.count,
      avg_forecast: b.forecast_sum / b.count,
      empirical_win_rate: b.wins / b.count,
      gap: b.wins / b.count - b.forecast_sum / b.count,
    }));

  const chart_rows = reliability.map((r) => ({
    band: r.band,
    avg_forecast: r.avg_forecast,
    empirical_win_rate: r.empirical_win_rate,
    count: r.count,
  }));

  const inferences = [];
  const over = reliability.filter((r) => r.count >= 3 && r.gap < -0.05);
  const under = reliability.filter((r) => r.count >= 3 && r.gap > 0.05);
  if (over.length) {
    inferences.push(
      `Overconfident in ${over.map((r) => r.band).join(", ")} — forecasts ran hotter than realized win rates.`,
    );
  }
  if (under.length) {
    inferences.push(
      `Underconfident in ${under.map((r) => r.band).join(", ")} — forecasts ran cooler than realized win rates.`,
    );
  }
  if (!inferences.length) {
    inferences.push("In this sample, average forecasts track empirical win rates reasonably; check thin bins.");
  }
  inferences.push(`Brier score ${brier.toFixed(4)} (lower is better; 0 = perfect). n=${list.length}.`);

  return {
    title: title || "Calibration",
    n: list.length,
    brier,
    reliability,
    chart_rows,
    inferences,
    suggest_next: [
      { tool: "pull_and_compose", why: "Land chart_rows as a Lychee bars sheet (avg_forecast vs empirical_win_rate)" },
      { tool: "search_closed_markets", why: "Widen the settled sample (more races / another cycle)" },
      { tool: "preview_prices", why: "Recompute with a different horizon (e.g. 7d before end_date)" },
      { tool: "publish_project", why: "Share the calibration dashboard" },
    ],
    chart_suggestions: [{ sheet_kind: "calibration", chart_view: "bars", title: "Reliability diagram" }],
  };
}
