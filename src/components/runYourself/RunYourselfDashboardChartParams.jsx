"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  POLYMARKET_CATEGORY_OPTIONS,
  RUN_YOURSELF_ALL_CATEGORIES,
} from "@/config/runYourselfDashboardCharts";
import { KALSHI_GROUP_COLORS } from "@/lib/kalshi/kalshiCategoryTaxonomy";

const KALSHI_CATEGORY_OPTIONS = Object.keys(KALSHI_GROUP_COLORS);

/**
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   disabled?: boolean;
 *   label?: string;
 * }} props
 */
function CategoryOptionalSelect({ value, onChange, disabled, label = "Kalshi category" }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-9">
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
    </div>
  );
}

/**
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   disabled?: boolean;
 *   label?: string;
 * }} props
 */
function PolymarketCategoryOptionalSelect({ value, onChange, disabled, label = "Polymarket category" }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={RUN_YOURSELF_ALL_CATEGORIES}>All categories</SelectItem>
          {POLYMARKET_CATEGORY_OPTIONS.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * @param {{
 *   chart: {
 *     key: string;
 *     title: string;
 *     caption?: string;
 *     parameterMode: string;
 *     hint?: string;
 *   };
 *   values: { kalshiCategory?: string; polymarketCategory?: string };
 *   onChange: (key: string, values: { kalshiCategory?: string; polymarketCategory?: string }) => void;
 *   disabled?: boolean;
 * }} props
 */
export function RunYourselfDashboardChartParamRow({ chart, values, onChange, disabled }) {
  const update = (patch) => onChange(chart.key, { ...values, ...patch });

  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="mb-2">
        <h4 className="text-sm font-medium">{chart.title}</h4>
        {chart.caption ? (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{chart.caption}</p>
        ) : null}
      </div>

      {chart.parameterMode === "none" ? (
        <p className="text-xs text-muted-foreground">
          {chart.hint || "Replicates as-is — no parameters needed."}
        </p>
      ) : null}

      {chart.parameterMode === "category_optional" ? (
        <CategoryOptionalSelect
          value={values.kalshiCategory || RUN_YOURSELF_ALL_CATEGORIES}
          onChange={(kalshiCategory) => update({ kalshiCategory })}
          disabled={disabled}
        />
      ) : null}

      {chart.parameterMode === "dual_category_optional" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <CategoryOptionalSelect
            value={values.kalshiCategory || RUN_YOURSELF_ALL_CATEGORIES}
            onChange={(kalshiCategory) => update({ kalshiCategory })}
            disabled={disabled}
            label="Kalshi category"
          />
          <PolymarketCategoryOptionalSelect
            value={values.polymarketCategory || RUN_YOURSELF_ALL_CATEGORIES}
            onChange={(polymarketCategory) => update({ polymarketCategory })}
            disabled={disabled}
            label="Polymarket category"
          />
        </div>
      ) : null}

      {chart.hint && chart.parameterMode !== "none" ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{chart.hint}</p>
      ) : null}
    </div>
  );
}

/**
 * @param {{
 *   charts: object[];
 *   chartParameters: Record<string, { kalshiCategory?: string; polymarketCategory?: string }>;
 *   onChange: (key: string, values: object) => void;
 *   disabled?: boolean;
 *   loading?: boolean;
 * }} props
 */
export function RunYourselfDashboardChartParams({
  charts,
  chartParameters,
  onChange,
  disabled,
  loading,
}) {
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading dashboard charts…</p>
    );
  }

  if (!charts?.length) {
    return (
      <p className="text-sm text-muted-foreground">No charts found for this dashboard.</p>
    );
  }

  return (
    <div className="space-y-3">
      {charts.map((chart) => (
        <RunYourselfDashboardChartParamRow
          key={chart.key}
          chart={chart}
          values={chartParameters[chart.key] || chart.defaults || {}}
          onChange={onChange}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
