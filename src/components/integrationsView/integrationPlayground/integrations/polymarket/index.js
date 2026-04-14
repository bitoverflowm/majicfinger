"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { format, startOfDay, isAfter, isSameDay, subDays } from "date-fns";
import moment from "moment-timezone";
import { ReplaceOrNewSheetDialog } from "@/components/dataView/replaceOrNewSheetDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  Radio,
  SquareIcon,
  LineChart,
  Search,
  CalendarIcon,
} from "lucide-react";
import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";
import { ENDPOINTS, POLYMARKET_GROUPS, TRADES_RESPONSE_FIELDS } from "./config";

const COOLDOWN_MS = 1500;
// Fallback when no endpoint responseFields and no prior pull – use Trade schema (docs: get-trades-for-a-user-or-markets)
const DEFAULT_FIELD_OPTIONS = TRADES_RESPONSE_FIELDS;
const PROGRESS_STAGES = ["Sending request…", "Receiving data…", "Processing…", "Done"];

/** Parse clobTokenIds (token IDs) from market for CLOB websocket. Preserves full ERC1155 strings. */
function parseTokenIdsFromMarket(market) {
  let ids = market?.clobTokenIds ?? market?.clob_token_ids;
  if (typeof ids === "string") {
    try {
      ids = JSON.parse(ids);
    } catch {
      ids = ids.includes(",") ? ids.split(",").map((s) => s.trim()) : [ids];
    }
  }
  return Array.isArray(ids) ? ids.filter(Boolean).map((s) => String(s).trim()) : [];
}

/** Parse condition_id from market for display/selection. Preserves full string. */
function getConditionId(market) {
  const cid = market?.conditionId ?? market?.condition_id;
  return cid ? String(cid).trim() : "";
}

/** Parse comma-separated token/condition IDs from manual input. Preserves full strings. */
function parseManualIds(input) {
  if (!input || typeof input !== "string") return [];
  return input
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseOutcomes(market) {
  let outcomes = market?.outcomes;
  if (typeof outcomes === "string") {
    try {
      outcomes = JSON.parse(outcomes);
    } catch {
      outcomes = [];
    }
  }
  return Array.isArray(outcomes) ? outcomes.map((v) => String(v)) : [];
}

function parseTimeParts(timeString, fallbackHour = 0, fallbackMinute = 0, fallbackSecond = 0) {
  if (typeof timeString !== "string" || !timeString.trim()) {
    return [fallbackHour, fallbackMinute, fallbackSecond];
  }
  const [hRaw, mRaw, sRaw] = timeString.split(":");
  const h = Number.isFinite(Number(hRaw)) ? Number(hRaw) : fallbackHour;
  const m = Number.isFinite(Number(mRaw)) ? Number(mRaw) : fallbackMinute;
  const s = Number.isFinite(Number(sRaw)) ? Number(sRaw) : fallbackSecond;
  return [h, m, s];
}

/**
 * Polymarket CLOB docs: startTs/endTs are Unix seconds (UTC epoch). Those are not "in EST" — they are absolute
 * instants. We still build the *wall clock* the user means from calendar day + time in US Eastern (DST-aware)
 * so ranges align with how US markets are usually quoted.
 */
const POLYMARKET_HISTORY_TZ = "America/New_York";

/** Calendar Y-M-D from `date` + clock from `timeString`, interpreted in POLYMARKET_HISTORY_TZ → Unix seconds string. */
function calendarWallTimeToUnixSeconds(date, timeString, fallbackHour = 0, fallbackMinute = 0, fallbackSecond = 0) {
  if (!(date instanceof Date)) return "";
  const [hour, minute, second] = parseTimeParts(timeString, fallbackHour, fallbackMinute, fallbackSecond);
  const m = moment.tz(
    [date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, second],
    POLYMARKET_HISTORY_TZ,
  );
  if (!m.isValid()) return "";
  return String(m.unix());
}

const Polymarket = ({ setConnectedData }) => {
  const contextStateV2 = useMyStateV2();
  const setViewing = contextStateV2?.setViewing;
  const setPolymarketWsState = contextStateV2?.setPolymarketWsState;
  const liveStreamState = contextStateV2?.liveStreamState;
  const liveStreamActions = contextStateV2?.liveStreamActions;
  const activeSheetId = contextStateV2?.activeSheetId;
  const replaceCurrentSheetData = contextStateV2?.replaceCurrentSheetData;
  const addNewSheetAndActivate = contextStateV2?.addNewSheetAndActivate;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [paramValues, setParamValues] = useState({});
  const [listOptions, setListOptions] = useState({}); // { paramKey: [{ value, label, marketData? }] }
  const [pullListLoading, setPullListLoading] = useState({});
  const [throttleRemaining, setThrottleRemaining] = useState(0);
  const [lastRequestAt, setLastRequestAt] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [lastResultKeys, setLastResultKeys] = useState([]);
  const [wsConnecting, setWsConnecting] = useState(false);
  const [replaceOrNewSheetOpen, setReplaceOrNewSheetOpen] = useState(false);
  const [selectedPriceHistoryMarket, setSelectedPriceHistoryMarket] = useState("");
  const [selectedPriceHistoryAssetIds, setSelectedPriceHistoryAssetIds] = useState([]);
  const [priceHistoryDateRange, setPriceHistoryDateRange] = useState(undefined);
  const [priceHistoryStartTime, setPriceHistoryStartTime] = useState("00:00:00");
  const [priceHistoryEndTime, setPriceHistoryEndTime] = useState(() => format(new Date(), "HH:mm:ss"));

  const streamsBySheetId = liveStreamState?.streamsBySheetId || {};
  const wsConnected = activeSheetId && streamsBySheetId[activeSheetId]?.type === "polymarket" && streamsBySheetId[activeSheetId]?.isRunning;
  const hasDataOrStream = (contextStateV2?.connectedData?.length > 0) || Object.values(streamsBySheetId).some((s) => s?.isRunning);
  const hasLiveConnection = Object.values(streamsBySheetId).some((s) => s?.isRunning);
  const pendingWsConfigRef = useRef(null);

  // Market search (for wsPrice market_token_id)
  const [marketSearch, setMarketSearch] = useState("");

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

  const fetchListForParam = useCallback(async (listQuery, listLabelKey, listValueKey, paramKey, listFilter) => {
    setPullListLoading((prev) => ({ ...prev, [paramKey]: true }));
    try {
      let url = `/api/integrations/polymarket?query=${listQuery}&limit=500`;
      if (listFilter && typeof listFilter === "object") {
        const sp = new URLSearchParams(listFilter);
        url += "&" + sp.toString();
      }
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to fetch list");
      let arr = Array.isArray(data) ? data : [data];
      if (paramKey === "market_token_id") {
        arr = arr.filter((m) => {
          if (m.closed === true || m.closed === "true") return false;
          const vol = m.volumeNum ?? m.volume ?? 0;
          const volNum = typeof vol === "number" ? vol : parseFloat(vol);
          if (volNum === 0 || Number.isNaN(volNum)) return false;
          return true;
        });
      }
      const options = arr.map((item) => {
        const condId = (item.conditionId ?? item.condition_id ?? "").toString().trim();
        const tokenIds = parseTokenIdsFromMarket(item);
        const requestedValue = listValueKey ? item?.[listValueKey] : undefined;
        const value = String(requestedValue ?? (condId || tokenIds[0] || item.id || "")).trim();
        const question = item[listLabelKey] ?? item.title ?? item.question ?? "";
        const slug = item.slug ? ` | slug: ${item.slug}` : "";
        const label = question + slug + (value ? ` (${value})` : "");
        const opt = { value, label };
        if (paramKey === "market_token_id" || paramKey === "market") opt.marketData = item;
        return opt;
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

  useEffect(() => {
    if (wsConnected) setWsConnecting(false);
  }, [wsConnected]);

  useEffect(() => {
    if (selectedAction?.query !== "getPricesHistory") return;
    const startTs = priceHistoryDateRange?.from
      ? calendarWallTimeToUnixSeconds(priceHistoryDateRange.from, priceHistoryStartTime, 0, 0, 0)
      : "";
    let endTs = priceHistoryDateRange?.to
      ? calendarWallTimeToUnixSeconds(priceHistoryDateRange.to, priceHistoryEndTime, 23, 59, 59)
      : "";
    if (endTs) {
      const endSec = Number(endTs);
      const nowSec = Math.floor(Date.now() / 1000);
      if (Number.isFinite(endSec) && endSec > nowSec) endTs = String(nowSec);
    }
    setParamValues((prev) => ({
      ...prev,
      startTs,
      endTs,
    }));
  }, [selectedAction?.query, priceHistoryDateRange, priceHistoryStartTime, priceHistoryEndTime]);

  /** End-of-range calendar day cannot be after today; if end is today, end time cannot be after now. */
  useEffect(() => {
    if (selectedAction?.query !== "getPricesHistory") return;
    if (!priceHistoryDateRange?.to || !isSameDay(priceHistoryDateRange.to, new Date())) return;
    const now = new Date();
    const endLocal = new Date(priceHistoryDateRange.to);
    const [h, m, s] = parseTimeParts(priceHistoryEndTime, 23, 59, 59);
    endLocal.setHours(h, m, s, 0);
    if (endLocal.getTime() > now.getTime()) {
      setPriceHistoryEndTime(format(now, "HH:mm:ss"));
    }
  }, [selectedAction?.query, priceHistoryDateRange?.to, priceHistoryEndTime]);

  const openForm = (action) => {
    setSelectedAction(action);
    setMarketSearch("");
    const initial = { selectedFields: {} };
    action.params?.forEach((p) => {
      initial[p.key] = p.default !== undefined ? String(p.default) : "";
    });
    setParamValues(initial);
    setSelectedPriceHistoryMarket("");
    setSelectedPriceHistoryAssetIds([]);
    if (action.query === "getPricesHistory") {
      const now = new Date();
      const todayStart = startOfDay(now);
      setPriceHistoryDateRange({
        from: subDays(todayStart, 7),
        to: todayStart,
      });
      setPriceHistoryStartTime("00:00:00");
      setPriceHistoryEndTime(format(now, "HH:mm:ss"));
    } else {
      setPriceHistoryDateRange(undefined);
      setPriceHistoryStartTime("00:00:00");
      setPriceHistoryEndTime("23:59:59");
    }
    setError(null);
  };

  const onPriceHistoryRangeSelect = useCallback((range) => {
    setPriceHistoryDateRange(range);
    const to = range?.to;
    if (to && isSameDay(to, new Date())) {
      const now = new Date();
      const day = startOfDay(to);
      const [h, m, s] = parseTimeParts(priceHistoryEndTime, 23, 59, 59);
      const candidate = new Date(day);
      candidate.setHours(h, m, s, 0);
      if (candidate.getTime() > now.getTime()) setPriceHistoryEndTime(format(now, "HH:mm:ss"));
    }
  }, [priceHistoryEndTime]);

  const priceHistoryEndTimeMax = useMemo(() => {
    if (!priceHistoryDateRange?.to || !isSameDay(priceHistoryDateRange.to, new Date())) {
      return "23:59:59";
    }
    return format(new Date(), "HH:mm:ss");
  }, [priceHistoryDateRange?.to]);

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

  const canConnectWs = useCallback(() => {
    const raw = paramValues.market_token_id;
    if (!raw || typeof raw !== "string" || !raw.trim()) return false;
    const ids = parseManualIds(raw);
    if (ids.length > 0) return true;
    const opts = listOptions.market_token_id || [];
    const opt = opts.find((o) => o.value === raw.trim());
    return !!opt?.marketData;
  }, [paramValues.market_token_id, listOptions.market_token_id]);

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
  const selectedPriceHistoryMarketData = (listOptions.market || []).find((o) => o.value === selectedPriceHistoryMarket)?.marketData;
  const selectedPriceHistoryOutcomes = selectedPriceHistoryMarketData
    ? parseOutcomes(selectedPriceHistoryMarketData).map((outcome, idx) => ({
        outcome,
        assetId: parseTokenIdsFromMarket(selectedPriceHistoryMarketData)[idx] || "",
      })).filter((x) => x.assetId)
    : [];

  return (
    <div className="text-sm space-y-3 min-w-0 max-w-full overflow-hidden">
      <ReplaceOrNewSheetDialog
        open={replaceOrNewSheetOpen}
        onOpenChange={setReplaceOrNewSheetOpen}
        hasLiveConnection={hasLiveConnection}
        onReplace={() => {
          liveStreamActions?.stop?.(activeSheetId);
          replaceCurrentSheetData?.([]);
          liveStreamActions?.start?.(activeSheetId, "polymarket", pendingWsConfigRef.current);
          setWsConnecting(true);
        }}
        onAddNewSheet={() => {
          addNewSheetAndActivate?.((newId) => {
            liveStreamActions?.start?.(newId, "polymarket", pendingWsConfigRef.current);
            setWsConnecting(true);
          });
        }}
      />
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
              {selectedAction?.query === "getPricesHistory" && param.key === "endTs" ? null : (
                <>
              <Label className="text-xs">
                {param.label}
                {param.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              {param.listQuery ? (
                <div className="flex flex-col gap-2 min-w-0">
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
                          param.key,
                          param.listFilter
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
                    {listOptions[param.key]?.length > 0 && (param.key === "market_token_id" || (selectedAction?.query === "getPricesHistory" && param.key === "market")) ? (
                      <div className="relative flex-1 min-w-[140px] max-w-[220px]">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search market by question or slug"
                          className="h-8 pl-8 text-xs placeholder:text-[10px] w-full"
                          value={marketSearch}
                          onChange={(e) => setMarketSearch(e.target.value)}
                        />
                      </div>
                    ) : null}
                  </div>
                  {listOptions[param.key]?.length > 0 ? (
                    <Select
                      value={param.key === "market" && selectedAction?.query === "getPricesHistory"
                        ? selectedPriceHistoryMarket
                        : (paramValues[param.key] || "")}
                      onValueChange={(v) => {
                        if (param.key === "market" && selectedAction?.query === "getPricesHistory") {
                          setSelectedPriceHistoryMarket(v);
                          setSelectedPriceHistoryAssetIds([]);
                          setParamValues((prev) => ({ ...prev, [param.key]: "" }));
                          return;
                        }
                        setParamValues((prev) => ({ ...prev, [param.key]: v }));
                      }}
                    >
                      <SelectTrigger className="h-8 w-full max-w-full min-w-0 font-mono text-[11px] leading-snug [&_span]:text-[11px]">
                        <SelectValue placeholder="Select market or enter token ID below" />
                      </SelectTrigger>
                      <SelectContent className="text-[11px] leading-snug max-h-[min(320px,70vh)]">
                        {((param.key === "market_token_id" || (selectedAction?.query === "getPricesHistory" && param.key === "market")) && marketSearch
                          ? listOptions[param.key].filter((opt) =>
                              (opt.marketData?.question ?? opt.label ?? "")
                                .toLowerCase()
                                .includes(marketSearch.toLowerCase())
                            )
                          : listOptions[param.key]
                        ).map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="py-1.5 text-[11px] leading-snug font-mono"
                            title={opt.value}
                          >
                            <span className="block max-w-[280px] truncate" title={opt.label}>{opt.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  <Input
                    type="text"
                    placeholder={param.hint || `Enter token/condition ID(s), comma-separated`}
                    className="h-8 text-xs placeholder:text-[10px] w-full font-mono min-w-0"
                    value={paramValues[param.key] || ""}
                    onChange={(e) => setParamValues((prev) => ({ ...prev, [param.key]: e.target.value }))}
                  />
                  {selectedAction?.query === "getPricesHistory" && param.key === "market" && selectedPriceHistoryOutcomes.length > 0 ? (
                    <div className="rounded-md border p-2 space-y-1.5">
                      <p className="text-[10px] text-muted-foreground">Select outcome asset IDs (yes/no or buy/sell). Selecting updates the market field automatically.</p>
                      <div className="space-y-1">
                        {selectedPriceHistoryOutcomes.map((item) => {
                          const checked = selectedPriceHistoryAssetIds.includes(item.assetId);
                          return (
                            <label key={item.assetId} className="flex items-center gap-2 text-xs">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(nextChecked) => {
                                  const normalized = nextChecked === true;
                                  setSelectedPriceHistoryAssetIds((prev) => {
                                    const next = normalized ? [...prev, item.assetId] : prev.filter((id) => id !== item.assetId);
                                    setParamValues((curr) => ({ ...curr, market: next.join(",") }));
                                    return next;
                                  });
                                }}
                              />
                              <span className="truncate">{item.outcome}: <span className="font-mono">{item.assetId}</span></span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : param.type === "select" ? (
                <Select
                  value={paramValues[param.key] ?? (param.default !== undefined ? String(param.default) : "")}
                  onValueChange={(v) => setParamValues((prev) => ({ ...prev, [param.key]: v }))}
                >
                  <SelectTrigger className="h-8 w-full max-w-[180px] min-w-0 text-[11px] leading-snug [&_span]:text-[11px]">
                    <SelectValue placeholder={param.hint || "Select option"} />
                  </SelectTrigger>
                  <SelectContent className="text-[11px] leading-snug">
                    {(Array.isArray(param.options) ? param.options : []).map((opt) => (
                      <SelectItem key={String(opt)} value={String(opt)} className="py-1.5 text-[11px] leading-snug">
                        {String(opt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : param.type === "number" ? (
                selectedAction?.query === "getPricesHistory" && param.key === "startTs" ? (
                  <div className="space-y-2 rounded-md border p-2 bg-background/40">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "h-8 w-full justify-start px-2.5 text-xs font-normal",
                            !priceHistoryDateRange?.from && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                          {priceHistoryDateRange?.from ? (
                            priceHistoryDateRange?.to ? (
                              <>
                                {format(priceHistoryDateRange.from, "LLL dd, y")} - {format(priceHistoryDateRange.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(priceHistoryDateRange.from, "LLL dd, y")
                            )
                          ) : (
                            <span className="text-[11px] leading-snug">Pick date range (US Eastern dates)</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={priceHistoryDateRange}
                          onSelect={onPriceHistoryRangeSelect}
                          numberOfMonths={2}
                          defaultMonth={priceHistoryDateRange?.from}
                          disabled={(date) => isAfter(startOfDay(date), startOfDay(new Date()))}
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Start time (US Eastern)</Label>
                        <Input
                          type="time"
                          step="1"
                          className="h-8 text-xs"
                          value={priceHistoryStartTime}
                          onChange={(e) => setPriceHistoryStartTime(e.target.value)}
                        />
                      </div>
                                           <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">End time (US Eastern)</Label>
                        <Input
                          type="time"
                          step="1"
                          max={priceHistoryEndTimeMax}
                          className="h-8 text-xs"
                          value={priceHistoryEndTime}
                          onChange={(e) => setPriceHistoryEndTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Dates and times are combined in <span className="font-medium">America/New_York</span> (US Eastern,
                      DST-aware), then sent as Unix seconds — Polymarket&apos;s API uses UTC epoch seconds (not a
                      separate &quot;EST Unix&quot;). End cannot be after now (UTC).
                    </p>
                  </div>
                ) : (
                <Input
                  type="number"
                  placeholder={param.default !== undefined ? String(param.default) : param.key}
                  className="h-8 text-xs placeholder:text-[10px] w-full max-w-[140px] min-w-0"
                  value={paramValues[param.key] ?? (param.default !== undefined ? String(param.default) : "")}
                  onChange={(e) => setParamValues((prev) => ({ ...prev, [param.key]: e.target.value }))}
                />
                )
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
                </>
              )}
            </div>
          ))}
          {!selectedAction?.wsType && (
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
          )}
          <div className="flex gap-2 pt-1 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={() => {
                if (selectedAction?.wsType && wsConnected) liveStreamActions?.stop?.(activeSheetId);
                setSelectedAction(null);
                setParamValues({});
                setError(null);
              }}
            >
              <X className="h-3.5 w-3.5 shrink-0" />
              <span className="ml-1.5">Cancel</span>
            </Button>
            {selectedAction?.wsType ? (
              <>
                {wsConnected ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs shrink-0"
                    onClick={() => liveStreamActions?.stop?.(activeSheetId)}
                  >
                    <SquareIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="ml-1.5">Stop feed</span>
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 text-xs shrink-0"
                    disabled={!canConnectWs() || wsConnecting || !activeSheetId}
                    onClick={() => {
                      const raw = String(paramValues.market_token_id || "").trim();
                      const opts = listOptions.market_token_id || [];
                      const opt = opts.find((o) => o.value === raw);
                      let assetIds = [];
                      if (opt?.marketData) {
                        assetIds = parseTokenIdsFromMarket(opt.marketData);
                        if (!assetIds.length) {
                          const cid = getConditionId(opt.marketData);
                          if (cid) assetIds = [cid];
                        }
                      } else {
                        assetIds = parseManualIds(raw);
                      }
                      if (!assetIds.length) {
                        setError("Enter a valid token/condition ID or select a market.");
                        return;
                      }
                      let desiredEventType = "price_change";
                      switch (selectedAction?.query) {
                        case "wsLastTradePrice":
                          desiredEventType = "last_trade_price";
                          break;
                        case "wsOrderbookSnapshot":
                          desiredEventType = "book";
                          break;
                        case "wsTickSizeChange":
                          desiredEventType = "tick_size_change";
                          break;
                        case "wsBestBidAsk":
                          desiredEventType = "best_bid_ask";
                          break;
                        case "wsNewMarket":
                          desiredEventType = "new_market";
                          break;
                        case "wsMarketResolved":
                          desiredEventType = "market_resolved";
                          break;
                        default:
                          desiredEventType = "price_change";
                      }
                      setError(null);
                      const config = { assetIds, eventType: desiredEventType };
                      pendingWsConfigRef.current = config;
                      if (hasDataOrStream) {
                        setReplaceOrNewSheetOpen(true);
                      } else {
                        setWsConnecting(true);
                        liveStreamActions?.start?.(activeSheetId, "polymarket", config);
                      }
                    }}
                  >
                    {wsConnecting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                        <span className="ml-1.5">Connecting…</span>
                      </>
                    ) : (
                      <>
                        <Radio className="h-3.5 w-3.5 shrink-0" />
                        <span className="ml-1.5">Connect</span>
                      </>
                    )}
                  </Button>
                )}
                {wsConnected && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs shrink-0"
                    onClick={() => {
                      setPolymarketWsState?.((prev) => ({
                        ...prev,
                        chartPreset: { type: "line", xKey: "time", yKey: "price" },
                      }));
                      contextStateV2?.setIntegrationSidebar?.("polymarket");
                      setViewing?.("charts");
                    }}
                  >
                    <LineChart className="h-3.5 w-3.5 shrink-0" />
                    <span className="ml-1.5">Chart</span>
                  </Button>
                )}
              </>
            ) : (
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
            )}
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
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-destructive text-xs flex items-center gap-1.5 min-w-0 cursor-help">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">{error}</span>
              </p>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm whitespace-pre-wrap text-xs">
              {error}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
