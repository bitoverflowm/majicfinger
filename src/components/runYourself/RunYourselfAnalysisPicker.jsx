"use client";

import {
  RUN_YOURSELF_CHART_ANALYSES,
  RUN_YOURSELF_DASHBOARD_ANALYSES,
} from "@/config/runYourselfAnalyses";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   analysisId: string;
 *   onSelect: (id: string) => void;
 * }} props
 */
export function RunYourselfAnalysisPicker({ analysisId, onSelect }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <AnalysisColumn
        title="Charts"
        description="Fork a single chart with one market, trade, or category."
        analyses={RUN_YOURSELF_CHART_ANALYSES}
        analysisId={analysisId}
        onSelect={onSelect}
      />
      <AnalysisColumn
        title="Dashboards"
        description="Replicate a full dashboard — configure each chart separately."
        analyses={RUN_YOURSELF_DASHBOARD_ANALYSES}
        analysisId={analysisId}
        onSelect={onSelect}
      />
    </div>
  );
}

/** @param {{ title: string; description: string; analyses: object[]; analysisId: string; onSelect: (id: string) => void }} props */
function AnalysisColumn({ title, description, analyses, analysisId, onSelect }) {
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-2">
        {analyses.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-left transition-colors",
              analysisId === a.id
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "hover:bg-muted/50",
            )}
          >
            <span className="block text-sm font-medium">{a.label}</span>
            {a.description ? (
              <span className="mt-1 block text-xs text-muted-foreground line-clamp-2">
                {a.description}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
