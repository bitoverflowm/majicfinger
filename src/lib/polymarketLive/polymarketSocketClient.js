import { POLYMARKET_MARKET_WS_URL, createPolymarketHub } from "./polymarketSocketHub";

const WS_URL = process.env.NEXT_PUBLIC_POLYMARKET_WS_URL || POLYMARKET_MARKET_WS_URL;
const PING_MS = 10_000;

/** @typedef {{ update: (assetIds: string[]) => void, close: () => void }} HubSubscription */
/** @typedef {{ subscribe: (opts: { assetIds: string[], custom?: boolean, onMessage: (msg: object) => void, onStatus?: (status: string) => void }) => HubSubscription }} Hub */

/**
 * The browser's shared Polymarket socket. Every tab talks to one SharedWorker that holds the
 * connection; without SharedWorker support (or if the worker fails to start) the page runs the
 * same hub itself, which still gives one socket per tab.
 */
function sharedWorkerHub() {
  let worker;
  try {
    worker = new SharedWorker(new URL("./polymarketSocket.worker.js", import.meta.url), { name: "lychee-polymarket-socket" });
  } catch {
    return null;
  }
  const port = worker.port;
  /** @type {Map<number, { assets: string[], custom: boolean, onMessage: Function, onStatus?: Function, local?: HubSubscription }>} */
  const handlers = new Map();
  let nextId = 1;
  /** @type {Hub | null} */
  let fallback = null;

  const post = (message) => {
    try {
      port.postMessage(message);
    } catch {
      /* the worker is gone; onerror moves us to the page hub */
    }
  };
  const resubscribe = () => {
    for (const [id, handler] of handlers) post({ t: "sub", id, assets: handler.assets, custom: handler.custom });
  };

  const useFallback = () => {
    if (fallback) return;
    fallback = createPolymarketHub({ url: WS_URL });
    for (const handler of handlers.values()) {
      handler.local = fallback.subscribe({ assetIds: handler.assets, custom: handler.custom, onMessage: handler.onMessage, onStatus: handler.onStatus });
    }
  };
  worker.onerror = useFallback;

  port.onmessage = ({ data }) => {
    if (fallback || !data) return;
    if (data.t === "reset") {
      resubscribe();
      return;
    }
    if (data.t !== "batch") return;
    for (const [id, kind, payload] of data.items) {
      const handler = handlers.get(id);
      if (!handler) continue;
      try {
        if (kind === "m") handler.onMessage(payload);
        else handler.onStatus?.(payload);
      } catch {
        /* a subscriber's problem */
      }
    }
  };
  port.start();
  post({ t: "hello", url: WS_URL });
  window.setInterval(() => post({ t: "ping" }), PING_MS);
  window.addEventListener("pagehide", () => post({ t: "bye" }));
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) resubscribe();
  });

  return {
    subscribe({ assetIds, custom = false, onMessage, onStatus }) {
      const id = nextId++;
      const handler = { assets: [...new Set((assetIds || []).map(String).filter(Boolean))], custom, onMessage, onStatus };
      handlers.set(id, handler);
      if (fallback) handler.local = fallback.subscribe({ assetIds: handler.assets, custom, onMessage, onStatus });
      else post({ t: "sub", id, assets: handler.assets, custom });
      return {
        update(nextIds) {
          if (handlers.get(id) !== handler) return;
          handler.assets = [...new Set((nextIds || []).map(String).filter(Boolean))];
          if (handler.local) handler.local.update(handler.assets);
          else post({ t: "update", id, assets: handler.assets });
        },
        close() {
          if (handlers.get(id) !== handler) return;
          handlers.delete(id);
          if (handler.local) handler.local.close();
          else post({ t: "close", id });
        },
      };
    },
  };
}

/** @type {Hub | null} */
let hub = null;

/** @returns {Hub} */
export function polymarketSocketHub() {
  if (!hub) hub = (typeof SharedWorker !== "undefined" && sharedWorkerHub()) || createPolymarketHub({ url: WS_URL });
  return hub;
}
