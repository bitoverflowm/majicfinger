"use client";

import { createContext, memo, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { HolderSessionContext, useHolderSession } from "@/components/terminals/holder/holderSession";
import { TerminalCanvasSession } from "@/components/terminals/terminalCanvas";
import { useLiveSessions } from "./liveSessions";

/**
 * Share cards show terminal panels from any tab, not just the open one. The open tab's session is
 * already running on the canvas, so its pieces read that one; every other tab a card uses gets one
 * hidden session (its market or trader, loaded and kept live), whose value every piece from that
 * tab reads.
 */
const SessionsContext = createContext({});

function Relay({ tabId, onValue }) {
  const value = useHolderSession();
  useEffect(() => {
    onValue(tabId, value);
  }, [onValue, tabId, value]);
  return null;
}

const SessionSource = memo(function SessionSource({ tab, onValue }) {
  return (
    <TerminalCanvasSession tab={tab} customized>
      <Relay tabId={tab.id} onValue={onValue} />
    </TerminalCanvasSession>
  );
});

export function ShareSessions({ tabs, children }) {
  const live = useLiveSessions();
  const [values, setValues] = useState({});
  const onValue = useCallback((tabId, value) => {
    setValues((prev) => (prev[tabId] === value ? prev : { ...prev, [tabId]: value }));
  }, []);
  const merged = useMemo(() => ({ ...values, ...live }), [live, values]);
  return (
    <SessionsContext.Provider value={merged}>
      {/* Off screen, so trade alerts and tips never fire from here. */}
      <div hidden aria-hidden>
        {tabs
          .filter((tab) => tab?.terminal && !live[tab.id])
          .map((tab) => (
            <SessionSource key={tab.id} tab={tab} onValue={onValue} />
          ))}
      </div>
      {children}
    </SessionsContext.Provider>
  );
}

export function useShareSession(tabId) {
  return useContext(SessionsContext)[tabId] || null;
}

/** Gives a piece its tab's session, as if it sat on that tab. */
export function PieceSession({ tabId, fallback = null, children }) {
  const value = useShareSession(tabId);
  if (!value) return fallback;
  return <HolderSessionContext.Provider value={value}>{children}</HolderSessionContext.Provider>;
}
