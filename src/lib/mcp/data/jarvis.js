import { getMostActivePolymarketMarkets, getPolymarketTradesPreview, searchKalshi } from "./providers.js";
import { jarvisPowerUpImage, imageMarkdown } from "../chartSnapshots.js";

/**
 * Jarvis = proactive research mode.
 * MCP hosts cannot push into chat with no user turn — while Jarvis is on, the agent
 * must call jarvis_pulse at the start of each turn (or when the user says "pulse"/"update").
 */

export function jarvisPowerUpPayload() {
  const image = jarvisPowerUpImage();
  return {
    jarvis_mode: true,
    status: "online",
    power_up_markdown: imageMarkdown(image, "Jarvis powering up"),
    jarvis_power_up: { title: "Jarvis powering up", image },
    chart_images: [{ title: "Jarvis powering up", image }],
    how_it_works: [
      "Ask the user: Would you like to turn Jarvis mode on?",
      "If yes: call jarvis_on (shows power-up animation), then jarvis_pulse.",
      "While Jarvis is on: at the START of every user turn, call jarvis_pulse before answering — surface 1–3 interesting things unprompted.",
      "True push with zero user messages needs Slack/webhook later; in chat, Jarvis rides each turn + optional 'jarvis pulse' keepalives.",
    ],
    ask_user: "Would you like to turn Jarvis mode on?",
    suggest_next: [
      { tool: "jarvis_pulse", why: "First scan of hot Polymarket / Kalshi action" },
      { tool: "list_crazy_workflows", why: "If they want a focused research pack instead" },
    ],
  };
}

/**
 * One proactive scan — interesting volume, tape spikes, venue notes.
 */
export async function jarvisPulse({ limit = 8 } = {}) {
  const as_of = new Date().toISOString();
  const alerts = [];

  let active = [];
  try {
    active = await getMostActivePolymarketMarkets({ limit: Math.min(12, Math.max(5, limit)) });
  } catch (err) {
    alerts.push({
      kind: "error",
      headline: "Could not load hottest Polymarket markets",
      detail: err?.message || String(err),
    });
  }

  for (const [i, m] of active.slice(0, 5).entries()) {
    const vol = Number(m.volume_24h ?? m.volume ?? 0);
    alerts.push({
      kind: i === 0 ? "hot_market" : "active_market",
      headline:
        i === 0
          ? `Hottest right now: ${m.title || "Untitled"}`
          : `Also moving: ${m.title || "Untitled"}`,
      detail: `24h volume signal · condition_id ready for pull_market_bundle`,
      condition_id: m.condition_id,
      volume_24h: vol || null,
      why_interesting: i === 0 ? "Top of the Lychee 24h active ranking — worth a holders/tape look." : "High relative activity in the current session.",
      next_tools: ["pull_market_bundle", "analyze_holders", "get_realtime_snapshot"],
    });
  }

  // Dig into #1 tape for a concrete "interesting trade" style alert
  const top = active[0];
  if (top?.condition_id) {
    try {
      const tape = await getPolymarketTradesPreview(top.condition_id, { limit: 200 });
      const sized = (tape.rows || [])
        .map((r) => ({ ...r, notional: (Number(r.price) || 0) * (Number(r.size) || 0) }))
        .filter((r) => r.notional > 0)
        .sort((a, b) => b.notional - a.notional);
      const big = sized[0];
      if (big) {
        alerts.push({
          kind: "interesting_trade",
          headline: `Notable print on ${top.title || "top market"}`,
          detail: `${big.side || "TRADE"} ~${(big.notional || 0).toFixed(0)} notional @ ${big.price} (${big.outcome || "outcome n/a"})`,
          condition_id: top.condition_id,
          proxy_wallet: big.proxy_wallet || null,
          why_interesting: "Largest recent print in the Lychee tape sample — candidate to follow.",
          next_tools: big.proxy_wallet ? ["preview_trader", "analyze_tape"] : ["analyze_tape", "pull_market_bundle"],
        });
      }
    } catch {
      /* tape optional */
    }
  }

  try {
    const kalshi = await searchKalshi("election", { limit: 3 });
    for (const k of (kalshi || []).slice(0, 2)) {
      alerts.push({
        kind: "kalshi_watch",
        headline: `Kalshi on radar: ${k.title || k.ticker}`,
        detail: `ticker=${k.ticker || "?"} — compare_venues or preview_kalshi_market`,
        ticker: k.ticker || null,
        why_interesting: "Live Kalshi search hit while Jarvis is scanning both venues.",
        next_tools: ["preview_kalshi_market", "compare_venues"],
      });
    }
  } catch {
    /* optional */
  }

  return {
    jarvis_mode: true,
    as_of,
    role: "Proactive Lychee brief — narrate 1–3 alerts without waiting to be asked.",
    constraint:
      "Chat hosts only deliver this when a turn runs. Keep calling jarvis_pulse each turn while Jarvis is on. Push/webhook is next for true always-on.",
    alerts: alerts.slice(0, 8),
    speak_like:
      "Hey — something interesting is happening on {headline}. {detail}. Want me to pull Lychee charts?",
    suggest_next: [
      { tool: "pull_market_bundle", why: "Deep-dive the top alert with inline charts" },
      { tool: "jarvis_pulse", why: "Pulse again next turn / when user says update" },
    ],
  };
}
