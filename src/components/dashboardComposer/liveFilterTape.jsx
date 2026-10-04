"use client";

import { ToolChips } from "@/components/spectrumui/blocks/ai-assistants/tool-chips";

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
  kept = 0,
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
        ? `Queried markets directly from ${sourceName}. Parsed ${scanned.toLocaleString()} markets.`
        : `Querying markets directly from ${sourceName}.`;
  const parsedLabel = scanned
    ? `${scanned.toLocaleString()} ${scanned === 1 ? "market" : "markets"} parsed`
    : "Parsing markets";
  calls.push({
    id: "query",
    name: parsedLabel,
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

  const mismatched = Math.max(Number(removedCount) || 0, Math.max(0, scanned - kept));
  if (mismatched > 0 || (scanned > 0 && requirementsLabel.length)) {
    const listed = (removed || []).map(tickerLine).filter(Boolean);
    const hidden = Math.max(0, mismatched - listed.length);
    const removedLabel = `${mismatched.toLocaleString()} mismatched ${mismatched === 1 ? "row" : "rows"} removed`;
    const detail = [
      removedLabel,
      listed.length ? listed.join("\n") : "",
      hidden > 0 ? `and ${hidden.toLocaleString()} more` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    calls.push({
      id: "remove",
      name: removedLabel,
      status: done ? "success" : scanned ? "running" : "pending",
      ...(scanned && done ? stamp : scanned ? { startedAt } : {}),
      args: mismatched ? { removed: mismatched } : undefined,
      result: detail,
    });
  }

  return <ToolChips calls={calls} className="mb-3 max-w-full" />;
}
