"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { userSwrFetcher } from "@/lib/hooks";
import {
  RUN_YOURSELF_ANALYSES,
  findAnalysisForSourceChart,
  findAnalysisForSourceDashboard,
  isDashboardRunAnalysis,
  resolveDashboardForkSource,
} from "@/config/runYourselfAnalyses";
import { defaultChartParameterValues } from "@/config/runYourselfDashboardCharts";
import { KalshiPowerToolsSearch } from "@/components/connectData/KalshiPowerToolsSearch";
import { RunYourselfAnalysisPicker } from "@/components/runYourself/RunYourselfAnalysisPicker";
import { RunYourselfDashboardChartParams, RunYourselfDashboardChartParamRow } from "@/components/runYourself/RunYourselfDashboardChartParams";
import { MagicLinkEmailForm } from "@/components/runYourself/MagicLinkEmailForm";
import { KALSHI_GROUP_COLORS } from "@/lib/kalshi/kalshiCategoryTaxonomy";
import { userHasPaidAccess, userRunYourselfQuotaExceeded } from "@/lib/runYourself/hasPaidAccess";
import {
  loadRunSourceContext,
  parseFromQueryParam,
} from "@/lib/runYourself/runSourceContext";

const KALSHI_CATEGORY_OPTIONS = Object.keys(KALSHI_GROUP_COLORS);

function defaultParameterForAnalysis(analysis) {
  if (analysis?.parameterMode === "category_dropdown") {
    const preferred = analysis.defaultCategory || "Weather";
    return KALSHI_CATEGORY_OPTIONS.includes(preferred) ? preferred : KALSHI_CATEGORY_OPTIONS[0] || "";
  }
  return "";
}

function buildDefaultChartParameters(charts) {
  /** @type {Record<string, object>} */
  const out = {};
  for (const chart of charts || []) {
    out[chart.key] = chart.defaults || defaultChartParameterValues(chart.parameterMode);
  }
  return out;
}

export default function RunYourselfWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: user, isLoading: userLoading } = useSWR("/api/user", userSwrFetcher);

  const source = useMemo(() => {
    const from = searchParams.get("from");
    const col = searchParams.get("col");
    const stored = loadRunSourceContext();
    if (from) {
      const parsed = parseFromQueryParam(from);
      if (!parsed) return stored;
      const merged = {
        ...parsed,
        layoutColumnKey:
          parsed.layoutColumnKey ||
          col ||
          (stored?.chartId === parsed.chartId ? stored.layoutColumnKey : undefined),
      };
      return merged;
    }
    return stored;
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
  const [parameterValue, setParameterValue] = useState("");
  const [chartParameters, setChartParameters] = useState({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(5);
  const [error, setError] = useState(null);

  const analysis = RUN_YOURSELF_ANALYSES.find((a) => a.id === analysisId) || RUN_YOURSELF_ANALYSES[0];
  const isDashboardChartFork = source?.kind === "dashboard_chart";
  const isDashboardFullFork = isDashboardRunAnalysis(analysis) && !isDashboardChartFork;
  const isDashboardAnalysis = isDashboardFullFork;

  const dashboardForkSource = useMemo(
    () =>
      isDashboardRunAnalysis(analysis)
        ? resolveDashboardForkSource(analysis, source || {})
        : null,
    [analysis, source],
  );

  const manifestUrl =
    (isDashboardFullFork || isDashboardChartFork) &&
    dashboardForkSource?.ownerHandle &&
    dashboardForkSource?.dashboardSlug
      ? `/api/run-yourself/dashboard-manifest?analysisId=${encodeURIComponent(analysisId)}&ownerHandle=${encodeURIComponent(dashboardForkSource.ownerHandle)}&dashboardSlug=${encodeURIComponent(dashboardForkSource.dashboardSlug)}`
      : null;

  const { data: manifestRes, isLoading: manifestLoading } = useSWR(manifestUrl, async (url) => {
    const res = await fetch(url, { credentials: "same-origin" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || "Failed to load dashboard");
    return json.data;
  });

  const dashboardCharts = manifestRes?.charts || [];

  const selectedDashboardChart = useMemo(() => {
    if (!isDashboardChartFork || !source?.chartId) return null;
    return dashboardCharts.find((c) => c.chartId === source.chartId) || null;
  }, [isDashboardChartFork, source?.chartId, dashboardCharts]);

  useEffect(() => {
    setAnalysisId(preselected);
  }, [preselected]);

  useEffect(() => {
    const a = RUN_YOURSELF_ANALYSES.find((x) => x.id === analysisId) || RUN_YOURSELF_ANALYSES[0];
    setParameterValue(defaultParameterForAnalysis(a));
  }, [analysisId]);

  useEffect(() => {
    if (!manifestRes?.charts?.length) return;
    if (isDashboardChartFork && source?.chartId) {
      const target =
        manifestRes.charts.find((c) => c.chartId === source.chartId) ||
        (source.layoutColumnKey
          ? manifestRes.charts.find((c) => c.key === source.layoutColumnKey)
          : null);
      if (target) {
        setChartParameters({
          [target.key]:
            target.defaults || defaultChartParameterValues(target.parameterMode),
        });
        return;
      }
    }
    setChartParameters(buildDefaultChartParameters(manifestRes.charts));
  }, [manifestUrl, manifestRes, isDashboardChartFork, source?.chartId, source?.layoutColumnKey]);

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

  const handleChartParameterChange = useCallback((key, values) => {
    setChartParameters((prev) => ({ ...prev, [key]: values }));
  }, []);

  const handleRun = useCallback(async () => {
    if (!source || running) return;
    if (!isDashboardFullFork && !isDashboardChartFork && !parameterValue.trim()) return;

    setRunning(true);
    setError(null);
    setProgress(12);

    const parameterMode =
      analysis.parameterMode === "category_dropdown"
        ? "category"
        : analysis.parameterMode === "market_search"
          ? "ticker"
          : "ticker";

    const tick = window.setInterval(() => {
      setProgress((p) => Math.min(p + 4, 88));
    }, 800);

    try {
      const forkSource = isDashboardFullFork
        ? resolveDashboardForkSource(analysis, source)
        : isDashboardChartFork
          ? {
              ownerHandle: source.ownerHandle,
              dashboardSlug: source.dashboardSlug,
              chartId: source.chartId,
              layoutColumnKey:
                source.layoutColumnKey || selectedDashboardChart?.key || undefined,
            }
          : {
              ownerHandle: source.ownerHandle,
              chartSlug: source.chartSlug || analysis.sourceCharts?.[0]?.slug || "",
              dashboardSlug: source.dashboardSlug,
            };

      const res = await fetch("/api/run-yourself/fork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          source: forkSource,
          analysisId,
          parameter:
            isDashboardFullFork || isDashboardChartFork
              ? { mode: "category", value: "dashboard" }
              : { mode: parameterMode, value: parameterValue.trim() },
          chartParameters:
            isDashboardFullFork || isDashboardChartFork ? chartParameters : undefined,
          replicateDashboard: isDashboardFullFork,
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
  }, [
    parameterValue,
    chartParameters,
    source,
    running,
    analysisId,
    analysis.parameterMode,
    isDashboardFullFork,
    isDashboardChartFork,
    selectedDashboardChart,
    analysis,
    router,
  ]);

  const canRun = isDashboardChartFork
    ? !!selectedDashboardChart && !manifestLoading
    : isDashboardFullFork
      ? dashboardCharts.length > 0 && !manifestLoading
      : !!parameterValue.trim();

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
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Run your own analysis</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a chart or dashboard, set your parameters, and we&apos;ll build a private copy in your workspace.
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
              <CardDescription>
                Charts fork one analysis. Dashboards replicate every chart with its own parameters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RunYourselfAnalysisPicker analysisId={analysisId} onSelect={setAnalysisId} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                2.{" "}
                {isDashboardChartFork
                  ? "Configure this chart"
                  : isDashboardFullFork
                    ? "Configure dashboard charts"
                    : analysis.parameterMode === "category_dropdown"
                      ? "Select category"
                      : analysis.parameterMode === "market_search"
                        ? "Select market"
                        : "Select trade"}
              </CardTitle>
              <CardDescription>
                {isDashboardChartFork
                  ? "Set parameters for this chart only — other dashboard cards are not included."
                  : isDashboardFullFork
                    ? "Set category filters for each chart. Choose “All categories” to match the original dashboard scope."
                    : analysis.parameterMode === "category_dropdown"
                      ? "Choose a Kalshi taxonomy category — the analysis runs across all markets in that category."
                      : analysis.parameterMode === "market_search"
                        ? "Search Kalshi markets."
                        : "Search Kalshi markets — selecting one pulls trades for that market."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isDashboardChartFork ? (
                selectedDashboardChart ? (
                  <RunYourselfDashboardChartParamRow
                    chart={selectedDashboardChart}
                    values={
                      chartParameters[selectedDashboardChart.key] ||
                      selectedDashboardChart.defaults ||
                      {}
                    }
                    onChange={handleChartParameterChange}
                    disabled={running}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {manifestLoading ? "Loading chart…" : "Chart not found on this dashboard."}
                  </p>
                )
              ) : isDashboardFullFork ? (
                <RunYourselfDashboardChartParams
                  charts={dashboardCharts}
                  chartParameters={chartParameters}
                  onChange={handleChartParameterChange}
                  disabled={running}
                  loading={manifestLoading}
                />
              ) : analysis.parameterMode === "category_dropdown" ? (
                <>
                  <Select value={parameterValue} onValueChange={setParameterValue} disabled={running}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {KALSHI_CATEGORY_OPTIONS.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {parameterValue ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Selected:{" "}
                      <span className="font-medium text-foreground">{parameterValue}</span>
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <KalshiPowerToolsSearch
                    onSelect={(s) => setParameterValue(s.ticker)}
                    disabled={running}
                    parameterMode={
                      analysis.parameterMode === "market_search" ? "market_search" : "trade_search"
                    }
                  />
                  {parameterValue ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Selected:{" "}
                      <span className="font-medium text-foreground">{parameterValue}</span>
                    </p>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Button
            className="w-full gap-2 font-semibold"
            size="lg"
            disabled={!canRun}
            onClick={handleRun}
          >
            {isDashboardChartFork
              ? "Run chart"
              : isDashboardFullFork
                ? "Run dashboard"
                : "Run analysis"}
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
