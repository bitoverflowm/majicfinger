"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { startSheetRealtimeTransport } from "@/components/dashboardComposer/sheetRealtimeTransport";
import { realtimeSessionKey, realtimeTargetForBlock } from "@/lib/realtime/sheetRealtime";

/**
 * Live pulls stay off the saved dashboard document. Ticks update this session,
 * and the sheet and its charts read it while the pull is running.
 */
export function useSheetRealtime(blocksByPage, pageId) {
  const [realtimeById, setRealtimeById] = useState({});
  const stopsRef = useRef(new Map());
  const pagesRef = useRef(blocksByPage);
  pagesRef.current = blocksByPage;
  const pageRef = useRef(pageId);
  pageRef.current = pageId;

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

  const startSheetRealtime = useCallback(
    (id) => {
      const block = findBlock(id);
      const sheet = block?.type === "chart" ? findBlock(block.sourceSheetId) : block;
      if (!sheet || sheet.type !== "sheet") return;
      const def = realtimeTargetForBlock(sheet);
      if (!def) return;
      const key = realtimeSessionKey(pageRef.current, sheet.id);
      stopsRef.current.get(key)?.();
      stopsRef.current.delete(key);
      setRealtimeById((current) => ({
        ...current,
        [key]: { running: true, status: "Starting", liveCells: null },
      }));
      const handle = startSheetRealtimeTransport(sheet, def, {
        onStatus(status) {
          setRealtimeById((current) => {
            const session = current[key];
            if (!session?.running || session.status === status) return current;
            return { ...current, [key]: { ...session, status } };
          });
        },
        onCells(liveCells) {
          setRealtimeById((current) => {
            const session = current[key];
            if (!session?.running) return current;
            return { ...current, [key]: { ...session, liveCells } };
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
      stopsRef.current.set(key, handle.stop);
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

  return { realtimeById, startSheetRealtime, stopSheetRealtime };
}
