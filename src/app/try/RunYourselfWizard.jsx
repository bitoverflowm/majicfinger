"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import useSWR from "swr";
import { userSwrFetcher } from "@/lib/hooks";
import {
  RUN_YOURSELF_ANALYSES,
  findAnalysisForSourceChart,
  findAnalysisForSourceDashboard,
} from "@/config/runYourselfAnalyses";
import { KalshiPowerToolsSearch } from "@/components/connectData/KalshiPowerToolsSearch";
import { MagicLinkEmailForm } from "@/components/runYourself/MagicLinkEmailForm";
import { userHasPaidAccess, userRunYourselfQuotaExceeded } from "@/lib/runYourself/hasPaidAccess";
import {
  loadRunSourceContext,
  parseFromQueryParam,
} from "@/lib/runYourself/runSourceContext";
import { cn } from "@/lib/utils";

export default function RunYourselfWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: user, isLoading: userLoading } = useSWR("/api/user", userSwrFetcher);

  const source = useMemo(() => {
    const from = searchParams.get("from");
    if (from) return parseFromQueryParam(from);
    return loadRunSourceContext();
  }, [searchParams]);

  const preselected = useMemo(() => {
    if (source?.chartSlug) {
      const match = findAnalysisForSourceChart(source.ownerHandle, source.chartSlug);
      if (match) return match.id;
    }
    if (source?.dashboardSlug) {
      const match = findAnalysisForSourceDashboard(source.ownerHandle, source.dashboardSlug);
      if (match) return match.id;
    }
    return RUN_YOURSELF_ANALYSES[0]?.id;
  }, [source]);

  const [analysisId, setAnalysisId] = useState(preselected);
  const [ticker, setTicker] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(5);
  const [error, setError] = useState(null);

  const analysis = RUN_YOURSELF_ANALYSES.find((a) => a.id === analysisId) || RUN_YOURSELF_ANALYSES[0];

  useEffect(() => {
    setAnalysisId(preselected);
  }, [preselected]);

  useEffect(() => {
    if (userLoading || !user) return;
    if (userRunYourselfQuotaExceeded(user) && !userHasPaidAccess(user)) {
      const dsId = user.run_yourself_fork_data_set_id;
      if (dsId) {
        router.replace(`/dashboard?runYourselfFork=${encodeURIComponent(dsId)}`);
      } else {
        router.replace("/#pricing");
      }
    }
  }, [user, userLoading, router]);

  const handleRun = useCallback(async () => {
    if (!ticker.trim() || !source || running) return;
    setRunning(true);
    setError(null);
    setProgress(12);

    const tick = window.setInterval(() => {
      setProgress((p) => Math.min(p + 4, 88));
    }, 800);

    try {
      const res = await fetch("/api/run-yourself/fork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          source: {
            ownerHandle: source.ownerHandle,
            chartSlug: source.chartSlug,
            dashboardSlug: source.dashboardSlug,
          },
          analysisId,
          parameter: { mode: "ticker", value: ticker.trim() },
          replicateDashboard: source.kind === "dashboard",
        }),
      });
      const json = await res.json();
      clearInterval(tick);

      if (!res.ok) {
        if (json?.code === "RUN_YOURSELF_QUOTA_EXCEEDED") {
          router.replace("/#pricing");
          return;
        }
        throw new Error(json?.message || "Run failed");
      }

      setProgress(100);
      const { dataSetId, primaryChartId, runYourselfLocked } = json.data || {};
      const q = new URLSearchParams();
      if (dataSetId) q.set("project", dataSetId);
      if (primaryChartId) q.set("chart", primaryChartId);
      if (runYourselfLocked) q.set("runYourselfLocked", "1");
      router.push(`/dashboard?${q.toString()}`);
    } catch (e) {
      clearInterval(tick);
      setError(e?.message || "Something went wrong");
      setRunning(false);
    }
  }, [ticker, source, running, analysisId, router]);

  if (userLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <MagicLinkEmailForm onSuccess={() => window.location.reload()} />
      </div>
    );
  }

  if (!source) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">No chart selected</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open a public chart and click Run for yourself to start.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Run your own analysis</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick an analysis, choose a Kalshi market or trade, and we&apos;ll build a private copy in your workspace.
        </p>
      </div>

      {running ? (
        <div className="space-y-4 rounded-lg border bg-card p-8">
          <p className="text-center text-sm font-medium">Running your analysis…</p>
          <Progress value={progress} className="h-2" />
          <p className="text-center text-xs text-muted-foreground">Pulling data and replaying transforms</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Choose analysis</CardTitle>
              <CardDescription>Based on Lychee&apos;s Kalshi weather research charts.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {RUN_YOURSELF_ANALYSES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAnalysisId(a.id)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left transition-colors",
                    analysisId === a.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted/50",
                  )}
                >
                  <span className="block text-sm font-medium">{a.label}</span>
                  {a.description ? (
                    <span className="mt-1 block text-xs text-muted-foreground">{a.description}</span>
                  ) : null}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                2. Select {analysis.parameterMode === "market_search" ? "market" : "trade"}
              </CardTitle>
              <CardDescription>Search Kalshi markets and trades.</CardDescription>
            </CardHeader>
            <CardContent>
              <KalshiPowerToolsSearch
                onSelect={(s) => setTicker(s.ticker)}
                disabled={running}
              />
              {ticker ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Selected: <span className="font-medium text-foreground">{ticker}</span>
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Button
            className="w-full gap-2 font-semibold"
            size="lg"
            disabled={!ticker.trim()}
            onClick={handleRun}
          >
            Run analysis
          </Button>

          {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}

          <p className="text-center text-xs text-muted-foreground">
            Free accounts get one run.{" "}
            <Link href="/#pricing" className="underline">
              Upgrade to Pro
            </Link>{" "}
            for unlimited analyses.
          </p>
        </div>
      )}
    </div>
  );
}
