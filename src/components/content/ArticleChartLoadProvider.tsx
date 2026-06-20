"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ArticleChartLoadTier = "fast" | "slow";

export type ArticleChartLoadPlanEntry = {
  id: string;
  username: string;
  slug: string;
  order: number;
  tier: ArticleChartLoadTier;
};

type ArticleChartLoadContextValue = {
  claimEntry: (username: string, slug: string) => ArticleChartLoadPlanEntry;
  canLoad: (entryId: string) => boolean;
  notifyReady: (entryId: string) => void;
};

const ArticleChartLoadContext = createContext<ArticleChartLoadContextValue | null>(null);

function buildQueues(plan: ArticleChartLoadPlanEntry[]) {
  const fast = [...plan].filter((e) => e.tier === "fast").sort((a, b) => a.order - b.order);
  const slow = [...plan].filter((e) => e.tier === "slow").sort((a, b) => a.order - b.order);
  return { fast, slow };
}

export function ArticleChartLoadProvider({
  plan,
  children,
}: {
  plan: ArticleChartLoadPlanEntry[];
  children: ReactNode;
}) {
  const { fast, slow } = useMemo(() => buildQueues(plan), [plan]);
  const claimedOrdersRef = useRef(new Set<number>());
  const [fastReadyCount, setFastReadyCount] = useState(0);
  const [slowReadyCount, setSlowReadyCount] = useState(0);
  const fallbackOrderRef = useRef(plan.length);

  const claimEntry = useCallback(
    (username: string, slug: string): ArticleChartLoadPlanEntry => {
      const match = plan.find(
        (entry) =>
          entry.username === username &&
          entry.slug === slug &&
          !claimedOrdersRef.current.has(entry.order),
      );
      if (match) {
        claimedOrdersRef.current.add(match.order);
        return match;
      }
      const order = fallbackOrderRef.current++;
      return {
        id: `${username}/${slug}#${order}`,
        username,
        slug,
        order,
        tier: "fast",
      };
    },
    [plan],
  );

  const canLoad = useCallback(
    (entryId: string) => {
      const fastIndex = fast.findIndex((entry) => entry.id === entryId);
      if (fastIndex >= 0) {
        return fastIndex <= fastReadyCount;
      }

      const slowIndex = slow.findIndex((entry) => entry.id === entryId);
      if (slowIndex >= 0) {
        if (fastReadyCount < fast.length) return false;
        return slowIndex <= slowReadyCount;
      }

      return true;
    },
    [fast, slow, fastReadyCount, slowReadyCount],
  );

  const notifyReady = useCallback(
    (entryId: string) => {
      const fastIndex = fast.findIndex((entry) => entry.id === entryId);
      if (fastIndex >= 0) {
        setFastReadyCount((count) => Math.max(count, fastIndex + 1));
        return;
      }

      const slowIndex = slow.findIndex((entry) => entry.id === entryId);
      if (slowIndex >= 0) {
        setSlowReadyCount((count) => Math.max(count, slowIndex + 1));
      }
    },
    [fast, slow],
  );

  const value = useMemo(
    () => ({ claimEntry, canLoad, notifyReady }),
    [claimEntry, canLoad, notifyReady],
  );

  return (
    <ArticleChartLoadContext.Provider value={value}>{children}</ArticleChartLoadContext.Provider>
  );
}

export function useArticleChartLoad(username: string, slug: string) {
  const ctx = useContext(ArticleChartLoadContext);
  const entryRef = useRef<ArticleChartLoadPlanEntry | null>(null);

  if (!entryRef.current) {
    entryRef.current = ctx
      ? ctx.claimEntry(username, slug)
      : {
          id: `${username}/${slug}#0`,
          username,
          slug,
          order: 0,
          tier: "fast",
        };
  }

  const entry = entryRef.current;
  const allowed = ctx ? ctx.canLoad(entry.id) : true;

  const notifyReady = useCallback(() => {
    ctx?.notifyReady(entry.id);
  }, [ctx, entry.id]);

  return { entry, allowed, notifyReady };
}
