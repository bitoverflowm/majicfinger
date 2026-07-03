"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { StateProviderV2, useMyStateV2 } from "@/context/stateContextV2";
import { ChartBuilderProvider, ChartCanvas } from "@/components/chartView";
import { RunForYourselfButton } from "@/components/runYourself/RunForYourselfButton";
import {
  HUB_CHART_EMBED_HEIGHT,
  HUB_HERO_CHART_EMBED_HEIGHT,
  HubChartEmbedSkeleton,
  HubHeroChartEmbedSkeleton,
} from "@/components/publicEmbed/ChartEmbedSkeleton";
import { normalizeBuilderSnapshot } from "@/lib/chartBundle";
import { resolveEmbedActiveSheetId } from "@/lib/chartSnapshotDataDeps";
import { inferDefaultBuilderSnapshot } from "@/lib/inferDefaultBuilderSnapshot";
import { cn } from "@/lib/utils";

function DataSheetsLoader({ rows, dataSheets, chartSnapshot }) {
  const { setDataSheets, setActiveSheetId, setConnectedData } = useMyStateV2();
  useLayoutEffect(() => {
    const incomingSheets =
      dataSheets && typeof dataSheets === "object" && Object.keys(dataSheets).length
        ? dataSheets
        : { "sheet-1": { name: "Sheet 1", data: Array.isArray(rows) ? rows : [], provenance: null } };
    setDataSheets?.(incomingSheets);
    const activeId = resolveEmbedActiveSheetId(incomingSheets, chartSnapshot);
    setActiveSheetId?.(activeId);
    const activeRows = Array.isArray(incomingSheets?.[activeId]?.data) ? incomingSheets[activeId].data : [];
    setConnectedData?.(activeRows.length ? activeRows : Array.isArray(rows) ? rows : []);
  }, [rows, dataSheets, chartSnapshot, setDataSheets, setActiveSheetId, setConnectedData]);
  return null;
}

function HubChartEmbedBody({ chartPayload, username, slug, variant = "default" }) {
  const heightClass = variant === "hero" ? HUB_HERO_CHART_EMBED_HEIGHT : HUB_CHART_EMBED_HEIGHT;
  const rows = chartPayload?.rows ?? [];
  const dataSheets = chartPayload?.dataSheets ?? {};
  const chart = chartPayload?.chart;
  const cpRb =
    Array.isArray(chart?.chart_properties) &&
    chart.chart_properties[0] &&
    typeof chart.chart_properties[0] === "object" &&
    chart.chart_properties[0].rechartsBuilder?.v === 1
      ? chart.chart_properties[0].rechartsBuilder
      : null;
  const rb =
    chart?.rechartsBuilder && chart.rechartsBuilder.v === 1
      ? chart.rechartsBuilder
      : cpRb || inferDefaultBuilderSnapshot(rows);

  const chartSnapshot = useMemo(
    () => normalizeBuilderSnapshot(rb, rows, dataSheets),
    [rb, rows, dataSheets],
  );

  const hasRowsInAnySheet = Object.values(dataSheets || {}).some(
    (sheet) => Array.isArray(sheet?.data) && sheet.data.length > 0,
  );

  if (!rows.length && !hasRowsInAnySheet) {
    return (
      <div className={cn("flex items-center justify-center text-sm text-muted-foreground", heightClass)}>
        Chart unavailable
      </div>
    );
  }

  const cp0 =
    Array.isArray(chart?.chart_properties) &&
    chart.chart_properties[0] &&
    typeof chart.chart_properties[0] === "object"
      ? chart.chart_properties[0]
      : {};

  return (
    <StateProviderV2 initialSettings={{ viewing: "charts", demo: false, rightPanelOpen: false }}>
      <div
        className={cn("relative", heightClass, variant === "hero" && "rounded-xl overflow-hidden")}
        style={{
          backgroundColor: cp0.bgColor || undefined,
          color: cp0.textColor || undefined,
        }}
      >
        <DataSheetsLoader rows={rows} dataSheets={dataSheets} chartSnapshot={chartSnapshot} />
        <ChartBuilderProvider demo={false} embedCompact initialBuilderSnapshot={chartSnapshot}>
          <div
            className={cn(
              "flex h-full min-h-0 w-full flex-col overflow-hidden",
              variant === "hero" ? "p-0" : "p-2",
            )}
          >
            <ChartCanvas />
          </div>
        </ChartBuilderProvider>
      </div>
    </StateProviderV2>
  );
}

/**
 * @param {{
 *   username: string;
 *   slug: string;
 *   initialPayload?: object | null;
 *   variant?: "default" | "hero";
 *   heroCopy?: { eyebrow?: string; title?: string; subtitle?: string; caption?: string };
 * }} props
 */
export function HubPublishedChartEmbed({
  username,
  slug,
  initialPayload = null,
  variant = "default",
  heroCopy,
}) {
  const [payload, setPayload] = useState(initialPayload);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(!initialPayload);
  const heightClass = variant === "hero" ? HUB_HERO_CHART_EMBED_HEIGHT : HUB_CHART_EMBED_HEIGHT;
  const Skeleton = variant === "hero" ? HubHeroChartEmbedSkeleton : HubChartEmbedSkeleton;

  useEffect(() => {
    if (initialPayload) {
      setPayload(initialPayload);
      setErr(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setErr(null);
    setPayload(null);

    fetch(`/api/public/charts/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j?.success) {
          setErr(j?.message || "Chart not found");
          return;
        }
        setPayload(j.data);
      })
      .catch(() => {
        if (!cancelled) setErr("Failed to load chart");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username, slug, initialPayload]);

  const Wrapper = variant === "hero" ? "div" : "article";
  const wrapperClass =
    variant === "hero"
      ? cn(
          "w-full overflow-hidden rounded-xl bg-card/40 shadow-sm",
          heroCopy && "text-left",
        )
      : "overflow-hidden rounded-xl border border-border bg-card/40";

  const heroHeader =
    variant === "hero" && heroCopy ? (
      <div className="mb-4 px-4 pt-4 text-left sm:px-5 sm:pt-5">
        {heroCopy.eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {heroCopy.eyebrow}
          </p>
        ) : null}
        {heroCopy.title ? (
          <h2 className="mt-1.5 text-lg font-semibold leading-tight text-foreground sm:text-xl">
            {heroCopy.title}
          </h2>
        ) : null}
        {heroCopy.subtitle ? (
          <p className="mt-1 max-w-[42rem] text-sm leading-relaxed text-muted-foreground">
            {heroCopy.subtitle}
          </p>
        ) : null}
      </div>
    ) : null;

  const heroCaption =
    variant === "hero" && heroCopy?.caption ? (
      <p className="mt-3 px-4 pb-4 text-xs text-muted-foreground/75 sm:mt-4 sm:px-5 sm:pb-5">
        {heroCopy.caption}
      </p>
    ) : null;

  return (
    <Wrapper className={wrapperClass}>
      {heroHeader}
      {loading ? <Skeleton /> : null}
      {!loading && err ? (
        <div className={cn("flex items-center justify-center px-6 text-center text-sm text-muted-foreground", heightClass)}>
          {err}
        </div>
      ) : null}
      {!loading && payload ? (
        <>
          <HubChartEmbedBody
            chartPayload={payload}
            username={username}
            slug={slug}
            variant={variant}
          />
          {variant === "default" ? (
            <div className="border-t border-border px-4 py-3">
              <RunForYourselfButton
                ownerHandle={username}
                chartSlug={slug}
                kind="chart"
                presentation="promo"
                promoVariant="subtle"
                displayName={payload?.chart?.chart_name || slug}
              />
            </div>
          ) : null}
        </>
      ) : null}
      {heroCaption}
    </Wrapper>
  );
}
