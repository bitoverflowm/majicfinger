"use client";

import { useCallback, useSyncExternalStore } from "react";

import { trackJourneyEvent } from "@/lib/analytics/journeyClient";

const STORAGE_KEY = "lychee:integration-votes";
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    cache = Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Votes for integrations we haven't built yet, shared by every card that offers a vote. */
export function useIntegrationVotes() {
  const votes = useSyncExternalStore(subscribe, read, () => EMPTY);
  const toggle = useCallback((id: string, name: string) => {
    const current = read();
    const voted = !current.includes(id);
    cache = voted ? [...current, id] : current.filter((v) => v !== id);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {
      /* ignore */
    }
    listeners.forEach((listener) => listener());
    trackJourneyEvent("venue_vote", { label: name, meta: { venue: id, name, voted } });
  }, []);
  return { votes, toggle };
}

export function trackIntegrationSuggestion(name: string) {
  trackJourneyEvent("venue_vote", {
    label: name,
    meta: { venue: "suggested", name, voted: true, suggested: true },
  });
}
