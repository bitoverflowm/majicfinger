import { sanitizeTerminalSubject } from "@/lib/workspaceTerminals";

/**
 * A terminal someone asked to open from outside the app, e.g. `/dashboard?terminal=holder&market=0x…`
 * from a landing page. Kept in storage across the sign-in detour, which drops the URL.
 */
const STORAGE_KEY = "lychee:pending-terminal";
const KEEP_MS = 30 * 60_000;
const PARAMS = ["terminal", "market", "wallet", "title"];

function fromParams(params) {
  const terminalId = params.get("terminal");
  if (terminalId !== "holder") return null;
  const market = params.get("market") || "";
  const wallet = params.get("wallet") || "";
  const title = params.get("title") || "";
  const subject = /^0x[a-fA-F0-9]{64}$/.test(market)
    ? { kind: "market", conditionId: market.toLowerCase(), title }
    : /^0x[a-fA-F0-9]{40}$/.test(wallet)
      ? { kind: "trader", address: wallet.toLowerCase(), title }
      : null;
  return { terminalId, subject: subject ? sanitizeTerminalSubject(subject) : null };
}

function stripParams() {
  const url = new URL(window.location.href);
  if (!PARAMS.some((key) => url.searchParams.has(key))) return;
  PARAMS.forEach((key) => url.searchParams.delete(key));
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

/** Saves a request in the URL for after sign-in. */
export function rememberTerminalRequest() {
  if (typeof window === "undefined") return;
  const request = fromParams(new URLSearchParams(window.location.search));
  if (!request) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...request, at: Date.now() }));
  } catch {
    // Storage blocked: the visitor lands on the dashboard without the terminal.
  }
}

/** The pending request, from the URL or saved before sign-in, cleared once read. */
export function takeTerminalRequest() {
  if (typeof window === "undefined") return null;
  let request = fromParams(new URLSearchParams(window.location.search));
  stripParams();
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    window.localStorage.removeItem(STORAGE_KEY);
    if (!request && saved?.terminalId && Date.now() - Number(saved.at) < KEEP_MS) {
      request = { terminalId: saved.terminalId, subject: saved.subject ? sanitizeTerminalSubject(saved.subject) : null };
    }
  } catch {
    // Unreadable storage only loses the saved request.
  }
  return request;
}
