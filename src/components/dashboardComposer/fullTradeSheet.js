"use client";

import { useSyncExternalStore } from "react";
import { fetchAthenaLakeSample } from "@/lib/dataLake/fetchAthenaSample";
import { displayCell } from "@/components/dashboardComposer/integrationRunSheets";

const FIELD_BY_TITLE = {
  "created time": { id: "created_time", type: "date" },
  ticker: { id: "ticker", type: "string" },
  side: { id: "taker_side", type: "string" },
  "yes price": { id: "yes_price", type: "number", scale: "cents" },
  "no price": { id: "no_price", type: "number", scale: "cents" },
  size: { id: "count", type: "number" },
};

const memory = new Map();
const listeners = new Set();
const inflight = new Map();
let activePulls = 0;
const waiters = [];

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function tradeTickerFromBlock(block) {
  if (block?.type !== "sheet") return "";
  const title = String(block.title || "");
  const match = title.match(/^Trades\s·\s(.+)$/);
  return match ? match[1].trim() : "";
}

export function useReadyTradeSheet(blockId) {
  return useSyncExternalStore(
    subscribe,
    () => {
      const sheet = memory.get(blockId);
      return sheet?.status === "ready" ? sheet : null;
    },
    () => null,
  );
}

export function useTradeSheetLabel(blockId, fallbackCount) {
  const status = useSyncExternalStore(
    subscribe,
    () => {
      const sheet = memory.get(blockId);
      if (!sheet) return "";
      if (sheet.status === "loading") return `loading:${sheet.loaded || 0}`;
      if (sheet.status === "ready") return `ready:${sheet.rowCount}`;
      return "";
    },
    () => "",
  );
  if (status.startsWith("ready:")) {
    const count = Number(status.slice(6));
    return `${count.toLocaleString()} ${count === 1 ? "row" : "rows"}`;
  }
  if (status.startsWith("loading:")) {
    const loaded = Number(status.slice(8));
    return loaded > 0 ? `Loading ${loaded.toLocaleString()}…` : "Loading trades…";
  }
  const count = fallbackCount;
  return `${count.toLocaleString()} ${count === 1 ? "row" : "rows"}`;
}

function fieldsForColumns(columns) {
  return (columns || []).map((column) => FIELD_BY_TITLE[String(column?.title || "").trim().toLowerCase()] || null);
}

function titlesKey(columns) {
  return (columns || []).map((column) => String(column?.title || "").trim().toLowerCase()).join("|");
}

function formatRows(columns, names, rawRows) {
  const fields = fieldsForColumns(columns);
  const indexOf = new Map(names.map((name, index) => [name, index]));
  const rows = new Array(rawRows.length);
  for (let rowIndex = 0; rowIndex < rawRows.length; rowIndex += 1) {
    const source = rawRows[rowIndex];
    const line = new Array(fields.length);
    for (let columnIndex = 0; columnIndex < fields.length; columnIndex += 1) {
      const field = fields[columnIndex];
      if (!field) {
        line[columnIndex] = "";
        continue;
      }
      const sourceIndex = indexOf.get(field.id);
      line[columnIndex] = sourceIndex == null ? "" : displayCell(source[sourceIndex], field);
    }
    rows[rowIndex] = line;
  }
  return rows;
}

function cacheId(userId, ticker) {
  const owner = String(userId || "");
  if (!owner || owner === "local") return "";
  return `${owner}:${ticker}`;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("lycheeFullTradeSheets", 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains("sheets")) db.deleteObjectStore("sheets");
      db.createObjectStore("sheets");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readCached(userId, ticker, key) {
  const id = cacheId(userId, ticker);
  if (!id) return null;
  try {
    const db = await openDb();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction("sheets", "readonly");
      const request = tx.objectStore("sheets").get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (!record || record.userId !== userId || record.key !== key || !Array.isArray(record.rows) || record.rows.length <= 50) return null;
    return record;
  } catch {
    return null;
  }
}

async function writeCached(userId, ticker, record) {
  const id = cacheId(userId, ticker);
  if (!id) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("sheets", "readwrite");
      tx.objectStore("sheets").put({ ...record, userId }, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // The live sheet still has the rows if the browser cannot store them.
  }
}

function withSlot(task) {
  return new Promise((resolve, reject) => {
    waiters.push({ task, resolve, reject });
    pump();
  });
}

function pump() {
  while (activePulls < 2 && waiters.length) {
    const job = waiters.shift();
    activePulls += 1;
    Promise.resolve()
      .then(job.task)
      .then(job.resolve, job.reject)
      .finally(() => {
        activePulls -= 1;
        pump();
      });
  }
}

export function rememberTradeSheet(blockId, ticker, columns, rows, limit, userId) {
  const key = `${titlesKey(columns)}:${limit}`;
  const ready = { status: "ready", ticker, rows, rowCount: rows.length, key, userId: userId || "" };
  memory.set(blockId, ready);
  emit();
  void writeCached(userId, ticker, { key, rows });
  return ready;
}

export function ensureFullTradeSheet(blockId, ticker, columns, limit, userId) {
  const owner = userId || "";
  const current = memory.get(blockId);
  if (current?.status === "ready" && current.ticker === ticker && current.userId === owner) {
    return inflight.get(`${owner}:${blockId}`) || Promise.resolve(current);
  }
  if (current?.status === "error" && current.userId === owner) return Promise.resolve(current);
  const flightKey = `${owner}:${blockId}`;
  if (inflight.has(flightKey)) return inflight.get(flightKey);
  const job = pullTradeSheet(blockId, ticker, columns, limit, owner).finally(() => inflight.delete(flightKey));
  inflight.set(flightKey, job);
  return job;
}

async function pullTradeSheet(blockId, ticker, columns, limit, userId) {
  const key = `${titlesKey(columns)}:${limit}`;
  const cached = await readCached(userId, ticker, key);
  if (cached) {
    const ready = { status: "ready", ticker, rows: cached.rows, rowCount: cached.rows.length, userId };
    memory.set(blockId, ready);
    emit();
    return ready;
  }

  memory.set(blockId, { status: "loading", ticker, loaded: 0 });
  emit();

  try {
    const ready = await withSlot(async () => {
      const fields = [...new Map(fieldsForColumns(columns).filter(Boolean).map((field) => [field.id, field])).values()];
      const result = await fetchAthenaLakeSample(
        {
          lake: "kalshi",
          table: "trades",
          queryType: "compose",
          limit,
          caseSensitive: false,
          filters: { and: [{ column: "ticker", kind: "string", op: "eq", value: ticker }] },
          compose: {
            select: fields.map((field) => ({ column: field.id, alias: field.id })),
            groupByAliases: [],
            orderBy: [{ alias: "created_time", direction: "desc" }],
          },
        },
        {
          maxWaitMs: 600000,
          pollIntervalMs: 800,
          onPhase: (info) => {
            if (info.phase !== "downloading_page") return;
            const loaded = info.processed || 0;
            const previous = memory.get(blockId);
            if (previous?.status === "loading" && loaded - (previous.loaded || 0) < 5000) return;
            memory.set(blockId, { status: "loading", ticker, loaded });
            emit();
          },
        },
      );
      const rows = formatRows(columns, result.columns || [], result.rows || []);
      return { status: "ready", ticker, rows, rowCount: rows.length, key, userId };
    });
    memory.set(blockId, ready);
    emit();
    void writeCached(userId, ticker, { key, rows: ready.rows });
    return ready;
  } catch {
    const failed = { status: "error", ticker, userId };
    memory.set(blockId, failed);
    emit();
    return failed;
  }
}
