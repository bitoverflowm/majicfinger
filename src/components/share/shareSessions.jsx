"use client";

import { createContext, memo, useCallback, useContext, useEffect, useState } from "react";
import { HolderSessionContext, useHolderSession } from "@/components/terminals/holder/holderSession";
import { TerminalCanvasSession } from "@/components/terminals/terminalCanvas";

/**
 * Share cards show terminal panels from any tab, not just the open one. Each tab a card uses gets
 * one hidden session (its market or trader, loaded and kept live), whose value every piece from
 * that tab reads.
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
  const [values, setValues] = useState({});
  const onValue = useCallback((tabId, value) => {
    setValues((prev) => (prev[tabId] === value ? prev : { ...prev, [tabId]: value }));
  }, []);
  return (
    <SessionsContext.Provider value={values}>
      {/* Off screen, so trade alerts and tips never fire from here. */}
      <div hidden aria-hidden>
        {tabs.filter((tab) => tab?.terminal).map((tab) => (
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
