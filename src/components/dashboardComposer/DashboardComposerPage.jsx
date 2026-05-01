"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMyStateV2 } from "@/context/stateContextV2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { createEmptyDashboardLayout } from "@/lib/dashboardLayoutDefaults";
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
import { getPageTitleEditorClasses, getPageTitleEditorStyle } from "@/lib/pageTitleTheme";

function rid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyColumn() {
  return {
    id: rid("col"),
    chart_id: null,
    colSpan: 12,
    rowSpan: 1,
    h2: "",
    caption: "",
    microtext: "",
    link: { mode: "none", url: "" },
  };
}

export default function DashboardComposerPage({ user }) {
  const {
    chartDashboardDraft,
    setChartDashboardDraft,
    activeChartDashboardId,
    setActiveChartDashboardId,
    savedCharts,
    savedDataSets,
    loadedDataMeta,
    selectedDashboardCard,
    setSelectedDashboardCard,
    setRefetchChartDashboardsTick,
    savedChartDashboards,
    setPageTitleFormatDockOpen,
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
        setChartDashboardDraft({
          _id: d._id,
          dashboard_name: d.dashboard_name || "",
          page_heading: d.page_heading || "",
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
  }, [activeChartDashboardId, hasDbUser, setChartDashboardDraft, setActiveChartDashboardId]);

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

  const addCardsRow = () => {
    setDraft((d) => {
      const layout = d.layout || createEmptyDashboardLayout();
      return {
        ...d,
        layout: {
          ...layout,
          rows: [
            ...layout.rows,
            { id: rid("row"), type: "cards", columns: [emptyColumn()] },
          ],
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

  const addColumn = (rowId) => {
    updateRow(rowId, (r) => {
      if (r.type !== "cards") return r;
      return { ...r, columns: [...(r.columns || []), emptyColumn()] };
    });
  };

  const removeColumn = (rowId, colId) => {
    updateRow(rowId, (r) => {
      if (r.type !== "cards" || !Array.isArray(r.columns)) return r;
      const columns = r.columns.filter((c) => c.id !== colId);
      return { ...r, columns: columns.length ? columns : [emptyColumn()] };
    });
    setSelectedDashboardCard?.(null);
  };

  const handleCreateNew = () => {
    if (!hasDbUser) {
      toast.error("Sign in to create a dashboard.");
      return;
    }
    const dataSetId = draft?.data_set_id || loadedDataMeta?._id || savedDataSets?.[0]?._id;
    setSelectedDashboardCard?.(null);
    setActiveChartDashboardId?.(null);
    setChartDashboardDraft({
      dashboard_name: "",
      page_heading: "",
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

  const chartOptions = useMemo(() => {
    const list = Array.isArray(savedCharts) ? savedCharts : [];
    return list.map((c) => ({ id: String(c._id), name: c.chart_name || "Chart" }));
  }, [savedCharts]);

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
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 py-6">
      <div
        className="relative rounded-lg border p-6 shadow-sm"
        style={{ backgroundColor: bg || undefined }}
      >
        {showDots ? (
          <DotPattern
            className={cn("[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]")}
          />
        ) : null}
        <div className="relative z-[1] mx-auto max-w-6xl space-y-6">
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
            style={getPageTitleEditorStyle(draft?.theme)}
            className={cn(
              "w-full min-w-0 cursor-text border-0 bg-transparent p-0 shadow-none outline-none",
              "tracking-tight text-foreground",
              "placeholder:text-muted-foreground/80",
              "focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
              getPageTitleEditorClasses(draft?.theme),
            )}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={addCardsRow}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Chart
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={addTextRow}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Text
            </Button>
          </div>

          {rows.map((row) => {
            const rowExpanded = expandedRowIds.has(row.id);
            const collapsedSummary =
              row.type === "cards"
                ? `${(row.columns || []).length} column${(row.columns || []).length !== 1 ? "s" : ""}`
                : row.body?.trim()
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
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {row.type === "cards" ? "Chart row" : "Text row"}
                    </span>
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
                    {row.type === "text" && (
                      <Textarea
                        value={row.body || ""}
                        onChange={(e) =>
                          updateRow(row.id, (r) => ({ ...r, body: e.target.value }))
                        }
                        placeholder="Descriptive text for this row…"
                        className="min-h-[100px]"
                      />
                    )}

                    {row.type === "cards" && (
                      <>
                        <div className="mb-3">
                          <Button type="button" size="sm" variant="secondary" onClick={() => addColumn(row.id)}>
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add column
                          </Button>
                        </div>
                        <div
                          className="grid gap-4"
                          style={{
                            gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
                          }}
                        >
                          {(row.columns || []).map((col) => {
                            const selected =
                              selectedDashboardCard?.rowId === row.id &&
                              selectedDashboardCard?.colId === col.id;
                            return (
                              <div
                                key={col.id}
                                role="button"
                                tabIndex={0}
                                style={{
                                  gridColumn: `span ${Math.min(12, Math.max(1, col.colSpan ?? 12))}`,
                                  gridRow: `span ${Math.max(1, col.rowSpan ?? 1)}`,
                                }}
                                onClick={() => setSelectedDashboardCard?.({ rowId: row.id, colId: col.id })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ")
                                    setSelectedDashboardCard?.({ rowId: row.id, colId: col.id });
                                }}
                                className={cn(
                                  "flex min-w-0 flex-col gap-2 rounded-md border p-3 transition-colors",
                                  selected ? "border-primary ring-1 ring-primary/30" : "border-border/60 bg-card/50",
                                )}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-medium text-muted-foreground">Card</span>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeColumn(row.id, col.id);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="grid gap-1">
                                    <Label className="text-[10px]">Grid span (12 cols)</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={12}
                                      className="h-8 text-xs"
                                      value={col.colSpan ?? 12}
                                      onChange={(e) =>
                                        updateColumn(row.id, col.id, (c) => ({
                                          ...c,
                                          colSpan: Math.min(12, Math.max(1, Number(e.target.value) || 1)),
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="grid gap-1">
                                    <Label className="text-[10px]">Row span</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={4}
                                      className="h-8 text-xs"
                                      value={col.rowSpan ?? 1}
                                      onChange={(e) =>
                                        updateColumn(row.id, col.id, (c) => ({
                                          ...c,
                                          rowSpan: Math.min(4, Math.max(1, Number(e.target.value) || 1)),
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="grid gap-1">
                                  <Label className="text-[10px]">Chart</Label>
                                  <Select
                                    value={col.chart_id ? String(col.chart_id) : "__none__"}
                                    onValueChange={(v) =>
                                      updateColumn(row.id, col.id, (c) => ({
                                        ...c,
                                        chart_id: v === "__none__" ? null : v,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Pick chart" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">None</SelectItem>
                                      {chartOptions.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                          {c.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Input
                                  className="h-8 text-sm font-semibold"
                                  placeholder="H2 heading"
                                  value={col.h2 || ""}
                                  onChange={(e) =>
                                    updateColumn(row.id, col.id, (c) => ({ ...c, h2: e.target.value }))
                                  }
                                />
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="Caption"
                                  value={col.caption || ""}
                                  onChange={(e) =>
                                    updateColumn(row.id, col.id, (c) => ({ ...c, caption: e.target.value }))
                                  }
                                />
                                <Input
                                  className="h-8 text-[11px] text-muted-foreground"
                                  placeholder="Microtext"
                                  value={col.microtext || ""}
                                  onChange={(e) =>
                                    updateColumn(row.id, col.id, (c) => ({ ...c, microtext: e.target.value }))
                                  }
                                />
                                <div className="grid gap-1">
                                  <Label className="text-[10px]">Link</Label>
                                  <Select
                                    value={col.link?.mode || "none"}
                                    onValueChange={(v) =>
                                      updateColumn(row.id, col.id, (c) => ({
                                        ...c,
                                        link: { mode: v, url: c.link?.url || "" },
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      <SelectItem value="chart_public">Published chart page</SelectItem>
                                      <SelectItem value="custom">Custom URL</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {col.link?.mode === "custom" && (
                                    <Input
                                      className="h-8 text-xs"
                                      placeholder="https://…"
                                      value={col.link?.url || ""}
                                      onChange={(e) =>
                                        updateColumn(row.id, col.id, (c) => ({
                                          ...c,
                                          link: { ...c.link, url: e.target.value },
                                        }))
                                      }
                                    />
                                  )}
                                </div>
                                {col.h2 ? (
                                  <h2 className="pt-1 text-base font-semibold leading-tight">{col.h2}</h2>
                                ) : null}
                                <div
                                  className="min-h-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <IsolatedChartPreview chartId={col.chart_id} />
                                </div>
                                {col.caption ? (
                                  <p className="text-xs text-muted-foreground">{col.caption}</p>
                                ) : null}
                                {col.microtext ? (
                                  <p className="text-[10px] text-muted-foreground">{col.microtext}</p>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </div>
  );
}
