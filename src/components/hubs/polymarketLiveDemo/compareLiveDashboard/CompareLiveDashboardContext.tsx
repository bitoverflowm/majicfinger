"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { DashboardPair, LandingComparison } from "./types";

type CompareLiveDashboardContextValue = {
  open: boolean;
  openDashboard: () => void;
  closeDashboard: () => void;
  landing: LandingComparison;
  setLandingPair: (pair: DashboardPair | null) => void;
};

const CompareLiveDashboardContext = createContext<CompareLiveDashboardContextValue | null>(null);

export function CompareLiveDashboardProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [landing, setLanding] = useState<LandingComparison>({ pair: null });

  const openDashboard = useCallback(() => setOpen(true), []);
  const closeDashboard = useCallback(() => setOpen(false), []);
  const setLandingPair = useCallback((pair: DashboardPair | null) => {
    setLanding({ pair });
  }, []);

  const value = useMemo(
    () => ({ open, openDashboard, closeDashboard, landing, setLandingPair }),
    [open, openDashboard, closeDashboard, landing, setLandingPair],
  );

  return (
    <CompareLiveDashboardContext.Provider value={value}>{children}</CompareLiveDashboardContext.Provider>
  );
}

export function useCompareLiveDashboardOptional() {
  return useContext(CompareLiveDashboardContext);
}

export function useCompareLiveDashboard() {
  const ctx = useContext(CompareLiveDashboardContext);
  if (!ctx) {
    throw new Error("useCompareLiveDashboard must be used within CompareLiveDashboardProvider");
  }
  return ctx;
}
