"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { createSheetOperation } from "@/lib/projectPersistence";
import { ConnectProgressWithLabel } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/ConnectProgressWithLabel";
import {
  DEFAULT_BUCKET_RANGES,
  DEFAULT_SNAPSHOT_CHECKPOINTS,
  formatCheckpointLabel,
  inferOutcomeMapping,
  isProgressColumnSupported,
  looksLikePredictionMarketData,
  suggestEndColumn,
  suggestGroupColumn,
  suggestOutcomeColumn,
  suggestProbabilityColumn,
  suggestProgressColumn,
  suggestCheckpointColumn,
  uniqueColumnValues,
  uniqueFreeColumnName,
  detectProbabilityScale,
} from "@/lib/sheetOperations/quant/columnInference";
import { computeRelativePosition } from "@/lib/sheetOperations/quant/relativePosition";
import { computeBrierScore } from "@/lib/sheetOperations/quant/brierScore";
import {
  inferPredictionMarketSetup,
  runPredictionMarketLifecycleAccuracy,
} from "@/lib/sheetOperations/quant/predictionMarketPreset";
import { buildQuantChartSuggestions } from "@/lib/sheetOperations/quant/chartSuggestions";

const SNAPSHOT_RULES = [
  { value: "latest_before", label: "Latest row at or before checkpoint" },
  { value: "closest", label: "Closest row to checkpoint" },
  { value: "first_after", label: "First row at or after checkpoint" },
  { value: "avg_window", label: "Average within window" },
  { value: "vwap_window", label: "VWAP within window" },
];

const BUCKET_AGGREGATIONS = [
  "mean",
  "median",
  "mode",
  "min",
  "max",
  "sum",
  "count",
  "standard deviation",
  "variance",
  "first",
  "last",
  "VWAP",
];

const WEIGHTING_OPTIONS = [
  { value: "equal_group", label: "Equal-weight each group" },
  { value: "equal_row", label: "Equal-weight each row" },
  { value: "volume", label: "Volume-weighted" },
  { value: "custom", label: "Custom weight column" },
];

function ColumnSelect({ label, value, onChange, columns, helper, required, error }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value || "__"} onValueChange={(v) => onChange(v === "__" ? "" : v)}>
        <SelectTrigger className={cn("h-9 text-xs", error && "border-destructive")}>
          <SelectValue placeholder="Select column" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__">—</SelectItem>
          {columns.map((c) => (
            <SelectItem key={`col-${label}-${c}`} value={c} className="font-mono text-xs">
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {helper ? <p className="text-[10px] text-muted-foreground">{helper}</p> : null}
      {error ? <p className="text-[10px] text-destructive">{error}</p> : null}
    </div>
  );
}

function WarningsList({ warnings = [], blocking = [] }) {
  if (!warnings.length && !blocking.length) return null;
  return (
    <div className="space-y-2">
      {blocking.map((w) => (
        <Alert key={w.id} variant="destructive" className="py-2">
          <AlertTitle className="text-xs">Cannot run</AlertTitle>
          <AlertDescription className="text-xs">{w.message}</AlertDescription>
        </Alert>
      ))}
      {warnings.map((w) => (
        <Alert key={w.id} className="py-2">
          <AlertTitle className="text-xs">Note</AlertTitle>
          <AlertDescription className="text-xs">{w.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

/**
 * @param {object} props
 */
export function QuantOperationsPanel({
  rows = [],
  columnNames = [],
  nextFreeColumnName,
  mathDestination = "new_sheet",
  activeSheetId,
  addNewSheetAndActivate,
  setSheetData,
  setDataSheets,
  setConnectedData,
  replaceCurrentSheetData,
  appendActiveSheetOperation,
  setDataTypes,
  addNewChartAndActivate,
  setLoadedChartBuilderSnapshot,
  onClose,
  onBusyChange,
  onCanSubmitChange,
}) {
  const [operation, setOperation] = useState("pm_preset");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [previewWarnings, setPreviewWarnings] = useState([]);
  const [previewBlocking, setPreviewBlocking] = useState([]);

  const [groupColumn, setGroupColumn] = useState("");
  const [progressColumn, setProgressColumn] = useState("");
  const [mode, setMode] = useState("create_column");
  const [metricColumns, setMetricColumns] = useState([]);
  const [snapshotRule, setSnapshotRule] = useState("latest_before");
  const [bucketAggregation, setBucketAggregation] = useState("mean");
  const [endRule, setEndRule] = useState("auto");
  const [endColumn, setEndColumn] = useState("");
  const [manualEndValue, setManualEndValue] = useState("");
  const [checkpointsText, setCheckpointsText] = useState(
    DEFAULT_SNAPSHOT_CHECKPOINTS.map((c) => formatCheckpointLabel(c)).join(", "),
  );
  const [bucketRangesText, setBucketRangesText] = useState(
    DEFAULT_BUCKET_RANGES.map(([a, b]) => `${formatCheckpointLabel(a)}–${formatCheckpointLabel(b)}`).join(", "),
  );
  const [vwapPriceColumn, setVwapPriceColumn] = useState("");
  const [vwapVolumeColumn, setVwapVolumeColumn] = useState("");
  const [outlierHandling, setOutlierHandling] = useState("minmax");

  const [probabilityColumn, setProbabilityColumn] = useState("");
  const [outcomeColumn, setOutcomeColumn] = useState("");
  const [bucketScoreColumn, setBucketScoreColumn] = useState("");
  const [brierGroupColumn, setBrierGroupColumn] = useState("");
  const [weighting, setWeighting] = useState("equal_group");
  const [volumeColumn, setVolumeColumn] = useState("");
  const [weightColumn, setWeightColumn] = useState("");
  const [outcomeMapping, setOutcomeMapping] = useState({});
  const [outcomeMappingManual, setOutcomeMappingManual] = useState(false);

  const [pmStep, setPmStep] = useState("confirm");
  const [pmSetup, setPmSetup] = useState(null);

  const suggestedGroup = useMemo(() => suggestGroupColumn(columnNames), [columnNames]);
  const suggestedProgress = useMemo(() => suggestProgressColumn(columnNames), [columnNames]);
  const suggestedEnd = useMemo(() => suggestEndColumn(columnNames), [columnNames]);
  const isPmData = useMemo(() => looksLikePredictionMarketData(columnNames), [columnNames]);

  useEffect(() => {
    if (!columnNames.length) return;
    setGroupColumn((prev) => (prev && columnNames.includes(prev) ? prev : suggestedGroup));
    setProgressColumn((prev) => (prev && columnNames.includes(prev) ? prev : suggestedProgress));
    setEndColumn((prev) => (prev && columnNames.includes(prev) ? prev : suggestedEnd));
    if (suggestedEnd) setEndRule("column");
    setProbabilityColumn((prev) => (prev && columnNames.includes(prev) ? prev : suggestProbabilityColumn(columnNames)));
    setOutcomeColumn((prev) => (prev && columnNames.includes(prev) ? prev : suggestOutcomeColumn(columnNames)));
    setBucketScoreColumn((prev) => (prev && columnNames.includes(prev) ? prev : suggestCheckpointColumn(columnNames)));
    setBrierGroupColumn((prev) => (prev && columnNames.includes(prev) ? prev : suggestedGroup));
    if (isPmData) setMode("snapshot");
    setPmSetup(inferPredictionMarketSetup(rows, columnNames));
  }, [columnNames, rows, suggestedGroup, suggestedProgress, suggestedEnd, isPmData]);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const parseCheckpoints = useCallback(() => {
    return checkpointsText
      .split(/[,;\n]+/)
      .map((s) => {
        const n = Number(String(s).trim().replace(/%$/, ""));
        if (!Number.isFinite(n)) return null;
        return n > 1 ? n / 100 : n;
      })
      .filter((n) => n != null);
  }, [checkpointsText]);

  const parseBucketRanges = useCallback(() => {
    return bucketRangesText
      .split(/[,;\n]+/)
      .map((part) => {
        const m = String(part).trim().match(/^([\d.]+)\s*[–-]\s*([\d.]+)%?$/);
        if (!m) return null;
        let a = Number(m[1]);
        let b = Number(m[2]);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
        if (a > 1 || b > 1) {
          a /= 100;
          b /= 100;
        }
        return [Math.min(a, b), Math.max(a, b)];
      })
      .filter(Boolean);
  }, [bucketRangesText]);

  const relativeConfig = useMemo(
    () => ({
      groupColumn,
      progressColumn,
      mode,
      metricColumns,
      snapshotRule,
      bucketAggregation: bucketAggregation.toLowerCase(),
      endRule,
      endColumn: endRule === "column" ? endColumn : "",
      manualEndValue: endRule === "manual" ? manualEndValue : "",
      checkpoints: parseCheckpoints(),
      bucketRanges: parseBucketRanges(),
      vwapPriceColumn,
      vwapVolumeColumn,
      outlierHandling,
      outputPositionColumn: uniqueFreeColumnName(columnNames, "relative_position"),
      outputPositionPctColumn: uniqueFreeColumnName(columnNames, "relative_position_pct"),
      checkpointColumn: uniqueFreeColumnName(columnNames, "lifecycle_checkpoint"),
      bucketColumn: uniqueFreeColumnName(columnNames, "lifecycle_bucket"),
    }),
    [
      groupColumn,
      progressColumn,
      mode,
      metricColumns,
      snapshotRule,
      bucketAggregation,
      endRule,
      endColumn,
      manualEndValue,
      parseCheckpoints,
      parseBucketRanges,
      vwapPriceColumn,
      vwapVolumeColumn,
      outlierHandling,
      columnNames,
    ],
  );

  useEffect(() => {
    if (!rows.length || !progressColumn) {
      setPreviewWarnings([]);
      setPreviewBlocking([]);
      return;
    }
    if (operation === "relative_position") {
      if (!isProgressColumnSupported(rows, progressColumn)) {
        setPreviewBlocking([
          {
            id: "unsupported_progress",
            message:
              "This column cannot be normalized because it is not numeric or time-based. Choose a number, timestamp, date, or ordered column.",
          },
        ]);
        setPreviewWarnings([]);
        return;
      }
      const preview = computeRelativePosition(rows.slice(0, 5000), relativeConfig);
      setPreviewWarnings(preview.warnings);
      setPreviewBlocking(preview.blocking);
    } else if (operation === "brier_score") {
      const blocking = [];
      if (!probabilityColumn) blocking.push({ id: "no_prob", message: "Select a probability column." });
      if (!outcomeColumn) blocking.push({ id: "no_out", message: "Select an outcome column." });
      const scale = detectProbabilityScale(rows, probabilityColumn);
      if (probabilityColumn && !scale.valid) {
        blocking.push({
          id: "bad_prob",
          message: "Selected probability column contains values outside the expected probability range.",
        });
      }
      setPreviewBlocking(blocking);
      setPreviewWarnings([]);
    } else if (operation === "pm_preset" && pmSetup) {
      const result = runPredictionMarketLifecycleAccuracy(rows.slice(0, 5000), pmSetup);
      setPreviewWarnings(result.warnings);
      setPreviewBlocking(result.blocking);
    }
  }, [operation, rows, progressColumn, relativeConfig, probabilityColumn, outcomeColumn, pmSetup]);

  const toggleMetricColumn = (col) => {
    setMetricColumns((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));
  };

  const writeSheet = useCallback(
    (sheetId, data, sheetName, operation) => {
      setSheetData?.(sheetId, data);
      setDataTypes?.((prev) => {
        const next = { ...(prev || {}) };
        for (const key of Object.keys(data[0] || {})) {
          if (key === "_origIndex") continue;
          const sample = data.find((r) => r?.[key] != null && r?.[key] !== "")?.[key];
          next[key] = typeof sample === "number" ? "number" : "string";
        }
        return next;
      });
      setDataSheets?.((prev) => {
        const p = prev || {};
        const sheet = p[sheetId];
        if (!sheet) return prev;
        return {
          ...p,
          [sheetId]: {
            ...sheet,
            name: sheetName.slice(0, 80),
            data,
            rowCount: data.length,
            fullRowCount: data.length,
            sourceSheetId: activeSheetId || sheet.sourceSheetId,
            operationHistory: [
              ...(Array.isArray(sheet.operationHistory) ? sheet.operationHistory : []),
              operation,
            ],
          },
        };
      });
    },
    [activeSheetId, setDataSheets, setDataTypes, setSheetData],
  );

  const applyRelativePosition = useCallback(async () => {
    const result = computeRelativePosition(rows, relativeConfig);
    if (result.blocking.length) {
      toast.error(result.blocking[0].message);
      return false;
    }
    if (!result.rows.length) {
      toast.error("No output rows were generated.");
      return false;
    }
    const op = createSheetOperation("quant.relative_position", { config: relativeConfig });
    if (mode === "create_column" && mathDestination === "current_sheet") {
      replaceCurrentSheetData?.(result.rows);
      setConnectedData?.(result.rows);
      appendActiveSheetOperation?.("quant.relative_position", { config: relativeConfig });
      toast.success("Added relative position columns to current sheet.");
    } else {
      const sheetName = mode === "snapshot" ? "Lifecycle Snapshots" : mode === "bucket" ? "Lifecycle Buckets" : "Relative Position";
      await new Promise((resolve) => {
        addNewSheetAndActivate?.((newId) => {
          writeSheet(newId, result.rows, sheetName, op);
          resolve();
        });
      });
      toast.success(`Created ${sheetName} with ${result.rows.length.toLocaleString()} rows.`);
    }
    return true;
  }, [
    rows,
    relativeConfig,
    mode,
    mathDestination,
    replaceCurrentSheetData,
    setConnectedData,
    appendActiveSheetOperation,
    addNewSheetAndActivate,
    writeSheet,
  ]);

  const applyBrierScore = useCallback(async () => {
    const inferred = inferOutcomeMapping(rows, outcomeColumn);
    const mapping = outcomeMappingManual ? outcomeMapping : inferred.mapping;
    const scale = detectProbabilityScale(rows, probabilityColumn);
    const result = computeBrierScore(rows, {
      probabilityColumn,
      outcomeColumn,
      bucketColumn: bucketScoreColumn,
      groupColumn: brierGroupColumn,
      weighting,
      volumeColumn,
      weightColumn,
      outcomeMapping: mapping,
      probabilityScale: scale.scale,
    });
    if (result.blocking.length) {
      toast.error(result.blocking[0].message);
      return false;
    }
    const op = createSheetOperation("quant.brier_score", {
      probabilityColumn,
      outcomeColumn,
      bucketColumn: bucketScoreColumn,
    });
    if (!bucketScoreColumn) {
      if (mathDestination === "current_sheet") {
        replaceCurrentSheetData?.(result.rowLevelRows);
        setConnectedData?.(result.rowLevelRows);
        appendActiveSheetOperation?.("quant.brier_score", { config: { rowLevel: true } });
      } else {
        await new Promise((resolve) => {
          addNewSheetAndActivate?.((newId) => {
            writeSheet(newId, result.rowLevelRows, "Brier Scores", op);
            resolve();
          });
        });
      }
      toast.success("Added Brier score columns.");
      return true;
    }
    await new Promise((resolve) => {
      addNewSheetAndActivate?.((newId) => {
        writeSheet(newId, result.rows, "Brier Score Summary", op);
        resolve();
      });
    });
    toast.success(`Created accuracy summary with ${result.rows.length} checkpoints.`);
    return true;
  }, [
    rows,
    outcomeColumn,
    outcomeMappingManual,
    outcomeMapping,
    probabilityColumn,
    bucketScoreColumn,
    brierGroupColumn,
    weighting,
    volumeColumn,
    weightColumn,
    mathDestination,
    replaceCurrentSheetData,
    setConnectedData,
    appendActiveSheetOperation,
    addNewSheetAndActivate,
    writeSheet,
  ]);

  const applyPmPreset = useCallback(async () => {
    const setup = pmSetup || inferPredictionMarketSetup(rows, columnNames);
    const result = runPredictionMarketLifecycleAccuracy(rows, setup);
    if (result.blocking.length) {
      toast.error(result.blocking[0].message);
      return false;
    }
    setBusy(true);
    setProgress(20);
    setProgressLabel("Creating lifecycle snapshots…");
    const snapOp = createSheetOperation("quant.pm_lifecycle_snapshot", { setup });
    await new Promise((resolve) => {
      addNewSheetAndActivate?.((newId) => {
        writeSheet(newId, result.snapshotRows, setup.snapshotSheetName || "Lifecycle Snapshots", snapOp);
        resolve();
      });
    });
    setProgress(60);
    setProgressLabel("Computing lifecycle accuracy…");
    const accOp = createSheetOperation("quant.pm_lifecycle_accuracy", { setup });
    await new Promise((resolve) => {
      addNewSheetAndActivate?.((newId) => {
        writeSheet(newId, result.accuracyRows, setup.accuracySheetName || "Lifecycle Accuracy", accOp);
        resolve();
      });
    });
    setProgress(90);
    setProgressLabel("Suggesting charts…");
    const charts = buildQuantChartSuggestions(result.accuracyRows);
    if (charts.length && addNewChartAndActivate) {
      const first = charts[0];
      addNewChartAndActivate?.(() => {
        setLoadedChartBuilderSnapshot?.(first.snapshot);
      }, { initialSnapshot: first.snapshot });
      toast.success(`Created snapshots, accuracy table, and suggested chart: ${first.title}`);
    } else {
      toast.success("Created lifecycle snapshots and accuracy table.");
    }
    setProgress(100);
    setBusy(false);
    return true;
  }, [
    pmSetup,
    rows,
    columnNames,
    addNewSheetAndActivate,
    writeSheet,
    addNewChartAndActivate,
    setLoadedChartBuilderSnapshot,
  ]);

  const handleApply = useCallback(async () => {
    if (!rows.length) {
      toast.error("Load sheet data before running quant operations.");
      return;
    }
    setBusy(true);
    try {
      let ok = false;
      if (operation === "relative_position") ok = await applyRelativePosition();
      else if (operation === "brier_score") ok = await applyBrierScore();
      else ok = await applyPmPreset();
      if (ok) onClose?.();
    } finally {
      setBusy(false);
      setProgress(0);
      setProgressLabel("");
    }
  }, [rows, operation, applyRelativePosition, applyBrierScore, applyPmPreset, onClose]);

  const canSubmit = useMemo(() => {
    if (!rows.length || busy) return false;
    if (previewBlocking.length) return false;
    if (operation === "relative_position") return Boolean(progressColumn);
    if (operation === "brier_score") return Boolean(probabilityColumn && outcomeColumn);
    if (operation === "pm_preset") return pmStep === "confirm" && pmSetup?.progressSupported && pmSetup?.probabilityValid;
    return false;
  }, [rows, busy, previewBlocking, operation, progressColumn, probabilityColumn, outcomeColumn, pmStep, pmSetup]);

  useEffect(() => {
    onCanSubmitChange?.(canSubmit);
  }, [canSubmit, onCanSubmitChange]);

  const outcomeValues = useMemo(
    () => (outcomeColumn ? uniqueColumnValues(rows, outcomeColumn, 12) : []),
    [rows, outcomeColumn],
  );

  const renderRelativePositionForm = () => (
    <div className="space-y-3">
      <ColumnSelect
        label="What are we comparing?"
        value={groupColumn}
        onChange={setGroupColumn}
        columns={columnNames}
        helper={suggestedGroup ? `Suggested group column: ${suggestedGroup}` : undefined}
      />
      <ColumnSelect
        label="What defines progress?"
        value={progressColumn}
        onChange={setProgressColumn}
        columns={columnNames}
        helper={suggestedProgress ? `Suggested progress column: ${suggestedProgress}` : undefined}
      />
      <div className="space-y-1">
        <Label className="text-xs">How should Lychee compare progress?</Label>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="create_column">Create Progress Column</SelectItem>
            <SelectItem value="bucket">Bucket by Progress</SelectItem>
            <SelectItem value="snapshot">Snapshot at Progress</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {mode !== "create_column" ? (
        <div className="space-y-1">
          <Label className="text-xs">Which values should Lychee keep or summarize?</Label>
          <div className="max-h-28 overflow-y-auto rounded-md border border-border/60 p-2 space-y-1">
            {columnNames.map((c) => (
              <label key={`metric-${c}`} className="flex items-center gap-2 text-xs">
                <Checkbox checked={metricColumns.includes(c)} onCheckedChange={() => toggleMetricColumn(c)} />
                <span className="font-mono">{c}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
      {mode === "snapshot" ? (
        <div className="space-y-1">
          <Label className="text-xs">How should Lychee choose values?</Label>
          <Select value={snapshotRule} onValueChange={setSnapshotRule}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SNAPSHOT_RULES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {snapshotRule === "closest" ? (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              Closest row may use data after the checkpoint. For forecasting analysis, use “latest row at or before checkpoint” to avoid future leakage.
            </p>
          ) : null}
        </div>
      ) : null}
      {mode === "bucket" ? (
        <div className="space-y-1">
          <Label className="text-xs">How should Lychee summarize values?</Label>
          <Select value={bucketAggregation} onValueChange={setBucketAggregation}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUCKET_AGGREGATIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {bucketAggregation === "VWAP" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <ColumnSelect label="Price column" value={vwapPriceColumn} onChange={setVwapPriceColumn} columns={columnNames} />
              <ColumnSelect label="Volume column" value={vwapVolumeColumn} onChange={setVwapVolumeColumn} columns={columnNames} />
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-1">
        <Label className="text-xs">What should count as the lifecycle end?</Label>
        <Select value={endRule} onValueChange={setEndRule}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto: last observed value</SelectItem>
            <SelectItem value="column">Use selected end column</SelectItem>
            <SelectItem value="manual">Manual value</SelectItem>
          </SelectContent>
        </Select>
        {endRule === "column" ? (
          <ColumnSelect
            value={endColumn}
            onChange={setEndColumn}
            columns={columnNames}
            label="End column"
            helper={suggestedEnd ? `Lychee found a possible lifecycle end column: ${suggestedEnd}` : undefined}
          />
        ) : null}
        {endRule === "manual" ? (
          <Input className="h-9 text-xs" value={manualEndValue} onChange={(e) => setManualEndValue(e.target.value)} placeholder="End value" />
        ) : null}
      </div>
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs px-0">
            Advanced Settings
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          {mode === "snapshot" ? (
            <div className="space-y-1">
              <Label className="text-xs">Custom checkpoints</Label>
              <Input className="h-9 text-xs" value={checkpointsText} onChange={(e) => setCheckpointsText(e.target.value)} />
            </div>
          ) : null}
          {mode === "bucket" ? (
            <div className="space-y-1">
              <Label className="text-xs">Custom bucket ranges</Label>
              <Input className="h-9 text-xs" value={bucketRangesText} onChange={(e) => setBucketRangesText(e.target.value)} />
            </div>
          ) : null}
          <div className="space-y-1">
            <Label className="text-xs">Outlier handling</Label>
            <Select value={outlierHandling} onValueChange={setOutlierHandling}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minmax">Continue with min/max</SelectItem>
                <SelectItem value="percentile">Use 1st–99th percentile as range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  const renderBrierScoreForm = () => (
    <div className="space-y-3">
      <ColumnSelect label="Which column contains the forecast probability?" value={probabilityColumn} onChange={setProbabilityColumn} columns={columnNames} />
      <ColumnSelect label="Which column contains the final outcome?" value={outcomeColumn} onChange={setOutcomeColumn} columns={columnNames} />
      {outcomeValues.length > 0 && !inferOutcomeMapping(rows, outcomeColumn).ok ? (
        <div className="space-y-2 rounded-lg border border-border/70 p-2">
          <Label className="text-xs">Map outcome values</Label>
          {outcomeValues.map((val) => (
            <div key={String(val)} className="grid grid-cols-[1fr_0.6fr] gap-2 items-center">
              <span className="text-xs font-mono truncate">{String(val)}</span>
              <Select
                value={String(outcomeMapping[String(val)] ?? "__")}
                onValueChange={(v) => {
                  setOutcomeMappingManual(true);
                  setOutcomeMapping((prev) => ({ ...prev, [String(val)]: v === "__" ? undefined : Number(v) }));
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Map to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__">—</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="0">0</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      ) : null}
      <ColumnSelect
        label="Measure error across what?"
        value={bucketScoreColumn}
        onChange={setBucketScoreColumn}
        columns={["", ...columnNames]}
        helper="Leave empty for row-level scores only"
      />
      {bucketScoreColumn ? (
        <>
          <ColumnSelect label="Group column (for equal-weight markets)" value={brierGroupColumn} onChange={setBrierGroupColumn} columns={columnNames} />
          <div className="space-y-1">
            <Label className="text-xs">How should observations be weighted?</Label>
            <Select value={weighting} onValueChange={setWeighting}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEIGHTING_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {weighting === "volume" ? (
            <ColumnSelect label="Volume column" value={volumeColumn} onChange={setVolumeColumn} columns={columnNames} />
          ) : null}
          {weighting === "custom" ? (
            <ColumnSelect label="Weight column" value={weightColumn} onChange={setWeightColumn} columns={columnNames} />
          ) : null}
        </>
      ) : null}
    </div>
  );

  const renderPmPreset = () => {
    const setup = pmSetup || {};
    if (pmStep === "confirm") {
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Go from raw trade-level prediction-market data to a research-ready lifecycle accuracy table in a few clicks.
          </p>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-xs space-y-1">
            <p className="font-medium">Lychee detected the following setup:</p>
            <p>Group column: <span className="font-mono">{setup.groupColumn || "—"}</span></p>
            <p>Progress column: <span className="font-mono">{setup.progressColumn || "—"}</span></p>
            <p>Lifecycle end: <span className="font-mono">{setup.endColumn || "last observed"}</span></p>
            <p>Probability column: <span className="font-mono">{setup.probabilityColumn || "—"}</span></p>
            <p>Outcome column: <span className="font-mono">{setup.outcomeColumn || "—"}</span></p>
            <p>
              Checkpoints:{" "}
              {(setup.checkpoints || []).map((c) => formatCheckpointLabel(c)).join(", ")}
            </p>
            <p>Snapshot rule: latest row at or before checkpoint</p>
            <p>Aggregation: equal-weight each market</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="h-8 text-xs" onClick={() => void handleApply()} disabled={!canSubmit || busy}>
              Run Analysis
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => setPmStep("edit")}>
              Edit Setup
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs px-0" onClick={() => setPmStep("confirm")}>
          ← Back to confirmation
        </Button>
        <div className="grid gap-3 sm:grid-cols-2">
          <ColumnSelect label="Group column" value={setup.groupColumn || groupColumn} onChange={(v) => setPmSetup((s) => ({ ...s, groupColumn: v }))} columns={columnNames} />
          <ColumnSelect label="Progress column" value={setup.progressColumn || progressColumn} onChange={(v) => setPmSetup((s) => ({ ...s, progressColumn: v }))} columns={columnNames} />
          <ColumnSelect label="Lifecycle end" value={setup.endColumn || endColumn} onChange={(v) => setPmSetup((s) => ({ ...s, endColumn: v, endRule: "column" }))} columns={columnNames} />
          <ColumnSelect label="Probability column" value={setup.probabilityColumn || probabilityColumn} onChange={(v) => setPmSetup((s) => ({ ...s, probabilityColumn: v }))} columns={columnNames} />
          <ColumnSelect label="Outcome column" value={setup.outcomeColumn || outcomeColumn} onChange={(v) => setPmSetup((s) => ({ ...s, outcomeColumn: v }))} columns={columnNames} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Quant operation</Label>
        <Select value={operation} onValueChange={(v) => { setOperation(v); setPmStep("confirm"); }}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relative_position">Relative Position</SelectItem>
            <SelectItem value="brier_score">Brier Score / Forecast Error</SelectItem>
            <SelectItem value="pm_preset">Prediction Market Lifecycle Accuracy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {operation === "relative_position" ? renderRelativePositionForm() : null}
      {operation === "brier_score" ? renderBrierScoreForm() : null}
      {operation === "pm_preset" ? renderPmPreset() : null}

      <WarningsList warnings={previewWarnings} blocking={previewBlocking} />

      {busy ? (
        <ConnectProgressWithLabel label={progressLabel || "Running…"} progress={progress} />
      ) : null}

      {operation !== "pm_preset" || pmStep === "edit" ? (
        <div className="flex justify-end gap-2 pt-1 border-t border-border/60">
          <Button type="button" size="sm" variant="outline" onClick={() => onClose?.()} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={() => void handleApply()} disabled={!canSubmit || busy}>
            {operation === "pm_preset" ? "Run Analysis" : "Apply to sheet"}
          </Button>
        </div>
      ) : (
        <div className="flex justify-end gap-2 pt-1 border-t border-border/60">
          <Button type="button" size="sm" variant="outline" onClick={() => onClose?.()} disabled={busy}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
