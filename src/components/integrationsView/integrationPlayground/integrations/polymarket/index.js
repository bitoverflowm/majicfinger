"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  ListFilter,
  Timer,
  CheckCircle2,
  AlertCircle,
  Play,
  X,
  LayoutList,
  Zap,
  Check,
  Square,
} from "lucide-react";
import { ENDPOINTS, POLYMARKET_GROUPS, TRADES_RESPONSE_FIELDS } from "./config";

const COOLDOWN_MS = 1500;
// Fallback when no endpoint responseFields and no prior pull – use Trade schema (docs: get-trades-for-a-user-or-markets)
const DEFAULT_FIELD_OPTIONS = TRADES_RESPONSE_FIELDS;
const PROGRESS_STAGES = ["Sending request…", "Receiving data…", "Processing…", "Done"];

const Polymarket = ({ setConnectedData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [paramValues, setParamValues] = useState({});
  const [listOptions, setListOptions] = useState({}); // { paramKey: [{ value, label }] }
  const [pullListLoading, setPullListLoading] = useState({});
  const [throttleRemaining, setThrottleRemaining] = useState(0);
  const [lastRequestAt, setLastRequestAt] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [lastResultKeys, setLastResultKeys] = useState([]);

  // Countdown until next request allowed
  useEffect(() => {
    if (throttleRemaining <= 0) return;
    const t = setInterval(() => {
      setThrottleRemaining((r) => {
        const next = Math.max(0, r - 100);
        return next;
      });
    }, 100);
    return () => clearInterval(t);
  }, [throttleRemaining]);

  const buildQueryString = useCallback((query, values) => {
    const p = new URLSearchParams();
    p.set("query", query);
    const action = ENDPOINTS.find((e) => e.query === query);
    if (action?.params) {
      action.params.forEach((param) => {
        const v = values[param.key];
        if (v === undefined || v === "") {
          if (param.default !== undefined && param.default !== "") p.set(param.key, String(param.default));
          return;
        }
        p.set(param.key, String(v));
      });
    }
    const selected = values.selectedFields && typeof values.selectedFields === "object"
      ? Object.entries(values.selectedFields).filter(([, v]) => v).map(([k]) => k)
      : [];
    if (selected.length > 0) p.set("fields", selected.join(","));
    return p.toString();
  }, []);

  const fetchListForParam = useCallback(async (listQuery, listLabelKey, listValueKey, paramKey) => {
    setPullListLoading((prev) => ({ ...prev, [paramKey]: true }));
    try {
      const res = await fetch(`/api/integrations/polymarket?query=${listQuery}&limit=100`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to fetch list");
      const arr = Array.isArray(data) ? data : [data];
      const options = arr.map((item) => {
        const value = item[listValueKey] ?? item.id ?? "";
        const label = (item[listLabelKey] ?? item.title ?? item.question ?? value) + (value ? ` (${value})` : "");
        return { value: String(value), label };
      });
      setListOptions((prev) => ({ ...prev, [paramKey]: options }));
    } catch (e) {
      setError(e?.message || "Failed to load list");
    } finally {
      setPullListLoading((prev) => ({ ...prev, [paramKey]: false }));
    }
  }, []);

  const runRequest = useCallback(
    async (query, values) => {
      if (throttleRemaining > 0) return;
      setError(null);
      setLoading(true);
      setProgress(0);
      setStageIndex(0);

      const qs = buildQueryString(query, values);

      setStageIndex(1);
      setProgress(25);
      let res;
      try {
        res = await fetch(`/api/integrations/polymarket?${qs}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        setError(e?.message || "Request failed");
        setLoading(false);
        setProgress(0);
        setStageIndex(0);
        return;
      }

      setStageIndex(2);
      setProgress(60);
      let data;
      try {
        data = await res.json();
      } catch (e) {
        setError("Invalid response");
        setLoading(false);
        setProgress(0);
        setStageIndex(0);
        return;
      }

      setStageIndex(3);
      setProgress(100);
      if (!res.ok) {
        setError(data?.message || "Request failed");
        setLoading(false);
        setStageIndex(0);
        return;
      }

      const arr = Array.isArray(data) ? data : [data];
      setConnectedData(arr);
      if (!qs.includes("fields=") && arr.length > 0 && arr[0] && typeof arr[0] === "object") {
        setLastResultKeys(Object.keys(arr[0]));
      }
      setLastRequestAt(Date.now());
      setThrottleRemaining(COOLDOWN_MS);
      setLoading(false);
      setStageIndex(0);
      setSelectedAction(null);
      setParamValues({});
    },
    [buildQueryString, setConnectedData, throttleRemaining]
  );

  const openForm = (action) => {
    setSelectedAction(action);
    const initial = { selectedFields: {} };
    action.params?.forEach((p) => {
      initial[p.key] = p.default !== undefined ? String(p.default) : "";
    });
    setParamValues(initial);
    setError(null);
  };

  const propertyOptions = selectedAction?.responseFields?.length
    ? selectedAction.responseFields
    : lastResultKeys.length > 0
      ? lastResultKeys
      : DEFAULT_FIELD_OPTIONS;
  const selectedFields = (paramValues.selectedFields && typeof paramValues.selectedFields === "object")
    ? paramValues.selectedFields
    : {};
  const setSelectedField = (key, checked) => {
    setParamValues((prev) => ({
      ...prev,
      selectedFields: { ...(prev.selectedFields || {}), [key]: checked === true },
    }));
  };
  const selectAllFields = () => {
    const next = {};
    propertyOptions.forEach((k) => { next[k] = true; });
    setParamValues((prev) => ({ ...prev, selectedFields: next }));
  };
  const clearAllFields = () => {
    setParamValues((prev) => ({ ...prev, selectedFields: {} }));
  };

  const validate = (action) => {
    for (const p of action.params || []) {
      if (!p.required) continue;
      const v = paramValues[p.key];
      if (v === undefined || String(v).trim() === "") return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!selectedAction || loading || throttleRemaining > 0) return;
    if (!validate(selectedAction)) {
      setError("Please fill required fields.");
      return;
    }
    runRequest(selectedAction.query, paramValues);
  };

  const groups = Object.keys(POLYMARKET_GROUPS);
  const canSubmit = selectedAction && validate(selectedAction) && !loading && throttleRemaining <= 0;

  return (
    <div className="text-sm space-y-3 min-w-0 max-w-full overflow-hidden">
      {/* Rate throttle */}
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        {throttleRemaining > 0 ? (
          <>
            <Timer className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground text-xs">
              Next request in {(throttleRemaining / 1000).toFixed(1)}s
            </span>
            <Progress
              className="h-1.5 w-20 shrink-0"
              value={100 - (throttleRemaining / COOLDOWN_MS) * 100}
            />
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground text-xs">Ready to request</span>
          </>
        )}
      </div>

      {/* Param form when an action with params is selected */}
      {selectedAction && (
        <div className="rounded-lg border bg-card text-card-foreground p-3 space-y-3 min-w-0">
          <p className="text-muted-foreground text-xs">{selectedAction.description}</p>
          {selectedAction.params?.map((param) => (
            <div key={param.key} className="space-y-1 min-w-0">
              <Label className="text-xs">
                {param.label}
                {param.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              {param.listQuery ? (
                <div className="flex gap-2 flex-wrap items-center min-w-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs shrink-0"
                    disabled={pullListLoading[param.key]}
                    onClick={() =>
                      fetchListForParam(
                        param.listQuery,
                        param.listLabelKey,
                        param.listValueKey,
                        param.key
                      )
                    }
                  >
                    {pullListLoading[param.key] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    ) : (
                      <ListFilter className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="ml-1.5 truncate">Pull list</span>
                  </Button>
                  {listOptions[param.key]?.length > 0 ? (
                    <Select
                      value={paramValues[param.key] || ""}
                      onValueChange={(v) => setParamValues((prev) => ({ ...prev, [param.key]: v }))}
                    >
                      <SelectTrigger className="h-8 w-full max-w-[220px] text-xs min-w-0">
                        <SelectValue placeholder="Select or type below" />
                      </SelectTrigger>
                      <SelectContent>
                        {listOptions[param.key].map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs" title={opt.label}>
                            <span className="truncate block max-w-[200px]" title={opt.label}>{opt.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  <Input
                    type="text"
                    placeholder={param.hint || `Enter ${param.key}`}
                    className="h-8 text-xs placeholder:text-[10px] w-full max-w-[180px] min-w-0"
                    value={paramValues[param.key] || ""}
                    onChange={(e) => setParamValues((prev) => ({ ...prev, [param.key]: e.target.value }))}
                  />
                </div>
              ) : param.type === "number" ? (
                <Input
                  type="number"
                  placeholder={param.default !== undefined ? String(param.default) : param.key}
                  className="h-8 text-xs placeholder:text-[10px] w-full max-w-[140px] min-w-0"
                  value={paramValues[param.key] ?? (param.default !== undefined ? String(param.default) : "")}
                  onChange={(e) => setParamValues((prev) => ({ ...prev, [param.key]: e.target.value }))}
                />
              ) : param.type === "boolean" ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={paramValues[param.key] === "true"}
                    onCheckedChange={(checked) =>
                      setParamValues((prev) => ({ ...prev, [param.key]: checked ? "true" : "" }))
                    }
                  />
                  <span className="text-muted-foreground text-xs">Yes</span>
                </div>
              ) : (
                <Input
                  type="text"
                  placeholder={param.hint || (param.default !== undefined ? String(param.default) : param.key)}
                  className="h-8 text-xs placeholder:text-[10px] w-full max-w-sm min-w-0"
                  value={paramValues[param.key] ?? (param.default !== undefined ? String(param.default) : "")}
                  onChange={(e) => setParamValues((prev) => ({ ...prev, [param.key]: e.target.value }))}
                />
              )}
              {param.hint && !param.listQuery && (
                <p className="text-[10px] text-muted-foreground">{param.hint}</p>
              )}
            </div>
          ))}
          <div className="space-y-1 min-w-0">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <LayoutList className="h-3.5 w-3.5 shrink-0" />
              Properties to include (optional)
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-full justify-between text-xs min-w-0">
                  <span className="truncate">
                    {Object.keys(selectedFields).filter((k) => selectedFields[k]).length > 0
                      ? `${Object.keys(selectedFields).filter((k) => selectedFields[k]).length} selected`
                      : "All fields"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-[280px] w-56 overflow-y-auto" align="start">
                <DropdownMenuLabel className="text-xs">Choose columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => selectAllFields()}
                  checked={propertyOptions.length > 0 && propertyOptions.every((k) => selectedFields[k])}
                >
                  <Check className="h-3.5 w-3.5 mr-2" />
                  Select all
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => clearAllFields()}
                  checked={false}
                >
                  <Square className="h-3.5 w-3.5 mr-2" />
                  Clear all
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {propertyOptions.map((key) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={selectedFields[key] === true}
                    onCheckedChange={(checked) => setSelectedField(key, checked)}
                  >
                    <span className="truncate">{key}</span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex gap-2 pt-1 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={() => {
                setSelectedAction(null);
                setParamValues({});
                setError(null);
              }}
            >
              <X className="h-3.5 w-3.5 shrink-0" />
              <span className="ml-1.5">Cancel</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs shrink-0"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span className="ml-1.5">Requesting…</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 shrink-0" />
                  <span className="ml-1.5">Run request</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Request progress */}
      {loading && (
        <div className="space-y-1 min-w-0">
          <Progress value={progress} className="h-1.5 w-full" />
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            {PROGRESS_STAGES[stageIndex]}
          </p>
        </div>
      )}

      {error && (
        <p className="text-destructive text-xs flex items-center gap-1.5 min-w-0">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="truncate">{error}</span>
        </p>
      )}

      <Accordion type="single" collapsible className="w-full min-w-0">
        {groups.map((groupKey) => (
          <AccordionItem key={groupKey} value={groupKey}>
            <AccordionTrigger className="pt-1 sm:pt-3 text-sm">
              {POLYMARKET_GROUPS[groupKey]}
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-1.5 min-w-0">
                {ENDPOINTS.filter((e) => e.group === groupKey).map((action) => (
                  <button
                    key={action.query}
                    type="button"
                    className={`text-xs px-2.5 py-1.5 rounded-md border text-left truncate max-w-full transition-colors ${
                      action.broken
                        ? "bg-muted cursor-not-allowed opacity-70"
                        : "bg-background hover:bg-primary hover:text-primary-foreground cursor-pointer"
                    }`}
                    onClick={() => {
                      if (action.broken) return;
                      action.params?.length
                        ? openForm(action)
                        : runRequest(action.query, {});
                    }}
                    title={action.broken ? "Under construction" : action.description}
                  >
                    {action.name}
                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default Polymarket;
