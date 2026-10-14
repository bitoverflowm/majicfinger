"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { startSheetRealtimeTransport } from "@/components/dashboardComposer/sheetRealtimeTransport";
import { realtimeSessionKey, realtimeTargetForBlock } from "@/lib/realtime/sheetRealtime";
import { closedLifeMessage, sheetLife } from "@/lib/markets/marketLife";

/**
 * Live ticks update this session and are written onto the sheet, so stopping
 * the pull keeps the rows that arrived. Charts read the same cells.
 */
export function useSheetRealtime(blocksByPage, pageId, onLiveCells) {
  const [realtimeById, setRealtimeById] = useState({});
  const stopsRef = useRef(new Map());
  const pagesRef = useRef(blocksByPage);
  pagesRef.current = blocksByPage;
  const pageRef = useRef(pageId);
  pageRef.current = pageId;
  const onLiveCellsRef = useRef(onLiveCells);
  onLiveCellsRef.current = onLiveCells;

  const findBlock = useCallback((id) => {
    const pages = pagesRef.current || {};
    const onPage = (pages[pageRef.current] || []).find((block) => block.id === id);
    if (onPage) return onPage;
    for (const list of Object.values(pages)) {
      const found = (list || []).find((block) => block.id === id);
      if (found) return found;
    }
    return null;
  }, []);

  const stopSheetRealtime = useCallback((id) => {
    const key = String(id).includes(":") ? String(id) : realtimeSessionKey(pageRef.current, id);
    stopsRef.current.get(key)?.();
    stopsRef.current.delete(key);
    setRealtimeById((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const stopPageRealtime = useCallback((targetPageId) => {
    const prefix = `${targetPageId || ""}:`;
    for (const key of [...stopsRef.current.keys()]) {
      if (String(key).startsWith(prefix)) stopSheetRealtime(key);
    }
    setRealtimeById((current) => {
      const next = { ...current };
      let changed = false;
      for (const key of Object.keys(next)) {
        if (!String(key).startsWith(prefix)) continue;
        delete next[key];
        changed = true;
      }
      return changed ? next : current;
    });
  }, [stopSheetRealtime]);

  const startSheetRealtime = useCallback(
    (id, explicitPageId) => {
      const block = findBlock(id);
      const sheet = block?.type === "chart" ? findBlock(block.sourceSheetId) : block;
      if (!sheet || sheet.type !== "sheet") return;
      const def = realtimeTargetForBlock(sheet);
      if (!def) return;
      const page = explicitPageId || pageRef.current;
      const key = realtimeSessionKey(page, sheet.id);
      const life = sheetLife(sheet);
      stopsRef.current.get(key)?.();
      stopsRef.current.delete(key);
      if (life?.stopped) {
        setRealtimeById((current) => ({
          ...current,
          [key]: {
            running: false,
            closed: true,
            notice: closedLifeMessage(life.outcome),
            status: "Market closed",
            liveCells: current[key]?.liveCells || null,
          },
        }));
        return;
      }
      setRealtimeById((current) => ({
        ...current,
        [key]: { running: true, status: "Starting", liveCells: null, closesAt: life?.closeMs || null, closed: false, notice: "" },
      }));
      let watch = 0;
      const handle = startSheetRealtimeTransport(sheet, def, {
        onStatus(status) {
          setRealtimeById((current) => {
            const session = current[key];
            if (!session?.running || session.status === status) return current;
            return { ...current, [key]: { ...session, status } };
          });
        },
        onCells(liveCells) {
          onLiveCellsRef.current?.(page, sheet.id, liveCells);
          setRealtimeById((current) => {
            const session = current[key];
            if (!session?.running) return current;
            return { ...current, [key]: { ...session, liveCells } };
          });
        },
        onRecords(liveRecords) {
          setRealtimeById((current) => {
            const session = current[key];
            if (!session?.running) return current;
            return { ...current, [key]: { ...session, liveRecords } };
          });
        },
        onFatal(status) {
          stopsRef.current.get(key)?.();
          stopsRef.current.delete(key);
          setRealtimeById((current) => ({
            ...current,
            [key]: { running: false, status, liveCells: current[key]?.liveCells || null },
          }));
        },
      });
      const stop = () => {
        window.clearInterval(watch);
        handle.stop();
      };
      if (life?.closeMs && life.closeMs > Date.now()) {
        watch = window.setInterval(() => {
          if (Date.now() < life.closeMs) return;
          stop();
          stopsRef.current.delete(key);
          setRealtimeById((current) => ({
            ...current,
            [key]: {
              running: false,
              closed: true,
              notice: closedLifeMessage(life.outcome),
              status: "Market closed",
              liveCells: current[key]?.liveCells || null,
              closesAt: life.closeMs,
            },
          }));
        }, 15000);
      }
      stopsRef.current.set(key, stop);
    },
    [findBlock],
  );

  useEffect(() => {
    const liveIds = new Set();
    for (const [page, list] of Object.entries(blocksByPage || {})) {
      for (const block of list || []) liveIds.add(realtimeSessionKey(page, block.id));
    }
    for (const id of [...stopsRef.current.keys()]) {
      if (!liveIds.has(id)) stopSheetRealtime(id);
    }
  }, [blocksByPage, stopSheetRealtime]);

  useEffect(
    () => () => {
      for (const stop of stopsRef.current.values()) stop();
      stopsRef.current.clear();
    },
    [],
  );

  return { realtimeById, startSheetRealtime, stopSheetRealtime, stopPageRealtime };
}
