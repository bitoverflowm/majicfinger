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
import { userSwrFetcher, mutateUser } from "@/lib/hooks";
import {
  RUN_YOURSELF_ALL_CATEGORIES,
  defaultChartParameterValues,
} from "@/config/runYourselfDashboardCharts";
import {
  getRunYourselfAnalysisById,
  isDashboardRunAnalysis,
  resolveChartForkSource,
  resolveDashboardForkSource,
} from "@/config/runYourselfAnalyses";
import { KalshiPowerToolsSearch } from "@/components/connectData/KalshiPowerToolsSearch";
import {
  RunYourselfDashboardChartParams,
  RunYourselfDashboardChartParamRow,
} from "@/components/runYourself/RunYourselfDashboardChartParams";
import { RunYourselfAnalysisPicker } from "@/components/runYourself/RunYourselfAnalysisPicker";
import { MagicLinkEmailForm } from "@/components/runYourself/MagicLinkEmailForm";
import { KALSHI_GROUP_COLORS } from "@/lib/kalshi/kalshiCategoryTaxonomy";
import { userHasPaidAccess, userRunYourselfQuotaExceeded } from "@/lib/runYourself/hasPaidAccess";
import {
  loadRunSourceContext,
  parseFromQueryParam,
} from "@/lib/runYourself/runSourceContext";

const KALSHI_CATEGORY_OPTIONS = Object.keys(KALSHI_GROUP_COLORS);

function defaultParameterForConfig(config) {
  const mode = config?.parameterMode;
  if (mode === "category_optional" || mode === "category_dropdown") {
    const preferred = config?.defaultCategory || RUN_YOURSELF_ALL_CATEGORIES;
    if (preferred === RUN_YOURSELF_ALL_CATEGORIES) return RUN_YOURSELF_ALL_CATEGORIES;
    return KALSHI_CATEGORY_OPTIONS.includes(preferred) ? preferred : KALSHI_CATEGORY_OPTIONS[0] || RUN_YOURSELF_ALL_CATEGORIES;
  }
  if (mode === "trade_search" || mode === "market_search") {
    return config?.defaultTicker || "";
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

function resolveSameSourceValues({
  parameterMode,
  runConfig,
  isDashboardFullFork,
  isDashboardChartFork,
  selectedDashboardChart,
  dashboardCharts,
}) {
  if (isDashboardFullFork) {
    return { chartParameters: buildDefaultChartParameters(dashboardCharts) };
  }
  if (isDashboardChartFork && selectedDashboardChart) {
    return {
      chartParameters: {
        [selectedDashboardChart.key]:
          selectedDashboardChart.defaults ||
          defaultChartParameterValues(selectedDashboardChart.parameterMode),
      },
    };
  }
  if (parameterMode === "category_optional" || parameterMode === "category_dropdown") {
    return {
      parameterValue: runConfig?.defaultCategory || RUN_YOURSELF_ALL_CATEGORIES,
    };
  }
  if (parameterMode === "dual_category_optional") {
    return { useSourceFilters: true };
  }
  if (parameterMode === "trade_search" || parameterMode === "market_search") {
    if (runConfig?.defaultTicker) {
      return { parameterValue: runConfig.defaultTicker };
    }
    return { useSourceFilters: true };
  }
  return null;
}

function getSameSourceRunLabel({
  parameterMode,
  runConfig,
  isDashboardChartFork,
  isDashboardFullFork,
  selectedDashboardChart,
}) {
  if (isDashboardFullFork) return "Run with original dashboard parameters";
  if (isDashboardChartFork && selectedDashboardChart) {
    const mode = selectedDashboardChart.parameterMode;
    const defaults = selectedDashboardChart.defaults || {};
    if (mode === "trade_search" || mode === "market_search") {
      return defaults.ticker
        ? `Run on same market (${defaults.ticker})`
        : "Run with original market filters";
    }
    if (mode === "dual_category_optional") return "Run with original category filters";
    if (defaults.kalshiCategory && defaults.kalshiCategory !== RUN_YOURSELF_ALL_CATEGORIES) {
      return `Run on same category (${defaults.kalshiCategory})`;
    }
    return "Run on same scope (all categories)";
  }
  if (parameterMode === "trade_search" || parameterMode === "market_search") {
    const ticker = runConfig?.defaultTicker;
    return ticker ? `Run on same market (${ticker})` : "Run with original market filters";
  }
  if (parameterMode === "dual_category_optional") {
    return "Run with original category filters";
  }
  if (parameterMode === "category_optional" || parameterMode === "category_dropdown") {
    const category = runConfig?.defaultCategory;
    return category ? `Run on same category (${category})` : "Run on same scope (all categories)";
  }
  return null;
}

function supportsSameSourceShortcut(parameterMode, isDashboardFullFork, isDashboardChartFork) {
  if (isDashboardFullFork || isDashboardChartFork) return true;
  return (
    parameterMode === "trade_search" ||
    parameterMode === "market_search" ||
    parameterMode === "category_optional" ||
    parameterMode === "category_dropdown" ||
    parameterMode === "dual_category_optional"
  );
}

export default function RunYourselfWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: user, isLoading: userLoading } = useSWR("/api/user", userSwrFetcher);

  const source = useMemo(() => {
    if (searchParams.get("generic") === "1") return null;
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
          (stored?.chartId != null && stored.chartId === parsed.chartId
            ? stored.layoutColumnKey
            : undefined),
      };
      return merged;
    }
    return stored;
  }, [searchParams]);
  const requestedAnalysisId = searchParams.get("analysisId") || "";

  const [parameterValue, setParameterValue] = useState("");
  const [chartParameters, setChartParameters] = useState({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(5);
  const [error, setError] = useState(null);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(requestedAnalysisId);

  useEffect(() => {
    if (requestedAnalysisId) setSelectedAnalysisId(requestedAnalysisId);
  }, [requestedAnalysisId]);

  const selectedAnalysis = useMemo(
    () => getRunYourselfAnalysisById(selectedAnalysisId),
    [selectedAnalysisId],
  );
  const derivedSource = useMemo(() => {
    if (!selectedAnalysis) return null;
    if (isDashboardRunAnalysis(selectedAnalysis)) {
      const dash = resolveDashboardForkSource(selectedAnalysis);
      if (!dash.ownerHandle || !dash.dashboardSlug) return null;
      return { kind: "dashboard", ownerHandle: dash.ownerHandle, dashboardSlug: dash.dashboardSlug };
    }
    const chart = resolveChartForkSource(selectedAnalysis);
    if (!chart.ownerHandle || !chart.chartSlug) return null;
    return { kind: "chart", ownerHandle: chart.ownerHandle, chartSlug: chart.chartSlug };
  }, [selectedAnalysis]);
  const effectiveSource = source || derivedSource;
  const genericAnalysisMode = !source;

  const isDashboardChartFork = effectiveSource?.kind === "dashboard_chart";
  const isDashboardFullFork = effectiveSource?.kind === "dashboard";

  const resolveUrl = useMemo(() => {
    if (!effectiveSource?.ownerHandle) return null;
    const params = new URLSearchParams({ ownerHandle: effectiveSource.ownerHandle });
    if (isDashboardChartFork && effectiveSource.dashboardSlug && effectiveSource.chartId) {
      params.set("dashboardSlug", effectiveSource.dashboardSlug);
      params.set("chartId", effectiveSource.chartId);
    } else if (isDashboardFullFork && effectiveSource.dashboardSlug) {
      params.set("dashboardSlug", effectiveSource.dashboardSlug);
      params.set("replicateDashboard", "1");
    } else if (effectiveSource.chartSlug) {
      params.set("chartSlug", effectiveSource.chartSlug);
    } else {
      return null;
    }
    return `/api/run-yourself/resolve?${params}`;
  }, [effectiveSource, isDashboardChartFork, isDashboardFullFork]);

  const { data: resolveRes, isLoading: resolveLoading, error: resolveError } = useSWR(
    resolveUrl,
    async (url) => {
      const res = await fetch(url, { credentials: "same-origin" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to load analysis");
      return json.data;
    },
  );

  const runConfig = resolveRes?.config || null;
  const parameterMode = runConfig?.parameterMode || "none";

  const manifestUrl =
    (isDashboardFullFork || isDashboardChartFork) && effectiveSource?.dashboardSlug
      ? `/api/run-yourself/dashboard-manifest?ownerHandle=${encodeURIComponent(effectiveSource.ownerHandle)}&dashboardSlug=${encodeURIComponent(effectiveSource.dashboardSlug)}`
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
    return (
      dashboardCharts.find((c) => c.chartId === source.chartId) ||
      resolveRes?.chartSlot ||
      null
    );
  }, [isDashboardChartFork, source?.chartId, dashboardCharts, resolveRes?.chartSlot]);

  useEffect(() => {
    if (!runConfig) return;
    setParameterValue(defaultParameterForConfig(runConfig));
  }, [runConfig?.id, runConfig?.parameterMode, runConfig?.defaultCategory, runConfig?.defaultTicker]);

  useEffect(() => {
    if (!manifestRes?.charts?.length) return;
    if (isDashboardChartFork && source?.chartId) {
      const target =
        manifestRes.charts.find((c) => c.chartId === source.chartId) ||
        (source?.layoutColumnKey
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

  const handleRun = useCallback(async (overrides = {}) => {
    if (!effectiveSource || running || !runConfig?.runnable) return;

    const activeParameterValue = overrides.parameterValue ?? parameterValue;
    const activeChartParameters = overrides.chartParameters ?? chartParameters;
    const useSourceFilters = !!overrides.useSourceFilters;

    const needsTicker =
      !useSourceFilters &&
      !isDashboardFullFork &&
      !isDashboardChartFork &&
      (parameterMode === "trade_search" || parameterMode === "market_search");
    const needsCategory =
      !useSourceFilters &&
      !isDashboardFullFork &&
      !isDashboardChartFork &&
      parameterMode !== "category_optional" &&
      parameterMode !== "none";
    if (needsTicker && !activeParameterValue.trim()) return;
    if (needsCategory && !activeParameterValue.trim()) return;

    setRunning(true);
    setError(null);
    setProgress(12);

    const parameterModeFork =
      parameterMode === "category_optional" || parameterMode === "dual_category_optional"
        ? "category"
        : "ticker";

    const tick = window.setInterval(() => {
      setProgress((p) => Math.min(p + 4, 88));
    }, 800);

    try {
      const forkSource = isDashboardFullFork
        ? {
            ownerHandle: effectiveSource.ownerHandle,
            dashboardSlug: effectiveSource.dashboardSlug,
          }
        : isDashboardChartFork
          ? {
              ownerHandle: effectiveSource.ownerHandle,
              dashboardSlug: effectiveSource.dashboardSlug,
              chartId: effectiveSource.chartId,
              layoutColumnKey:
                effectiveSource.layoutColumnKey || selectedDashboardChart?.key || undefined,
            }
          : {
              ownerHandle: effectiveSource.ownerHandle,
              chartSlug: effectiveSource.chartSlug || "",
              dashboardSlug: effectiveSource.dashboardSlug,
            };

      const res = await fetch("/api/run-yourself/fork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          source: forkSource,
          analysisId: selectedAnalysis?.id || runConfig?.id || "",
          parameter:
            isDashboardFullFork || isDashboardChartFork
              ? { mode: "category", value: "dashboard" }
              : useSourceFilters
                ? { mode: "source", value: "same" }
                : { mode: parameterModeFork, value: activeParameterValue.trim() },
          chartParameters:
            isDashboardFullFork || isDashboardChartFork ? activeChartParameters : undefined,
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
      await mutateUser();
      const { dataSetId, primaryChartId } = json.data || {};
      const q = new URLSearchParams();
      if (dataSetId) q.set("project", dataSetId);
      if (primaryChartId) q.set("chart", primaryChartId);
      q.set("runYourselfSession", "1");
      router.push(`/dashboard?${q.toString()}`);
    } catch (e) {
      clearInterval(tick);
      setError(e?.message || "Something went wrong");
      setRunning(false);
    }
  }, [
    parameterValue,
    chartParameters,
    effectiveSource,
    running,
    parameterMode,
    runConfig,
    isDashboardFullFork,
    isDashboardChartFork,
    selectedDashboardChart,
    selectedAnalysis,
    router,
  ]);

  const sameSourceRunLabel = useMemo(() => {
    if (!runConfig?.runnable || !supportsSameSourceShortcut(parameterMode, isDashboardFullFork, isDashboardChartFork)) {
      return null;
    }
    return getSameSourceRunLabel({
      parameterMode,
      runConfig,
      isDashboardChartFork,
      isDashboardFullFork,
      selectedDashboardChart,
    });
  }, [
    parameterMode,
    runConfig,
    isDashboardChartFork,
    isDashboardFullFork,
    selectedDashboardChart,
  ]);

  const handleRunSameSource = useCallback(() => {
    const same = resolveSameSourceValues({
      parameterMode,
      runConfig,
      isDashboardFullFork,
      isDashboardChartFork,
      selectedDashboardChart,
      dashboardCharts,
    });
    if (!same) return;
    if (same.parameterValue != null) setParameterValue(same.parameterValue);
    if (same.chartParameters) setChartParameters(same.chartParameters);
    void handleRun(same);
  }, [
    parameterMode,
    runConfig,
    isDashboardFullFork,
    isDashboardChartFork,
    selectedDashboardChart,
    dashboardCharts,
    handleRun,
  ]);

  const canRun = isDashboardChartFork
    ? !!selectedDashboardChart && !manifestLoading && runConfig?.runnable
    : isDashboardFullFork
      ? dashboardCharts.length > 0 && !manifestLoading && runConfig?.runnable
      : runConfig?.runnable &&
        (parameterMode === "category_optional" ||
          parameterMode === "none" ||
          !!parameterValue.trim());

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

  if (!effectiveSource && !genericAnalysisMode) {
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
          {genericAnalysisMode ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Choose an analysis</CardTitle>
                <CardDescription>
                  Legacy public charts can&apos;t be forked directly, so start from one of the curated replayable analyses instead.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RunYourselfAnalysisPicker
                  analysisId={selectedAnalysisId}
                  onSelect={(id) => {
                    setSelectedAnalysisId(id);
                    setError(null);
                  }}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {runConfig?.label || (genericAnalysisMode ? "Select an analysis first" : "Configure parameters")}
              </CardTitle>
              <CardDescription>
                {resolveLoading
                  ? "Loading analysis configuration…"
                  : !effectiveSource
                    ? "Pick one of the supported analyses above to continue."
                  : runConfig?.description ||
                    "Set the market or category for your private copy."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!effectiveSource ? (
                <p className="text-sm text-muted-foreground">Select an analysis to configure its parameters.</p>
              ) : resolveLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : resolveError || !runConfig?.runnable ? (
                <p className="text-sm text-destructive">
                  {resolveError?.message || runConfig?.reason || "This analysis cannot be run yet."}
                </p>
              ) : (
                <div className="space-y-4">
                  {sameSourceRunLabel ? (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full justify-center font-medium"
                        disabled={running}
                        onClick={handleRunSameSource}
                      >
                        {sameSourceRunLabel}
                      </Button>
                      <p className="text-center text-xs text-muted-foreground">
                        Or choose a different market or category below
                      </p>
                    </div>
                  ) : null}
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
              ) : parameterMode === "category_optional" || parameterMode === "category_dropdown" ? (
                <>
                  <Select value={parameterValue} onValueChange={setParameterValue} disabled={running}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={RUN_YOURSELF_ALL_CATEGORIES}>All categories</SelectItem>
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
                      <span className="font-medium text-foreground">
                        {parameterValue === RUN_YOURSELF_ALL_CATEGORIES
                          ? "All categories"
                          : parameterValue}
                      </span>
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <KalshiPowerToolsSearch
                    onSelect={(s) => setParameterValue(s.ticker)}
                    disabled={running}
                    parameterMode={
                      parameterMode === "market_search" ? "market_search" : "trade_search"
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
                </div>
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

          {!userHasPaidAccess(user) ? (
            <p className="text-center text-xs text-muted-foreground">
              Free accounts get one run.{" "}
              <Link href="/#pricing" className="underline">
                Upgrade to Pro
              </Link>{" "}
              for unlimited analyses.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
