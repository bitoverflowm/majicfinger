/**
 * Terminals are out-of-the-box dashboards. A terminal tab carries `terminal: <id>` and
 * `terminalSubject`, what the tab is looking at. Its panels are canvas blocks of type
 * "terminal" laid out from a blueprint; `terminalLayout` records which view's blueprint the
 * tab was laid out from, at which version, and whether the user has rearranged it since.
 */
export const TERMINALS = [
  {
    id: "holder",
    title: "Holder Terminal",
    description: "An out-of-the-box dashboard for market holders. Opens in its own tab.",
  },
];

const TERMINAL_IDS = new Set(TERMINALS.map((terminal) => terminal.id));
const CONDITION_ID = /^0x[a-fA-F0-9]{64}$/;
const WALLET = /^0x[a-fA-F0-9]{40}$/;

export function findTerminal(id) {
  return TERMINALS.find((terminal) => terminal.id === id) || null;
}

function clip(value, max) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

/** A market (by condition id) or a trader (by wallet). Anything else is dropped. */
export function sanitizeTerminalSubject(subject) {
  if (!subject || typeof subject !== "object") return null;
  if (subject.kind === "market" && CONDITION_ID.test(String(subject.conditionId || ""))) {
    return {
      kind: "market",
      conditionId: String(subject.conditionId),
      title: clip(subject.title, 200),
      slug: clip(subject.slug, 200),
    };
  }
  if (subject.kind === "trader" && WALLET.test(String(subject.address || ""))) {
    const trader = { kind: "trader", address: String(subject.address).toLowerCase(), title: clip(subject.title, 120) };
    const from = subject.fromMarket;
    if (from && CONDITION_ID.test(String(from.conditionId || ""))) {
      trader.fromMarket = { conditionId: String(from.conditionId), title: clip(from.title, 200), slug: clip(from.slug, 200) };
    }
    return trader;
  }
  return null;
}

export const TERMINAL_VIEWS = ["browse", "market", "trader"];

/** Which blueprint a subject is shown with: no subject browses. */
export function terminalViewOf(subject) {
  const kind = sanitizeTerminalSubject(subject)?.kind;
  return kind || "browse";
}

function sanitizeTerminalLayout(layout) {
  if (!layout || typeof layout !== "object" || !TERMINAL_VIEWS.includes(layout.view)) return null;
  const version = Math.floor(Number(layout.version));
  return {
    view: layout.view,
    version: Number.isFinite(version) && version > 0 ? Math.min(version, 999) : 0,
    ...(layout.edited ? { edited: true } : {}),
  };
}

/** `{ terminal, terminalSubject?, terminalLayout? }` for a tab whose terminal id is known, otherwise nothing. Spread into saved tabs. */
export function terminalTabField(tab) {
  const id = String(tab?.terminal || "").trim();
  if (!TERMINAL_IDS.has(id)) return {};
  const subject = sanitizeTerminalSubject(tab?.terminalSubject);
  const layout = sanitizeTerminalLayout(tab?.terminalLayout);
  return {
    terminal: id,
    ...(subject ? { terminalSubject: subject } : {}),
    ...(layout ? { terminalLayout: layout } : {}),
  };
}

/** "Holder Terminal", then "Holder Terminal 2", "Holder Terminal 3"… */
export function terminalTabName(title, existingNames) {
  const taken = new Set((existingNames || []).map((name) => String(name || "").trim().toLowerCase()));
  if (!taken.has(title.toLowerCase())) return title;
  let n = 2;
  while (taken.has(`${title} ${n}`.toLowerCase())) n += 1;
  return `${title} ${n}`;
}

/** Tab label for a terminal looking at a subject. */
export function terminalSubjectTabName(subject, fallback) {
  const title = clip(subject?.title, 200);
  if (!title && subject?.kind === "trader" && subject.address) return `${subject.address.slice(0, 6)}…${subject.address.slice(-4)}`;
  if (!title) return fallback;
  return title.length > 40 ? `${title.slice(0, 39).trimEnd()}…` : title;
}
