/* eslint-disable no-restricted-globals */
import { createPolymarketHub } from "./polymarketSocketHub";

/**
 * Shared by every Lychee tab in the browser, so all of them ride one Polymarket socket.
 *
 * Page → worker: hello { url } · sub { id, assets, custom } · update { id, assets } · close { id }
 *                · ping · bye
 * Worker → page: batch { items: [id, "m" | "s", message | status][] } · reset
 */

const BATCH_MS = 16;
/** A tab that hasn't been heard from in this long is gone; hidden tabs still ping about once a minute. */
const STALE_MS = 3 * 60_000;

let hub = null;
const ports = new Set();

function attach(port) {
  const state = { port, subs: new Map(), seen: Date.now(), dropped: false, queue: [], timer: 0 };
  ports.add(state);

  const push = (item) => {
    state.queue.push(item);
    if (state.timer) return;
    state.timer = setTimeout(() => {
      state.timer = 0;
      const items = state.queue;
      state.queue = [];
      try {
        port.postMessage({ t: "batch", items });
      } catch {
        /* the page is gone; the sweep cleans up */
      }
    }, BATCH_MS);
  };

  port.onmessage = ({ data }) => {
    if (!data || typeof data !== "object") return;
    state.seen = Date.now();
    ports.add(state);
    if (data.t === "hello") {
      hub ||= createPolymarketHub(data.url ? { url: data.url } : {});
      return;
    }
    hub ||= createPolymarketHub();
    if (state.dropped && data.t !== "sub" && data.t !== "bye") {
      state.dropped = false;
      port.postMessage({ t: "reset" });
      return;
    }
    state.dropped = false;
    if (data.t === "sub") {
      state.subs.get(data.id)?.close();
      state.subs.set(
        data.id,
        hub.subscribe({
          assetIds: data.assets,
          custom: !!data.custom,
          onMessage: (msg) => push([data.id, "m", msg]),
          onStatus: (status) => push([data.id, "s", status]),
        }),
      );
    } else if (data.t === "update") {
      state.subs.get(data.id)?.update(data.assets);
    } else if (data.t === "close") {
      state.subs.get(data.id)?.close();
      state.subs.delete(data.id);
    } else if (data.t === "bye") {
      drop(state);
    }
  };
  port.start();
}

function drop(state) {
  for (const sub of state.subs.values()) sub.close();
  state.subs.clear();
  state.queue = [];
  state.dropped = true;
}

setInterval(() => {
  const cutoff = Date.now() - STALE_MS;
  for (const state of ports) {
    if (state.seen >= cutoff) continue;
    drop(state);
    ports.delete(state);
  }
}, 30_000);

self.onconnect = (event) => attach(event.ports[0]);
