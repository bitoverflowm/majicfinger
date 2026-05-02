"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMyStateV2 } from "@/context/stateContextV2";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CHART_CARDS_GRID_STYLE,
  createEmptyDashboardLayout,
} from "@/lib/dashboardLayoutDefaults";
import {
  persistChartDashboardDraft,
  mergeCreatedChartDashboardDraft,
} from "@/lib/persistChartDashboardDraft";
import { IsolatedChartPreview } from "./IsolatedChartPreview";
import DotPattern from "@/components/magicui/dot-pattern";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  getPageTextBlockEditorClasses,
  getPageTextBlockEditorStyle,
  PAGE_SUBHEADING_PLACEHOLDER,
} from "@/lib/pageTitleTheme";
import {
  getChartCardHeadingEditorClasses,
  getChartCardHeadingEditorStyle,
  getChartCardMicrotextEditorClasses,
  getChartCardMicrotextEditorStyle,
  getChartCardSubheadingEditorClasses,
  getChartCardSubheadingEditorStyle,
} from "@/lib/chartCardTextTheme";

function rid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function clampChartColSpan(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 12;
  return Math.min(12, Math.max(1, Math.round(x)));
}

function sumChartRowColSpans(columns) {
  if (!Array.isArray(columns)) return 0;
  return columns.reduce((s, c) => s + clampChartColSpan(c?.colSpan), 0);
}

function emptyColumn(overrides = {}) {
  return {
    id: rid("col"),
    chart_id: null,
    colSpan: 12,
    rowSpan: 1,
    h2: "",
    caption: "",
    microtext: "",
    link: { mode: "none", url: "" },
    ...overrides,
  };
}

/**
 * Append a chart slot using a 12-col grid: fill the last `cards` row if sum(colSpan) < 12;
 * if the row is a single full-width chart (12), split to 6+6; otherwise start a new row.
 * @returns {{ rows: object[], selection: { rowId: string, colId: string } }}
 */
function computeRowsAfterAddChart(layout) {
  const base = layout && typeof layout === "object" ? layout : createEmptyDashboardLayout();
  const rows = Array.isArray(base.rows) ? [...base.rows] : [];

  let lastCardsIdx = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i]?.type === "cards" && Array.isArray(rows[i].columns)) {
      lastCardsIdx = i;
      break;
    }
  }

  if (lastCardsIdx < 0) {
    const rowId = rid("row");
    const col = emptyColumn({ colSpan: 12 });
    rows.push({ id: rowId, type: "cards", columns: [col] });
    return { rows, selection: { rowId, colId: col.id } };
  }

  const row = rows[lastCardsIdx];
  const cols = Array.isArray(row.columns) ? [...row.columns] : [];
  const sum = sumChartRowColSpans(cols);

  if (sum < 12) {
    const remaining = 12 - sum;
    const col = emptyColumn({ colSpan: remaining });
    const updatedRow = { ...row, columns: [...cols, col] };
    rows[lastCardsIdx] = updatedRow;
    return { rows, selection: { rowId: row.id, colId: col.id } };
  }

  if (sum === 12 && cols.length === 1 && clampChartColSpan(cols[0].colSpan) === 12) {
    const first = { ...cols[0], colSpan: 6 };
    const col = emptyColumn({ colSpan: 6 });
    rows[lastCardsIdx] = { ...row, columns: [first, col] };
    return { rows, selection: { rowId: row.id, colId: col.id } };
  }

  const rowId = rid("row");
  const col = emptyColumn({ colSpan: 12 });
  rows.push({ id: rowId, type: "cards", columns: [col] });
  return { rows, selection: { rowId, colId: col.id } };
}

export default function DashboardComposerPage({ user }) {
  const {
    chartDashboardDraft,
    setChartDashboardDraft,
    activeChartDashboardId,
    setActiveChartDashboardId,
    savedDataSets,
    loadedDataMeta,
    setSelectedDashboardCard,
    setRefetchChartDashboardsTick,
    savedChartDashboards,
    setPageTitleFormatDockOpen,
    setPageFormatDockTarget,
    setChartComposerDock,
    setChartPickerEmphasis,
  } = useMyStateV2();

  const hasDbUser =
    user?.userId && user.userId !== "dev-bypass-no-db" && /^[a-f0-9]{24}$/i.test(user.userId);

  const draft = chartDashboardDraft;

  const [dashboardLoadProgress, setDashboardLoadProgress] = useState(8);
  const [dashboardLoadStage, setDashboardLoadStage] = useState("Loading dashboard");
  /** Row ids with expanded editor; new rows start collapsed. */
  const [expandedRowIds, setExpandedRowIds] = useState(() => new Set());
  const openPageTitleDock = useCallback(() => {
    setPageTitleFormatDockOpen?.(true);
  }, [setPageTitleFormatDockOpen]);

  const openPageSubheadingDock = useCallback(() => {
    setPageFormatDockTarget?.("pageSubheading");
  }, [setPageFormatDockTarget]);

  const pageSubheadingTextareaRef = useRef(null);
  /** Grow subheading field with content (theme font size / line wrap). */
  useLayoutEffect(() => {
    const el = pageSubheadingTextareaRef.current;
    if (!el) return;
    const sync = () => {
      el.style.height = "0px";
      el.style.height = `${el.scrollHeight}px`;
    };
    sync();
    const ro = new ResizeObserver(() => sync());
    ro.observe(el);
    return () => ro.disconnect();
  }, [draft?.page_subheading, draft?.theme?.pageSubheading]);

  useEffect(() => {
    if (!activeChartDashboardId || !hasDbUser) return;
    let cancelled = false;
    setDashboardLoadProgress(12);
    setDashboardLoadStage("Loading dashboard");
    (async () => {
      try {
        const res = await fetch(`/api/chart-dashboards/${activeChartDashboardId}`);
        if (!cancelled) {
          setDashboardLoadProgress(48);
          setDashboardLoadStage("Reading saved layout");
        }
        const j = await res.json();
        if (!j?.success || !j?.data) {
          toast.error(j?.message || "Failed to load dashboard");
          setActiveChartDashboardId?.(null);
          return;
        }
        if (cancelled) return;
        setDashboardLoadProgress(82);
        setDashboardLoadStage("Applying dashboard");
        const d = j.data;
        setSelectedDashboardCard?.(null);
        setChartComposerDock?.(null);
        setChartPickerEmphasis?.(null);
        setChartDashboardDraft({
          _id: d._id,
          dashboard_name: d.dashboard_name || "",
          page_heading: d.page_heading || "",
          page_subheading: d.page_subheading || "",
          layout: d.layout && typeof d.layout === "object" ? d.layout : createEmptyDashboardLayout(),
          theme: d.theme && typeof d.theme === "object" ? d.theme : { background: "none", background_color: "" },
          data_set_id: d.data_set_id ? String(d.data_set_id) : "",
          public_slug: d.public_slug || "",
          is_public: !!d.is_public,
        });
        if (!cancelled) setDashboardLoadProgress(100);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load dashboard");
          setActiveChartDashboardId?.(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    activeChartDashboardId,
    hasDbUser,
    setChartDashboardDraft,
    setActiveChartDashboardId,
    setSelectedDashboardCard,
    setChartComposerDock,
  ]);

  const setDraft = useCallback(
    (updater) => {
      setChartDashboardDraft((prev) => {
        const base = prev || {};
        return typeof updater === "function" ? updater(base) : { ...base, ...updater };
      });
    },
    [setChartDashboardDraft],
  );

  const rows = draft?.layout?.rows ?? [];

  const updateRow = useCallback(
    (rowId, fn) => {
      setDraft((d) => {
        const layout = d.layout || createEmptyDashboardLayout();
        const nextRows = layout.rows.map((r) => (r.id === rowId ? fn(r) : r));
        return { ...d, layout: { ...layout, rows: nextRows } };
      });
    },
    [setDraft],
  );

  const updateColumn = useCallback(
    (rowId, colId, fn) => {
      updateRow(rowId, (r) => {
        if (r.type !== "cards" || !Array.isArray(r.columns)) return r;
        const columns = r.columns.map((c) => (c.id === colId ? fn(c) : c));
        return { ...r, columns };
      });
    },
    [updateRow],
  );

  /** Add Chart: pack into the last 12-col cards row when possible; otherwise new row. */
  const addChart = () => {
    setPageFormatDockTarget?.(null);
    const layout = draftRef.current?.layout || chartDashboardDraft?.layout;
    const { rows: nextRows, selection } = computeRowsAfterAddChart(layout);
    setSelectedDashboardCard?.(selection);
    setChartComposerDock?.(selection);
    setChartPickerEmphasis?.(selection);
    setDraft((d) => {
      const curLayout = d.layout || createEmptyDashboardLayout();
      return {
        ...d,
        layout: {
          ...curLayout,
          rows: nextRows,
        },
      };
    });
  };

  const addTextRow = () => {
    setDraft((d) => {
      const layout = d.layout || createEmptyDashboardLayout();
      return {
        ...d,
        layout: {
          ...layout,
          rows: [...layout.rows, { id: rid("row"), type: "text", body: "" }],
        },
      };
    });
  };

  const removeRow = (rowId) => {
    setDraft((d) => {
      const layout = d.layout || createEmptyDashboardLayout();
      return { ...d, layout: { ...layout, rows: layout.rows.filter((r) => r.id !== rowId) } };
    });
    setSelectedDashboardCard?.(null);
    setChartComposerDock?.((prev) => (prev?.rowId === rowId ? null : prev));
    setChartPickerEmphasis?.((em) => (em?.rowId === rowId ? null : em));
  };

  const moveRow = (rowId, dir) => {
    setDraft((d) => {
      const layout = d.layout || createEmptyDashboardLayout();
      const idx = layout.rows.findIndex((r) => r.id === rowId);
      if (idx < 0) return d;
      const j = idx + dir;
      if (j < 0 || j >= layout.rows.length) return d;
      const next = [...layout.rows];
      [next[idx], next[j]] = [next[j], next[idx]];
      return { ...d, layout: { ...layout, rows: next } };
    });
  };

  const handleCreateNew = () => {
    if (!hasDbUser) {
      toast.error("Sign in to create a dashboard.");
      return;
    }
    const dataSetId = draft?.data_set_id || loadedDataMeta?._id || savedDataSets?.[0]?._id;
    setSelectedDashboardCard?.(null);
    setChartComposerDock?.(null);
    setChartPickerEmphasis?.(null);
    setActiveChartDashboardId?.(null);
    setChartDashboardDraft({
      dashboard_name: "",
      page_heading: "",
      page_subheading: "",
      layout: createEmptyDashboardLayout(),
      theme: { background: "none", background_color: "" },
      data_set_id: dataSetId ? String(dataSetId) : "",
      public_slug: "",
      is_public: false,
    });
    toast.success(
      dataSetId
        ? "New dashboard — fill name and page title to auto-save."
        : "New dashboard — pick an associated project, name, and page title to auto-save.",
    );
  };

  const autoSaveTimerRef = useRef(null);
  const autoSaveBusyRef = useRef(false);
  const lastAutoToastAtRef = useRef(0);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (!draft || !hasDbUser || !user?.userId) return;
    const name = String(draft.dashboard_name || "").trim();
    const title = String(draft.page_heading || "").trim();
    const pid = draft.data_set_id ? String(draft.data_set_id).trim() : "";
    if (!name || !title || !pid) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      if (autoSaveBusyRef.current) return;
      autoSaveBusyRef.current = true;
      try {
        const current = draftRef.current;
        if (!current) return;
        const result = await persistChartDashboardDraft({ draft: current, userId: user.userId });
        if (!result.ok) return;
        if (result.created) {
          setChartDashboardDraft((prev) => mergeCreatedChartDashboardDraft(prev, result.created));
          setActiveChartDashboardId?.(String(result.created._id));
        }
        setRefetchChartDashboardsTick?.((t) => (t || 0) + 1);
        const now = Date.now();
        if (now - lastAutoToastAtRef.current > 3500) {
          toast.success("Dashboard auto-saved");
          lastAutoToastAtRef.current = now;
        }
      } finally {
        autoSaveBusyRef.current = false;
      }
    }, 1400);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    draft?.dashboard_name,
    draft?.page_heading,
    draft?.page_subheading,
    draft?.data_set_id,
    draft?.layout,
    draft?.theme,
    draft?._id,
    hasDbUser,
    user?.userId,
    setChartDashboardDraft,
    setActiveChartDashboardId,
    setRefetchChartDashboardsTick,
  ]);

  const savedDashboardOptions = useMemo(() => {
    const list = Array.isArray(savedChartDashboards) ? savedChartDashboards : [];
    return list.map((d) => ({
      id: String(d._id),
      label: (d.dashboard_name || d.page_heading || "Untitled dashboard").trim(),
    }));
  }, [savedChartDashboards]);

  if (!draft) {
    if (activeChartDashboardId && hasDbUser) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6">
          <p className="text-center text-sm font-medium text-muted-foreground">{dashboardLoadStage}</p>
          <div className="w-full max-w-md space-y-1.5">
            <Progress
              value={dashboardLoadProgress}
              className="h-2.5 w-full"
              indicatorClassName="bg-primary"
            />
            <p className="text-center text-xs text-muted-foreground">
              {Math.max(1, Math.min(100, dashboardLoadProgress))}%
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6">
        {savedDashboardOptions.length > 0 ? (
          <div className="flex w-full max-w-xl flex-col gap-2">
            <Label htmlFor="load-saved-dashboard" className="text-xs text-muted-foreground">
              Open a saved dashboard
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                onValueChange={(id) => {
                  if (!id) return;
                  setChartDashboardDraft(null);
                  setActiveChartDashboardId?.(String(id));
                  setSelectedDashboardCard?.(null);
                }}
              >
                <SelectTrigger id="load-saved-dashboard" className="h-10 min-w-[12rem] flex-1 sm:min-w-[16rem]">
                  <SelectValue placeholder="Choose a dashboard…" />
                </SelectTrigger>
                <SelectContent>
                  {savedDashboardOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" className="h-10 shrink-0" onClick={handleCreateNew}>
                <Plus className="h-4 w-4" />
                New
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              No saved dashboards yet. Create one below or use <span className="font-medium">Your Work</span>.
            </p>
            <Button type="button" className="h-10" onClick={handleCreateNew}>
              <Plus className="h-4 w-4" />
              New
            </Button>
          </>
        )}
        <p className="max-w-md text-center text-xs text-muted-foreground">
          Load a saved dashboard or start a new dashboard.
        </p>
      </div>
    );
  }

  const bg = draft.theme?.background_color || "";
  const showDots = draft.theme?.background === "dotPattern";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto scroll-pb-40 px-6 pt-6 pb-40">
      <div
        className="relative rounded-lg border p-6 shadow-sm"
        style={{ backgroundColor: bg || undefined }}
      >
        {showDots ? (
          <DotPattern
            className={cn("[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]")}
          />
        ) : null}
        <div className="relative z-0 mx-auto max-w-6xl space-y-6">
          <input
            type="text"
            aria-label="Page title"
            autoComplete="off"
            spellCheck={false}
            value={draft.page_heading ?? ""}
            placeholder="Your Title"
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                page_heading: e.target.value,
              }))
            }
            onFocus={openPageTitleDock}
            style={getPageTextBlockEditorStyle(draft?.theme, "pageTitle")}
            className={cn(
              "w-full min-w-0 cursor-text border-0 bg-transparent p-0 shadow-none outline-none",
              "tracking-tight text-foreground",
              "placeholder:text-muted-foreground/80",
              "focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
              getPageTextBlockEditorClasses(draft?.theme, "pageTitle"),
            )}
          />

          <Textarea
            ref={pageSubheadingTextareaRef}
            aria-label="Page subheading"
            autoComplete="off"
            spellCheck={false}
            rows={1}
            value={draft.page_subheading ?? ""}
            placeholder={PAGE_SUBHEADING_PLACEHOLDER}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                page_subheading: e.target.value,
              }))
            }
            onFocus={openPageSubheadingDock}
            style={getPageTextBlockEditorStyle(draft?.theme, "pageSubheading")}
            className={cn(
              "!min-h-0 overflow-hidden",
              "w-full min-w-0 cursor-text resize-y border-0 bg-transparent p-0 shadow-none outline-none",
              "text-foreground placeholder:text-muted-foreground/80",
              "focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
              getPageTextBlockEditorClasses(draft?.theme, "pageSubheading"),
            )}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={addChart}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Chart
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={addTextRow}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Text
            </Button>
          </div>

          {rows.map((row) => {
            if (row.type === "cards" && Array.isArray(row.columns)) {
              const cols = row.columns || [];
              return (
                <div key={row.id} className="grid gap-4" style={CHART_CARDS_GRID_STYLE}>
                  {cols.map((col) => {
                      return (
                        <div
                          key={col.id}
                          role="button"
                          tabIndex={0}
                          style={{
                            gridColumn: `span ${Math.min(12, Math.max(1, col.colSpan ?? 12))}`,
                            gridRow: `span ${Math.min(4, Math.max(1, Number(col.rowSpan) || 1))}`,
                          }}
                          onClick={() => {
                            setPageFormatDockTarget?.(null);
                            setSelectedDashboardCard?.({ rowId: row.id, colId: col.id });
                            setChartComposerDock?.({ rowId: row.id, colId: col.id });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              setPageFormatDockTarget?.(null);
                              setSelectedDashboardCard?.({ rowId: row.id, colId: col.id });
                              setChartComposerDock?.({ rowId: row.id, colId: col.id });
                            }
                          }}
                          className="flex h-full min-h-0 min-w-0 flex-col gap-2 overflow-y-auto py-1 transition-colors outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        >
                          <input
                            type="text"
                            aria-label="Chart heading"
                            autoComplete="off"
                            spellCheck={false}
                            value={col.h2 ?? ""}
                            placeholder="Chart Heading"
                            onChange={(e) =>
                              updateColumn(row.id, col.id, (c) => ({
                                ...c,
                                h2: e.target.value,
                              }))
                            }
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => {
                              e.stopPropagation();
                              setSelectedDashboardCard?.({ rowId: row.id, colId: col.id });
                              setChartComposerDock?.({ rowId: row.id, colId: col.id });
                              setPageFormatDockTarget?.({
                                type: "chartHeading",
                                rowId: row.id,
                                colId: col.id,
                              });
                            }}
                            style={getChartCardHeadingEditorStyle(col)}
                            className={cn(
                              "w-full min-w-0 cursor-text border-0 bg-transparent p-0 shadow-none outline-none",
                              "tracking-tight text-foreground",
                              "placeholder:text-muted-foreground/80",
                              "focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                              getChartCardHeadingEditorClasses(col),
                            )}
                          />
                          <Textarea
                            aria-label="Chart sub-heading"
                            autoComplete="off"
                            spellCheck={false}
                            rows={2}
                            value={col.caption ?? ""}
                            placeholder="sub-heading"
                            onChange={(e) =>
                              updateColumn(row.id, col.id, (c) => ({
                                ...c,
                                caption: e.target.value,
                              }))
                            }
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => {
                              e.stopPropagation();
                              setSelectedDashboardCard?.({ rowId: row.id, colId: col.id });
                              setChartComposerDock?.({ rowId: row.id, colId: col.id });
                              setPageFormatDockTarget?.({
                                type: "chartSubheading",
                                colId: col.id,
                                rowId: row.id,
                              });
                            }}
                            style={getChartCardSubheadingEditorStyle(col)}
                            className={cn(
                              "!min-h-0 overflow-hidden",
                              "w-full min-w-0 cursor-text resize-y border-0 bg-transparent p-0 shadow-none outline-none",
                              "text-foreground placeholder:text-muted-foreground/80",
                              "focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                              getChartCardSubheadingEditorClasses(col),
                            )}
                          />
                          <div className="flex min-h-0 flex-1 cursor-pointer flex-col overflow-hidden">
                            <IsolatedChartPreview chartId={col.chart_id} />
                          </div>
                          <input
                            type="text"
                            aria-label="Chart caption text, click to edit"
                            autoComplete="off"
                            spellCheck={false}
                            value={col.microtext ?? ""}
                            placeholder="Chart caption text, click to edit"
                            onChange={(e) =>
                              updateColumn(row.id, col.id, (c) => ({
                                ...c,
                                microtext: e.target.value,
                              }))
                            }
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => {
                              e.stopPropagation();
                              setSelectedDashboardCard?.({ rowId: row.id, colId: col.id });
                              setChartComposerDock?.({ rowId: row.id, colId: col.id });
                              setPageFormatDockTarget?.({
                                type: "chartMicrotext",
                                rowId: row.id,
                                colId: col.id,
                              });
                            }}
                            style={getChartCardMicrotextEditorStyle(col)}
                            className={cn(
                              "w-full min-w-0 cursor-text border-0 bg-transparent p-0 shadow-none outline-none",
                              "tracking-tight text-foreground",
                              "placeholder:text-muted-foreground/80",
                              "focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                              getChartCardMicrotextEditorClasses(col),
                            )}
                          />
                        </div>
                      );
                    })}
                </div>
              );
            }

            if (row.type === "text") {
              const rowExpanded = expandedRowIds.has(row.id);
              const collapsedSummary = row.body?.trim()
                ? `${row.body.trim().slice(0, 100)}${row.body.trim().length > 100 ? "…" : ""}`
                : "Empty text row";
              return (
                <Collapsible
                  key={row.id}
                  open={rowExpanded}
                  onOpenChange={(open) => {
                    setExpandedRowIds((prev) => {
                      const next = new Set(prev);
                      if (open) next.add(row.id);
                      else next.delete(row.id);
                      return next;
                    });
                  }}
                >
                  <div className="rounded-lg border border-border/80 bg-background/80 p-4 shadow-sm backdrop-blur-sm">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          aria-expanded={rowExpanded}
                          aria-label={rowExpanded ? "Collapse row" : "Expand row"}
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              rowExpanded ? "rotate-0" : "-rotate-90",
                            )}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <span className="text-xs font-medium uppercase text-muted-foreground">Text row</span>
                      <div className="ml-auto flex gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => moveRow(row.id, -1)}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => moveRow(row.id, 1)}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeRow(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {!rowExpanded ? (
                      <p className="text-xs text-muted-foreground">{collapsedSummary}</p>
                    ) : null}

                    <CollapsibleContent>
                      <Textarea
                        value={row.body || ""}
                        onChange={(e) =>
                          updateRow(row.id, (r) => ({ ...r, body: e.target.value }))
                        }
                        placeholder="Descriptive text for this row…"
                        className="min-h-[100px]"
                      />
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}
