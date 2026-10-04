"use client";

import { ToolChips } from "@/components/spectrumui/blocks/ai-assistants/tool-chips";

function queryToolName(source) {
  const label = String(source || "").toLowerCase();
  if (label.includes("kalshi")) return "query_kalshi_markets";
  if (label.includes("polymarket")) return "query_polymarket_markets";
  if (label.includes("chainlink")) return "query_chainlink";
  if (label.includes("binance")) return "query_binance";
  const slug = label.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return slug ? `query_${slug}` : "query_markets";
}

function tickerLine(item) {
  const parts = [item.ticker, item.label, item.reason].map((part) => String(part || "").trim()).filter(Boolean);
  return parts.join(" · ");
}

/**
 * Agent-style steps for a live market scan.
 * Query the source, match the user's requirements, then show how many markets were removed.
 */
export function MarketScanSteps({
  source,
  status,
  scanned = 0,
  removedCount = 0,
  removed = [],
  waiting = false,
  note = "",
  error = "",
  startedAt = 0,
  completedAt = 0,
  request = "GET /markets",
  serverFilters = [],
  requirements = [],
}) {
  if (!startedAt || status === "idle") return null;

  const sourceName = source || "the source";
  const done = status === "ready" || status === "error";
  const stamp = done ? { startedAt, completedAt: completedAt || undefined } : { startedAt };
  const requirementsLabel = requirements.filter(Boolean);
  const calls = [];

  const queryStatus = status === "error" && !scanned ? "error" : scanned > 0 || done ? "success" : "running";
  const queryResult = waiting
    ? note || `${sourceName} asked for a pause. Continuing in a moment.`
    : status === "error" && error
      ? error
      : scanned
        ? `Queried markets directly from ${sourceName}. Read ${scanned.toLocaleString()} markets.`
        : `Querying markets directly from ${sourceName}.`;
  calls.push({
    id: "query",
    name: queryToolName(sourceName),
    status: waiting ? "running" : queryStatus,
    ...stamp,
    completedAt: done ? stamp.completedAt : undefined,
    args: {
      source: sourceName,
      request,
      ...(serverFilters.length ? { includes: serverFilters.join(", ") } : {}),
    },
    result: queryResult,
  });

  if (requirementsLabel.length || removedCount > 0) {
    calls.push({
      id: "match",
      name: "match_requirements",
      status: scanned ? (done ? "success" : "running") : "pending",
      ...(scanned && done ? stamp : scanned ? { startedAt } : {}),
      args: requirementsLabel.length ? { requirements: requirementsLabel.join(", ") } : undefined,
      result: requirementsLabel.length
        ? `Filtering through the markets to match your requirements: ${requirementsLabel.join(", ")}.`
        : "Filtering through the markets to match your requirements.",
    });
  }

  if (removedCount > 0 || (scanned > 0 && requirementsLabel.length)) {
    const listed = (removed || []).map(tickerLine).filter(Boolean);
    const hidden = Math.max(0, removedCount - listed.length);
    const detail = [
      removedCount
        ? `Removed ${removedCount.toLocaleString()} ${removedCount === 1 ? "market" : "markets"} outside your requirements.`
        : "Checking which markets fall outside your requirements.",
      listed.length ? listed.join("\n") : "",
      hidden > 0 ? `and ${hidden.toLocaleString()} more` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    calls.push({
      id: "remove",
      name: removedCount ? `removed_${removedCount}_markets` : "remove_outside_requirements",
      status: done ? "success" : scanned ? "running" : "pending",
      ...(scanned && done ? stamp : scanned ? { startedAt } : {}),
      args: removedCount ? { removed: removedCount } : undefined,
      result: detail,
    });
  }

  return <ToolChips calls={calls} className="mb-3 max-w-full" />;
}
