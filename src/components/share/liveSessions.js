"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useHolderSession } from "@/components/terminals/holder/holderSession";

/** The terminal sessions already running on the canvas, by tab id, so share cards reuse them. */
let sessions = {};
const listeners = new Set();
const NONE = {};

function setSession(tabId, value) {
  if (sessions[tabId] === value) return;
  if (value) sessions = { ...sessions, [tabId]: value };
  else {
    const { [tabId]: _gone, ...rest } = sessions;
    sessions = rest;
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLiveSessions() {
  return useSyncExternalStore(
    subscribe,
    () => sessions,
    () => NONE,
  );
}

/** Sits inside the canvas's terminal session and lends it out. */
export function LiveSessionRelay({ tabId }) {
  const value = useHolderSession();
  useEffect(() => {
    if (tabId) setSession(tabId, value);
  }, [tabId, value]);
  useEffect(() => () => setSession(tabId, null), [tabId]);
  return null;
}
