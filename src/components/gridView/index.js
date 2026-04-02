import { useEffect, useMemo, useState, useCallback } from "react";

import { useMyStateV2  } from '@/context/stateContextV2'

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme


import { PlusIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"

import { Menu } from './menu'

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { SummarizeDrawer } from "@/components/summarizationView";
import {
  ArrowDownFromLine,
  ArrowUpFromLine,
  TrafficCone,
  Filter,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  X,
  Download,
  BarChart2,
  Sigma,
  ChevronDown,
  Database,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConnectProgressWithLabel } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/ConnectProgressWithLabel";
import { ATHENA_SAMPLE_ROW_LIMIT } from "@/config/dataLakeParquetSamples";
import { athenaRowsToObjects } from "@/lib/duckdb/duckdbWasmClient";
import * as XLSX from 'xlsx';


const DATE_LIKE = /^\d{4}-\d{2}-\d{2}/;
// Labels produced by the Athena compose "dateBucket" formatter.
// Examples: "Q1 '24", "2024-03", "2024"
const QUARTER_LIKE = /^Q([1-4])\s*'?\s*(\d{2})$/i;
const MONTH_LIKE = /^(\d{4})-(\d{2})$/;
const YEAR_LIKE = /^(\d{4})$/;

function dateBucketToSortKey(val) {
  if (val == null) return null;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val !== "string") return null;
  const s = val.trim();
  if (DATE_LIKE.test(s)) return new Date(s).getTime();

  const q = s.match(QUARTER_LIKE);
  if (q) {
    const quarter = Number(q[1]);
    const yy = Number(q[2]);
    const year = yy >= 70 ? 1900 + yy : 2000 + yy; // 2-digit year heuristic
    const monthIndex = (quarter - 1) * 3; // Jan/Apr/Jul/Oct
    return Date.UTC(year, monthIndex, 1);
  }

  const m = s.match(MONTH_LIKE);
  if (m) {
    const year = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    return Date.UTC(year, monthIndex, 1);
  }

  const y = s.match(YEAR_LIKE);
  if (y) {
    const year = Number(y[1]);
    return Date.UTC(year, 0, 1);
  }

  return null;
}
const TOKEN_ID_FIELDS = new Set(['conditionid', 'condition_id', 'clobtokenids', 'clob_token_ids', 'asset_id', 'market', 'market_id']);

function getColKeys(connectedCols) {
  return (connectedCols || []).map((c) => (c && typeof c === 'object' && 'field' in c ? c.field : c)).filter(Boolean);
}

const GridView = ({startNew}) => {

    const contextStateV2 = useMyStateV2()

    let connectedCols = contextStateV2?.connectedCols || []
    let setConnectedCols = contextStateV2?.setConnectedCols || []
    let connectedData = contextStateV2?.connectedData || []
    let setConnectedData = contextStateV2?.setConnectedData || []
    const replaceCurrentSheetData = contextStateV2?.replaceCurrentSheetData
    const addNewSheetAndActivate = contextStateV2?.addNewSheetAndActivate
    const setSheetData = contextStateV2?.setSheetData
    const setDataSheets = contextStateV2?.setDataSheets
    const dataTypes = contextStateV2?.dataTypes || {}
    let dataSheets = contextStateV2?.dataSheets || {}
    const activeSheetId = contextStateV2?.activeSheetId
    
    const [columnName, setColumnName] = useState('');
    const [colAddOpen, setColAddOpen] = useState()
    const [gridExpanded, setGridExpanded] = useState()

    const [summarizeOpen, setSummarizeOpen] = useState(false);
    const [mathDialogOpen, setMathDialogOpen] = useState(false);
    const [mathOp, setMathOp] = useState("add");
    const [mathColA, setMathColA] = useState("");
    const [mathColB, setMathColB] = useState("");
    const [mathOutCol, setMathOutCol] = useState("result");

    // Combine Sheets (client-side join across already-loaded sheets)
    const [combineSheetsDialogOpen, setCombineSheetsDialogOpen] = useState(false);
    const [combineJoinType, setCombineJoinType] = useState("inner"); // inner | left | right | full | cross
    const [combineLeftSheetId, setCombineLeftSheetId] = useState(null);
    const [combineRightSheetId, setCombineRightSheetId] = useState(null);
    const [combineLeftKeyCol, setCombineLeftKeyCol] = useState("");
    const [combineRightKeyCol, setCombineRightKeyCol] = useState("");
    const [combineMergeMode, setCombineMergeMode] = useState("browser"); // browser | athena
    const [combineBusy, setCombineBusy] = useState(false);
    const [combineProgress, setCombineProgress] = useState(0);
    const [combineProgressLabel, setCombineProgressLabel] = useState("");

    // Remove duplicates (row-level)
    const [removeDupsDialogOpen, setRemoveDupsDialogOpen] = useState(false);
    const [sheetPropsDialogOpen, setSheetPropsDialogOpen] = useState(false);

    /** Refine / filter current sheet (preview) or re-query full lake via provenance CTE (Athena). */
    const [refineQueryOpen, setRefineQueryOpen] = useState(false);
    const [refineScope, setRefineScope] = useState("preview"); // preview | athena
    const [refineDestination, setRefineDestination] = useState("replace"); // replace | new_sheet
    const [refineSelectedCols, setRefineSelectedCols] = useState(() => new Set());
    const [refineWhereCol, setRefineWhereCol] = useState("");
    const [refineWhereOp, setRefineWhereOp] = useState("gte");
    const [refineWhereVal, setRefineWhereVal] = useState("");
    const [refineBusy, setRefineBusy] = useState(false);
    const [refineProgress, setRefineProgress] = useState(0);
    const [refineProgressLabel, setRefineProgressLabel] = useState("");

    const sheetColumnsForProps = useMemo(() => {
      const row0 = Array.isArray(connectedData) && connectedData.length ? connectedData[0] : null;
      if (!row0 || typeof row0 !== "object") return [];
      return Object.keys(row0)
        .filter((k) => k !== "_origIndex")
        .sort();
    }, [connectedData]);
    const [filterState, setFilterState] = useState({
      dateColumn: null,
      dateFrom: '',
      dateTo: '',
      sortKey: null,
      sortDir: 'asc',
      categoryFilters: {},
    });

    const colKeys = useMemo(() => getColKeys(connectedCols), [connectedCols]);

    const sheetColumnNamesForMath = useMemo(() => {
      const row = Array.isArray(connectedData) && connectedData.length ? connectedData[0] : null;
      if (!row || typeof row !== "object") return [];
      return Object.keys(row)
        .filter((k) => k !== "_origIndex")
        .sort();
    }, [connectedData]);

    const applySheetMathOperation = useCallback(() => {
      const rows = Array.isArray(connectedData) ? [...connectedData] : [];
      if (!rows.length) {
        toast.error("Load sheet data before running a column calculation.");
        return;
      }
      const a = String(mathColA || "").trim();
      const b = String(mathColB || "").trim();
      const out = String(mathOutCol || "").trim();
      if (!a || !b || !out) {
        toast.error("Choose two columns and an output column name.");
        return;
      }
      const next = rows.map((row) => {
        if (!row || typeof row !== "object") return row;
        const x = Number(row[a]);
        const y = Number(row[b]);
        let v = NaN;
        if (mathOp === "add") v = x + y;
        else if (mathOp === "subtract") v = x - y;
        else if (mathOp === "multiply") v = x * y;
        else if (mathOp === "divide") v = y === 0 ? NaN : x / y;
        return { ...row, [out]: Number.isFinite(v) ? v : null };
      });
      replaceCurrentSheetData?.(next);
      setConnectedData?.(next);
      toast.success("Applied calculation to sheet.");
      setMathDialogOpen(false);
    }, [connectedData, mathColA, mathColB, mathOp, mathOutCol, replaceCurrentSheetData, setConnectedData]);

    const collectColumnNames = (rows) => {
      const set = new Set();
      for (const r of Array.isArray(rows) ? rows : []) {
        if (!r || typeof r !== "object") continue;
        for (const k of Object.keys(r)) {
          if (k === "_origIndex") continue;
          set.add(k);
        }
      }
      return Array.from(set).sort();
    };

    const stableStringify = (v) => {
      if (v === null) return "null";
      if (v === undefined) return "undefined";
      const t = typeof v;
      if (t === "number") return Number.isFinite(v) ? String(v) : "NaN";
      if (t === "string" || t === "boolean") return String(v);
      if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
      if (t === "object") {
        const keys = Object.keys(v).sort();
        return `{${keys.map((k) => `${k}:${stableStringify(v[k])}`).join(",")}}`;
      }
      return String(v);
    };

    const applyCombineSheets = useCallback(async () => {
      const leftSheet = combineLeftSheetId ? dataSheets?.[combineLeftSheetId] : null;
      const rightSheet = combineRightSheetId ? dataSheets?.[combineRightSheetId] : null;
      const leftData = leftSheet?.data;
      const rightData = rightSheet?.data;

      if (!leftSheet || !rightSheet) {
        toast.error("Pick two sheets to combine.");
        return;
      }
      if (!Array.isArray(leftData) || leftData.length === 0 || !Array.isArray(rightData) || rightData.length === 0) {
        toast.error("Both selected sheets must have loaded data.");
        return;
      }
      if (combineLeftSheetId === combineRightSheetId) {
        toast.error("Left and right sheets must be different.");
        return;
      }

      const joinType = combineJoinType;
      const leftCols = collectColumnNames(leftData);
      const rightCols = collectColumnNames(rightData);

      if (leftCols.length === 0 || rightCols.length === 0) {
        toast.error("Could not infer columns for one of the sheets.");
        return;
      }

      const leftKeyCol = String(combineLeftKeyCol || "").trim();
      const rightKeyCol = String(combineRightKeyCol || "").trim();

      if (joinType !== "cross") {
        if (!leftKeyCol || !rightKeyCol) {
          toast.error("Select join keys for both sheets (or use Cross join).");
          return;
        }
        if (!leftCols.includes(leftKeyCol) || !rightCols.includes(rightKeyCol)) {
          toast.error("Selected join keys must exist on each sheet.");
          return;
        }
      }

      if (combineMergeMode === "athena") {
        if (joinType === "cross") {
          toast.error("Full dataset does not support cross join. Choose “Loaded sheets only” or use Inner/Left.");
          return;
        }
        if (joinType !== "inner" && joinType !== "left") {
          toast.error(
            "Full dataset supports Inner and Left only. Choose “Loaded sheets only” for Right/Full, or change join type.",
          );
          return;
        }
        const leftProv = leftSheet?.provenance;
        const rightProv = rightSheet?.provenance;
        if (!leftProv || !rightProv || leftProv.kind !== "compose" || rightProv.kind !== "compose") {
          toast.error("Full dataset combine needs both sheets built from Data Lake pulls (saved compose provenance).");
          return;
        }
        if (String(leftProv.lake || "") !== String(rightProv.lake || "")) {
          toast.error("Sheets must be from the same lake for full dataset combine.");
          return;
        }
        if (!addNewSheetAndActivate || !setSheetData) {
          toast.error("Sheet actions are unavailable.");
          return;
        }

        const joinTypeApi = joinType === "left" ? "left" : "inner";

        const cteSafeName = (name, id) => {
          let t = String(name || id || "sheet").replace(/[^a-zA-Z0-9_]+/g, "_");
          if (/^[0-9]/.test(t)) t = `s_${t}`;
          const u = t.slice(0, 60);
          return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(u) ? u : `sheet_${String(id).replace(/\W/g, "")}`.slice(0, 60);
        };

        const sheetGraph = {};
        const walk = (id) => {
          if (sheetGraph[id]) return;
          const s = dataSheets[id];
          const prov = s?.provenance;
          if (!s || !prov || prov.kind !== "compose") return;
          sheetGraph[id] = { name: cteSafeName(s.name, id), provenance: prov };
          for (const d of prov.serverSheetJoins || []) {
            if (d?.targetSheetId && dataSheets[d.targetSheetId]) walk(d.targetSheetId);
          }
        };
        walk(combineLeftSheetId);
        walk(combineRightSheetId);

        if (!sheetGraph[combineLeftSheetId] || !sheetGraph[combineRightSheetId]) {
          toast.error("Could not build a CTE graph for the selected sheets.");
          return;
        }

        setCombineBusy(true);
        let tick = null;
        try {
          setCombineProgressLabel("Submitting join to Athena…");
          setCombineProgress(10);
          tick = setInterval(() => {
            setCombineProgress((p) => Math.min(p + 2, 92));
          }, 500);

          const res = await fetch("/api/data-lake/join-sheets-cte", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              lake: leftProv.lake,
              table: leftProv.table,
              compose: leftProv.composeSpec,
              filters: leftProv.composeFilters || null,
              joins: [
                {
                  targetSheetId: combineRightSheetId,
                  joinType: joinTypeApi,
                  leftColumn: leftKeyCol,
                  rightColumn: rightKeyCol,
                },
              ],
              sheetGraph,
            }),
          });
          const j = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(j.error || res.statusText || "Join failed");

          if (tick) clearInterval(tick);
          tick = null;
          setCombineProgressLabel("Mapping results…");
          setCombineProgress(96);

          const rawRows = Array.isArray(j.rows) ? j.rows : [];
          const colNames = Array.isArray(j.columns) ? j.columns : [];
          const outRows = athenaRowsToObjects(colNames, rawRows).slice(0, ATHENA_SAMPLE_ROW_LIMIT);

          const newProv = {
            kind: "compose",
            lake: leftProv.lake,
            table: leftProv.table,
            composeSpec: leftProv.composeSpec,
            composeFilters: leftProv.composeFilters || null,
            serverSheetJoins: [
              ...(Array.isArray(leftProv.serverSheetJoins) ? leftProv.serverSheetJoins : []),
              {
                targetSheetId: combineRightSheetId,
                joinType: joinTypeApi,
                leftColumn: leftKeyCol,
                rightColumn: rightKeyCol,
              },
            ],
            browserSheetJoins: [],
          };

          addNewSheetAndActivate((newId) => {
            setSheetData(newId, outRows);
            setDataSheets?.((prev) => {
              const p = prev || {};
              const sheet = p[newId];
              if (!sheet) return prev;
              return {
                ...p,
                [newId]: {
                  ...sheet,
                  name: `Combine · ${String(leftSheet?.name || combineLeftSheetId)} ⟕ ${String(rightSheet?.name || combineRightSheetId)}`.slice(
                    0,
                    80,
                  ),
                  provenance: newProv,
                },
              };
            });
          });

          setCombineProgress(100);
          setCombineProgressLabel("Done");
          toast.success(`Combined on Athena into a new sheet (up to ${ATHENA_SAMPLE_ROW_LIMIT} rows).`);
          setCombineSheetsDialogOpen(false);
        } catch (e) {
          toast.error(e?.message || "Full dataset combine failed.");
        } finally {
          if (tick) clearInterval(tick);
          setCombineBusy(false);
          setCombineProgress(0);
          setCombineProgressLabel("");
        }
        return;
      }

      try {
        const rightSuffixRaw = rightSheet?.name || combineRightSheetId || "right";
        const rightSuffix = String(rightSuffixRaw).replace(/[^a-zA-Z0-9_]/g, "_") || "right";

        const getRightOutKey = (col) => {
          return leftCols.includes(col) ? `${col}__${rightSuffix}` : col;
        };

        const outRows = [];

        if (joinType === "cross") {
          const rightOutKeys = rightCols.map((c) => getRightOutKey(c));
          for (const l of leftData) {
            const outBase = {};
            for (const lc of leftCols) outBase[lc] = l?.[lc] ?? null;

            for (const r of rightData) {
              const row = { ...outBase };
              for (let i = 0; i < rightCols.length; i++) {
                const rc = rightCols[i];
                row[rightOutKeys[i]] = r?.[rc] ?? null;
              }
              outRows.push(row);
            }
          }
        } else {
          const rightKeyIndex = new Map();
          for (let i = 0; i < rightData.length; i++) {
            const r = rightData[i];
            const v = r?.[rightKeyCol];
            const keyStr = v === null || v === undefined ? "NULL" : typeof v === "object" ? JSON.stringify(v) : String(v);
            if (!rightKeyIndex.has(keyStr)) rightKeyIndex.set(keyStr, []);
            rightKeyIndex.get(keyStr).push({ idx: i, row: r });
          }

          const rightMatchedIdxs = new Set();

          const rightAddedCols = rightCols.filter((c) => c !== rightKeyCol);
          const rightAddedOutKeys = rightAddedCols.map((c) => getRightOutKey(c));

          const leftKeyOutCol = leftKeyCol;

          const buildLeftBase = (l) => {
            const out = {};
            for (const lc of leftCols) out[lc] = l?.[lc] ?? null;
            return out;
          };

          const buildLeftNullBaseForKey = (rightRow) => {
            const out = {};
            for (const lc of leftCols) out[lc] = null;
            out[leftKeyOutCol] = rightRow?.[rightKeyCol] ?? null;
            return out;
          };

          for (const l of leftData) {
            const lKeyVal = l?.[leftKeyCol];
            const lKeyStr =
              lKeyVal === null || lKeyVal === undefined ? "NULL" : typeof lKeyVal === "object" ? JSON.stringify(lKeyVal) : String(lKeyVal);
            const matches = rightKeyIndex.get(lKeyStr) || [];

            if (matches.length > 0) {
              for (const m of matches) {
                rightMatchedIdxs.add(m.idx);
                const row = buildLeftBase(l);
                for (let i = 0; i < rightAddedCols.length; i++) {
                  row[rightAddedOutKeys[i]] = m.row?.[rightAddedCols[i]] ?? null;
                }
                outRows.push(row);
              }
            } else if (joinType === "left" || joinType === "full") {
              const row = buildLeftBase(l);
              for (let i = 0; i < rightAddedOutKeys.length; i++) row[rightAddedOutKeys[i]] = null;
              outRows.push(row);
            }
          }

          if (joinType === "right" || joinType === "full") {
            for (let i = 0; i < rightData.length; i++) {
              if (rightMatchedIdxs.has(i)) continue;
              const r = rightData[i];
              const row = buildLeftNullBaseForKey(r);
              for (let j = 0; j < rightAddedCols.length; j++) row[rightAddedOutKeys[j]] = r?.[rightAddedCols[j]] ?? null;
              outRows.push(row);
            }
          }
        }

        if (!outRows.length) {
          toast.error("Join produced no rows.");
          return;
        }

        replaceCurrentSheetData?.(outRows);
        setConnectedData?.(outRows);
        toast.success("Sheets combined in the grid (loaded rows only).");
        setCombineSheetsDialogOpen(false);
      } catch (e) {
        toast.error("Combine failed.");
      }
    }, [
      addNewSheetAndActivate,
      combineJoinType,
      combineLeftKeyCol,
      combineLeftSheetId,
      combineMergeMode,
      combineRightKeyCol,
      combineRightSheetId,
      dataSheets,
      replaceCurrentSheetData,
      setConnectedData,
      setDataSheets,
      setSheetData,
    ]);

    const applyRemoveDuplicates = useCallback(() => {
      try {
        const rows = Array.isArray(connectedData) ? [...connectedData] : [];
        if (!rows.length) {
          toast.error("Load sheet data before removing duplicates.");
          return;
        }

        // Row-level dedupe (JSON-stable signature). Extendable later to dedupe on selected columns.
        const cols = collectColumnNames(rows);
        const seen = new Set();
        const unique = [];

        for (const r of rows) {
          const sig = cols.map((c) => `${c}:${stableStringify(r?.[c])}`).join("|");
          if (seen.has(sig)) continue;
          seen.add(sig);
          unique.push(r);
        }

        replaceCurrentSheetData?.(unique);
        setConnectedData?.(unique);
        toast.success("Duplicates removed.");
        setRemoveDupsDialogOpen(false);
      } catch (e) {
        toast.error("Failed to remove duplicates.");
      }
    }, [connectedData, replaceCurrentSheetData, setConnectedData]);

    useEffect(() => {
      if (!refineQueryOpen) return;
      const cols = sheetColumnsForProps;
      setRefineSelectedCols(new Set(cols));
      setRefineWhereCol(cols[0] || "");
      setRefineWhereVal("");
    }, [refineQueryOpen, sheetColumnsForProps]);

    const applyRefineQuery = useCallback(async () => {
      const cols = Array.from(refineSelectedCols).filter(Boolean);
      if (!cols.length) {
        toast.error("Select at least one column.");
        return;
      }
      const rows = Array.isArray(connectedData) ? connectedData : [];
      if (!rows.length) {
        toast.error("Load sheet data first.");
        return;
      }

      if (refineScope === "preview") {
        let out = rows;
        const wCol = String(refineWhereCol || "").trim();
        const wVal = Number(refineWhereVal);
        if (wCol && Number.isFinite(wVal)) {
          const op = refineWhereOp;
          out = out.filter((r) => {
            const raw = r?.[wCol];
            const n = typeof raw === "number" ? raw : Number(raw);
            if (!Number.isFinite(n)) return false;
            if (op === "gte") return n >= wVal;
            if (op === "lte") return n <= wVal;
            if (op === "gt") return n > wVal;
            if (op === "lt") return n < wVal;
            if (op === "eq") return n === wVal;
            if (op === "neq") return n !== wVal;
            return true;
          });
        }
        const projected = out.map((r) => {
          const o = {};
          for (const c of cols) {
            if (r && typeof r === "object" && c in r) o[c] = r[c];
          }
          return o;
        });
        if (refineDestination === "new_sheet") {
          if (!addNewSheetAndActivate || !setSheetData) {
            toast.error("Sheet actions are unavailable.");
            return;
          }
          const baseSheet = dataSheets[activeSheetId];
          addNewSheetAndActivate((newId) => {
            setSheetData(newId, projected);
            setDataSheets?.((prev) => {
              const p = prev || {};
              const sh = p[newId];
              if (!sh) return prev;
              return {
                ...p,
                [newId]: {
                  ...sh,
                  name: `Refined · ${String(baseSheet?.name || activeSheetId)}`.slice(0, 80),
                  provenance: baseSheet?.provenance ?? null,
                },
              };
            });
          });
          toast.success(`Created new sheet (${projected.length} rows).`);
        } else {
          replaceCurrentSheetData?.(projected);
          setConnectedData?.(projected);
          toast.success(`Updated sheet (${projected.length} rows).`);
        }
        setRefineQueryOpen(false);
        return;
      }

      if (!activeSheetId) {
        toast.error("Missing active sheet.");
        return;
      }
      const sheet = dataSheets[activeSheetId];
      const prov = sheet?.provenance;
      if (!prov || prov.kind !== "compose") {
        toast.error("Full-dataset refine needs a sheet created from a Data Lake pull (saved provenance).");
        return;
      }

      function cteSafeName(name, id) {
        let t = String(name || id || "sheet").replace(/[^a-zA-Z0-9_]+/g, "_");
        if (/^[0-9]/.test(t)) t = `s_${t}`;
        const u = t.slice(0, 60);
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(u) ? u : `sheet_${String(id).replace(/\W/g, "")}`.slice(0, 60);
      }

      const graph = {};
      const walk = (id) => {
        if (graph[id]) return;
        const s = dataSheets[id];
        if (!s?.provenance) return;
        graph[id] = { name: cteSafeName(s.name, id), provenance: s.provenance };
        for (const d of s.provenance.serverSheetJoins || []) {
          if (d?.targetSheetId && dataSheets[d.targetSheetId]) walk(d.targetSheetId);
        }
      };
      walk(activeSheetId);

      if (!graph[activeSheetId]) {
        toast.error("Could not build sheet graph for Athena.");
        return;
      }

      const refineFilters = { and: [] };
      const wCol = String(refineWhereCol || "").trim();
      const wVal = Number(refineWhereVal);
      if (wCol && Number.isFinite(wVal)) {
        refineFilters.and.push({ column: wCol, op: refineWhereOp, value: wVal });
      }

      setRefineBusy(true);
      setRefineProgressLabel("Sending query to Athena…");
      setRefineProgress(8);
      let tick = setInterval(() => {
        setRefineProgress((p) => Math.min(p + 2, 90));
      }, 450);
      try {
        const res = await fetch("/api/data-lake/sheet-refine-athena", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheetGraph: graph,
            rootSheetId: activeSheetId,
            selectColumns: cols,
            refineFilters,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || res.statusText || "Request failed");
        if (tick) clearInterval(tick);
        tick = null;
        setRefineProgressLabel("Mapping column names…");
        setRefineProgress(96);
        const rawRows = Array.isArray(j.rows) ? j.rows : [];
        const colNames = Array.isArray(j.columns) ? j.columns : [];
        const outRows = athenaRowsToObjects(colNames, rawRows);
        if (refineDestination === "new_sheet") {
          if (!addNewSheetAndActivate || !setSheetData) {
            throw new Error("Sheet actions are unavailable.");
          }
          const baseSheet = dataSheets[activeSheetId];
          addNewSheetAndActivate((newId) => {
            setSheetData(newId, outRows);
            setDataSheets?.((prev) => {
              const p = prev || {};
              const sh = p[newId];
              if (!sh) return prev;
              return {
                ...p,
                [newId]: {
                  ...sh,
                  name: `Refined · ${String(baseSheet?.name || activeSheetId)}`.slice(0, 80),
                  provenance: baseSheet?.provenance ?? null,
                },
              };
            });
          });
          toast.success(`New sheet: ${outRows.length} rows from Athena (capped at ${ATHENA_SAMPLE_ROW_LIMIT}).`);
        } else {
          replaceCurrentSheetData?.(outRows);
          setConnectedData?.(outRows);
          toast.success(`Loaded ${outRows.length} rows from Athena (capped at ${ATHENA_SAMPLE_ROW_LIMIT}).`);
        }
        setRefineProgress(100);
        setRefineProgressLabel("Done");
        setRefineQueryOpen(false);
      } catch (e) {
        toast.error(e?.message || "Refine query failed.");
      } finally {
        if (tick) clearInterval(tick);
        setRefineBusy(false);
        setRefineProgress(0);
        setRefineProgressLabel("");
      }
    }, [
      addNewSheetAndActivate,
      refineDestination,
      refineSelectedCols,
      connectedData,
      refineScope,
      refineWhereCol,
      refineWhereOp,
      refineWhereVal,
      activeSheetId,
      dataSheets,
      replaceCurrentSheetData,
      setConnectedData,
      setDataSheets,
      setSheetData,
    ]);

    const dateColumns = useMemo(() => {
      if (!connectedData.length) return [];
      const first = connectedData[0];
      return colKeys.filter((key) => {
        const v = first[key];
        return v != null && typeof v === 'string' && DATE_LIKE.test(v);
      });
    }, [connectedData, colKeys]);

    const displayData = useMemo(() => {
      const withIndex = (connectedData || []).map((r, i) => ({ ...r, _origIndex: i }));
      let out = withIndex;
      const { dateColumn, dateFrom, dateTo, sortKey, sortDir, categoryFilters } = filterState;
      if (dateColumn && (dateFrom || dateTo)) {
        out = out.filter((row) => {
          const raw = row[dateColumn];
          if (raw == null || raw === '') return false;
          const t = typeof raw === 'string' && DATE_LIKE.test(raw) ? new Date(raw).getTime() : Number(raw);
          if (Number.isNaN(t)) return true;
          if (dateFrom) {
            const from = new Date(dateFrom).getTime();
            if (t < from) return false;
          }
          if (dateTo) {
            const to = new Date(dateTo).getTime();
            if (t > to) return false;
          }
          return true;
        });
      }
      const catKeys = Object.keys(categoryFilters || {}).filter((k) => (categoryFilters[k] || []).length > 0);
      if (catKeys.length > 0) {
        out = out.filter((row) =>
          catKeys.every((col) => {
            const allowed = categoryFilters[col];
            const val = row[col];
            const s = val != null ? String(val) : '';
            return allowed.includes(s);
          })
        );
      }
      if (sortKey) {
        out = [...out].sort((a, b) => {
          const va = a[sortKey];
          const vb = b[sortKey];
          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;

          const ka = dateBucketToSortKey(va);
          const kb = dateBucketToSortKey(vb);
          const cmp = ka != null && kb != null ? ka - kb : String(va).localeCompare(String(vb), undefined, { numeric: true });
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
      return out;
    }, [connectedData, filterState]);

    const columnDefsWithMeta = useMemo(() => {
      const cols = (connectedCols || []).map((c) => {
        const field = c && typeof c === 'object' && 'field' in c ? c.field : c;
        const fl = field && field.toLowerCase();
        const isTokenId = fl && (TOKEN_ID_FIELDS.has(fl) || fl.endsWith('_conditionid') || fl.endsWith('_condition_id') || fl.endsWith('_asset_id') || fl === 'id' || fl.endsWith('id'));
        const fmt = isTokenId ? (p) => (p?.value != null ? String(p.value) : '') : undefined;
        return typeof c === 'object' && c !== null
          ? { ...c, valueFormatter: isTokenId ? fmt : c.valueFormatter }
          : { field: c, valueFormatter: fmt };
      });
      cols.push({ field: '_origIndex', hide: true, suppressColumnsToolPanel: true });
      return cols;
    }, [connectedCols]);

    const distinctByColumn = useMemo(() => {
      const map = {};
      colKeys.forEach((key) => {
        const set = new Set();
        (connectedData || []).forEach((row) => {
          const v = row[key];
          if (v != null && v !== '') set.add(String(v));
        });
        map[key] = Array.from(set).sort();
      });
      return map;
    }, [connectedData, colKeys]);

    const resetFilters = useCallback(() => {
      setFilterState({
        dateColumn: null,
        dateFrom: '',
        dateTo: '',
        sortKey: null,
        sortDir: 'asc',
        categoryFilters: {},
      });
      toast('Filters reset to original data');
    }, []);

    const setCategoryFilter = useCallback((col, values) => {
      setFilterState((prev) => ({
        ...prev,
        categoryFilters: { ...(prev.categoryFilters || {}), [col]: values },
      }));
    }, []);

    // Export: data to download (displayData without internal _origIndex)
    const exportData = useMemo(() => {
      if (!displayData || !displayData.length) return [];
      return displayData.map(({ _origIndex, ...row }) => row);
    }, [displayData]);

    const downloadFile = useCallback((blob, filename) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, []);

    const downloadCSV = useCallback(() => {
      if (!exportData.length) {
        toast.error('No data to export');
        return;
      }
      const cols = colKeys.length ? colKeys : Object.keys(exportData[0] || {});
      const escape = (v) => {
        const s = v == null ? '' : String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const header = cols.map(escape).join(',');
      const rows = exportData.map((row) => cols.map((c) => escape(row[c])).join(','));
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadFile(blob, `export-${Date.now()}.csv`);
      toast.success('CSV downloaded');
    }, [exportData, colKeys, downloadFile]);

    const downloadJSON = useCallback(() => {
      if (!exportData.length) {
        toast.error('No data to export');
        return;
      }
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      downloadFile(blob, `export-${Date.now()}.json`);
      toast.success('JSON downloaded');
    }, [exportData, downloadFile]);

    const downloadXLSX = useCallback(() => {
      if (!exportData.length) {
        toast.error('No data to export');
        return;
      }
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, `export-${Date.now()}.xlsx`);
      toast.success('Excel file downloaded');
    }, [exportData]);

    //Apply settings across all columns
    const defaultColDef = useMemo(() => ({
        filter: true, // Enable filtering on all columns
        //maxWidth: 120,
        editable: true,
        background: {visible: false},
        resizable: true,
        singleClickEdit: true,
        stopEditingWhenCellsLoseFocus : true,
    }))

    const autoSizeStrategy = {
        type: 'fitGridWidth',
        defaultMinWidth: 100,
    };

    const gridOptions = useMemo(()=> ({
        onCellClicked: (e) => toast(`Hit Enter to accept change`, {
            duration: 5000
        }),
    }))

    const updateCellData = (rowIndex, field, newValue) => {
        if (field === '_origIndex') return;
        if (newValue === "PRETTY PLEASE DELETE ROW") {
            handleDeleteRow(rowIndex);
            return;
        }
        const row = displayData[rowIndex];
        const origIndex = row && row._origIndex;
        if (origIndex == null) return;
        setConnectedData((prevData) => {
          const newData = prevData.map((item, index) =>
            index === origIndex ? { ...item, [field]: newValue } : item
          );
          return newData;
        });
        toast('Data updated. Chart updated!', { duration: 5000 });
    };

    const handleAddRow = () => {
        const newRow = {};
        colKeys.forEach((key) => { newRow[key] = ''; });
        setConnectedData([...(connectedData || []), newRow])

        toast(`New Row added!`, {
            duration: 5000
        })   
    }

    const handleAddColumn = (name) => {
        let newCols = [...connectedCols, { field: name }];
        setConnectedCols(newCols);
        //adding col to data as well
        if(connectedData.length > 0){
            setConnectedData(prevData => {
                // Create a new array with updated data
                const newData = prevData.map((item, index) => {
                    return { ...item, [name]: '' }; // Update the specific field value
                });
                return newData;
              });
        }else{
            setConnectedData(prevData => {
                return prevData.map(item => {
                  return { ...item, [name]: '' };
                }).concat([{ [name]: '' }]);
              });
        }
        setColAddOpen(false)

        toast(`New Column added!`, {
            duration: 5000
        })   
    }

    const handleInputChange = (event) => {
        setColumnName(event.target.value);
      };
    
    const handleSubmit = () => {
        if (!columnName?.trim()) return;
        handleAddColumn(columnName.trim());
        setColumnName('');
    };

    const handleDeleteRow = (displayRowIndex) => {
        const row = displayData[displayRowIndex];
        const origIndex = row && row._origIndex;
        if (origIndex == null) return;
        setConnectedData((prevData) => prevData.filter((_, index) => index !== origIndex));
        toast('Row deleted!', { duration: 5000 });
    };
    

    useEffect(()=>{
        startNew && setConnectedData([])
    }, [startNew])

    return (
        <div className="ag-theme-quartz" style={{ height: '100%', width: '100%' }}>
            <Alert className="mt-4 sm:hidden">
                <div className="flex gap-2 place-items-center"><TrafficCone className="w-8 h-8"/>
                    <div className="">
                        <p className="text-xs">Looks like you're on-the-go!</p>
                        <p className="text-xs text-muted-foreground">I tried to keep it mobile-friendly, but Lychee really flexes its muscles on bigger screens.</p>
                    </div>
                </div>
            </Alert>  
            {connectedData && connectedData.length > 0 && (
            <Tabs defaultValue="table" className="w-full min-w-0">
              <div className="flex flex-wrap items-center gap-2 py-2 border-b">
                <TabsList className="h-9">
                  <TabsTrigger value="table" className="text-xs">Table</TabsTrigger>
                  <TabsTrigger value="sort-filter" className="text-xs gap-1">
                    <Filter className="h-3.5 w-3.5" />
                    Sort & filter
                  </TabsTrigger>
                </TabsList>
                <div className="h-4 w-px bg-border shrink-0" />
                <Menu compact />
                {/* Sheet Properties dropdown (keeps existing Add Column dialog code) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                      Sheet Properties
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem
                      className="text-xs"
                      onSelect={(e) => {
                        e.preventDefault();
                        setColAddOpen(true);
                      }}
                    >
                      + Add Column
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs"
                      onSelect={(e) => {
                        e.preventDefault();
                        handleAddRow?.();
                      }}
                    >
                      + Add Row
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs"
                      onSelect={(e) => {
                        e.preventDefault();
                        setSheetPropsDialogOpen(true);
                      }}
                    >
                      Sheet Properties
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={colAddOpen} onOpenChange={setColAddOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add Column</DialogTitle>
                      <DialogDescription>Name your column</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input
                          id="name"
                          value={columnName}
                          onChange={handleInputChange}
                          className="col-span-3"
                          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" onClick={() => handleSubmit()}>Save changes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={sheetPropsDialogOpen} onOpenChange={setSheetPropsDialogOpen}>
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Sheet Properties</DialogTitle>
                      <DialogDescription>
                        Column names and detected types for the current sheet.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                        {sheetColumnsForProps.map((col) => {
                          const t = dataTypes?.[col] || "text";
                          return (
                            <div key={col} className="rounded-md border bg-muted/20 px-3 py-2">
                              <p className="font-mono text-xs font-medium truncate" title={col}>
                                {col}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                type: {String(t)}
                              </p>
                            </div>
                          );
                        })}
                        {sheetColumnsForProps.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No columns found.
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={() => setSheetPropsDialogOpen(false)}>
                        Close
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label="Mathematics Operations"
                        onClick={() => setMathDialogOpen(true)}
                      >
                        <Sigma className="h-4 w-4" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Mathematics Operations
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Dialog open={mathDialogOpen} onOpenChange={setMathDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Mathematics Operations</DialogTitle>
                      <DialogDescription>
                        Row-wise math on the current sheet (like an Excel formula). Pick two numeric columns and an
                        output column name.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 sm:grid-cols-2 py-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Operation</Label>
                        <Select value={mathOp} onValueChange={setMathOp}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="add">Add (A + B)</SelectItem>
                            <SelectItem value="subtract">Subtract (A − B)</SelectItem>
                            <SelectItem value="multiply">Multiply (A × B)</SelectItem>
                            <SelectItem value="divide">Divide (A ÷ B)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Output column name</Label>
                        <Input
                          className="h-9 text-xs"
                          value={mathOutCol}
                          onChange={(e) => setMathOutCol(e.target.value)}
                          spellCheck={false}
                          placeholder="result"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Column A</Label>
                        <Select value={mathColA || "__"} onValueChange={(v) => setMathColA(v === "__" ? "" : v)}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__">—</SelectItem>
                            {sheetColumnNamesForMath.map((c) => (
                              <SelectItem key={c} value={c} className="font-mono text-xs">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Column B</Label>
                        <Select value={mathColB || "__"} onValueChange={(v) => setMathColB(v === "__" ? "" : v)}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__">—</SelectItem>
                            {sheetColumnNamesForMath.map((c) => (
                              <SelectItem key={`math-b-${c}`} value={c} className="font-mono text-xs">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={() => setMathDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={applySheetMathOperation}>
                        Apply to sheet
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Combine sheets */}
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label="Combine Sheets"
                        onClick={() => {
                          const entries = Object.entries(dataSheets || {}).filter(([, s]) => Array.isArray(s?.data) && s.data.length > 0);
                          if (entries.length < 2) {
                            toast.error("Load at least two sheets before combining.");
                            return;
                          }
                          setCombineSheetsDialogOpen(true);
                          setCombineMergeMode("browser");
                          setCombineBusy(false);
                          setCombineProgress(0);
                          setCombineProgressLabel("");
                          setCombineLeftSheetId(entries[0][0]);
                          setCombineRightSheetId(entries[1][0]);
                          setCombineJoinType("inner");
                          setCombineLeftKeyCol("");
                          setCombineRightKeyCol("");
                        }}
                      >
                        <BarChart2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Combine Sheets
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Dialog open={combineSheetsDialogOpen} onOpenChange={setCombineSheetsDialogOpen}>
                  <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                      <DialogTitle>Combine Sheets</DialogTitle>
                      <DialogDescription>
                        Join two sheets. Use loaded rows only for any join type, or run Inner/Left on the full dataset in Athena
                        (same lake, compose provenance; result capped at {ATHENA_SAMPLE_ROW_LIMIT} rows in a new sheet).
                      </DialogDescription>
                    </DialogHeader>

                    {(() => {
                      const leftSheet = combineLeftSheetId ? dataSheets?.[combineLeftSheetId] : null;
                      const rightSheet = combineRightSheetId ? dataSheets?.[combineRightSheetId] : null;
                      const leftRows = Array.isArray(leftSheet?.data) ? leftSheet.data : [];
                      const rightRows = Array.isArray(rightSheet?.data) ? rightSheet.data : [];

                      const leftCols = collectColumnNames(leftRows);
                      const rightCols = collectColumnNames(rightRows);
                      const suffix = String(rightSheet?.name || combineRightSheetId || "right").replace(/[^a-zA-Z0-9_]/g, "_") || "right";

                      const leftKeyValue = combineLeftKeyCol;
                      const rightKeyValue = combineRightKeyCol;

                      return (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Combine using</Label>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={combineMergeMode === "browser" ? "default" : "outline"}
                                className="h-8 text-xs"
                                disabled={combineBusy}
                                onClick={() => setCombineMergeMode("browser")}
                              >
                                Loaded sheets only
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={combineMergeMode === "athena" ? "default" : "outline"}
                                className="h-8 text-xs"
                                disabled={combineBusy}
                                onClick={() => setCombineMergeMode("athena")}
                              >
                                Full dataset (Athena)
                              </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-snug">
                              {combineMergeMode === "browser"
                                ? "Merges the rows already shown in each sheet. No Athena query."
                                : "Rebuilds SQL from saved lake provenance on the server. Inner or Left only; opens a new sheet."}
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Join type</Label>
                            <Select value={combineJoinType} onValueChange={setCombineJoinType}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="inner">Inner</SelectItem>
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                                <SelectItem value="full">Full</SelectItem>
                                <SelectItem value="cross">Cross</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Left sheet</Label>
                              <Select value={combineLeftSheetId || ""} onValueChange={setCombineLeftSheetId}>
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="Left sheet" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(dataSheets || {})
                                    .filter(([, s]) => Array.isArray(s?.data) && s.data.length > 0)
                                    .map(([id, s]) => (
                                      <SelectItem key={id} value={id}>
                                        {s?.name || id}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs">Right sheet</Label>
                              <Select value={combineRightSheetId || ""} onValueChange={setCombineRightSheetId}>
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="Right sheet" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(dataSheets || {})
                                    .filter(([, s]) => Array.isArray(s?.data) && s.data.length > 0)
                                    .map(([id, s]) => (
                                      <SelectItem key={id} value={id}>
                                        {s?.name || id}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {combineJoinType !== "cross" && (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Left join key</Label>
                                <Select
                                  value={leftKeyValue || ""}
                                  onValueChange={(v) => setCombineLeftKeyCol(v)}
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Pick key" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {leftCols.map((c) => (
                                      <SelectItem key={c} value={c}>
                                        {c}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs">Right join key</Label>
                                <Select
                                  value={rightKeyValue || ""}
                                  onValueChange={(v) => setCombineRightKeyCol(v)}
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Pick key" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {rightCols.map((c) => (
                                      <SelectItem key={c} value={c}>
                                        {c}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground leading-snug">
                            {combineJoinType === "cross"
                              ? "Cross join creates every pair of rows (Cartesian product)."
                              : `Match rows where ${combineLeftKeyCol || "leftKey"} = ${combineRightKeyCol || "rightKey"}. (Right-side overlapping column names will be suffixed like name__${suffix}.)`}
                          </div>
                          {combineBusy ? (
                            <ConnectProgressWithLabel
                              label={combineProgressLabel || "Working…"}
                              progress={combineProgress}
                              className="pt-1"
                            />
                          ) : null}
                        </div>
                      );
                    })()}

                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCombineSheetsDialogOpen(false)}
                        disabled={combineBusy}
                      >
                        Cancel
                      </Button>
                      <Button type="button" onClick={() => void applyCombineSheets()} disabled={combineBusy}>
                        {combineBusy ? "Running…" : "Combine"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Remove duplicates */}
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label="Remove duplicates"
                        onClick={() => setRemoveDupsDialogOpen(true)}
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Remove duplicates
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label="Refine query"
                        onClick={() => {
                          if (!Array.isArray(connectedData) || connectedData.length === 0) {
                            toast.error("Load sheet data before refining.");
                            return;
                          }
                          setRefineScope("preview");
                          setRefineDestination("replace");
                          setRefineQueryOpen(true);
                        }}
                      >
                        <Database className="h-4 w-4" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Refine query
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Dialog open={refineQueryOpen} onOpenChange={setRefineQueryOpen}>
                  <DialogContent className="sm:max-w-lg max-h-[min(90dvh,640px)] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Refine query</DialogTitle>
                      <DialogDescription>
                        Select columns and an optional numeric filter. Run on loaded rows only, or re-query the full dataset in
                        Athena using this sheet&apos;s provenance (results capped at {ATHENA_SAMPLE_ROW_LIMIT} rows). Choose
                        whether to replace the active sheet or open a new one with the result.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Apply result to</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={refineDestination === "replace" ? "default" : "outline"}
                            className="h-8 text-xs"
                            disabled={refineBusy}
                            onClick={() => setRefineDestination("replace")}
                          >
                            This sheet
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={refineDestination === "new_sheet" ? "default" : "outline"}
                            className="h-8 text-xs"
                            disabled={refineBusy}
                            onClick={() => setRefineDestination("new_sheet")}
                          >
                            New sheet
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Run against</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={refineScope === "preview" ? "default" : "outline"}
                            className="h-8 text-xs"
                            onClick={() => setRefineScope("preview")}
                          >
                            This sheet only
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={refineScope === "athena" ? "default" : "outline"}
                            className="h-8 text-xs"
                            onClick={() => setRefineScope("athena")}
                          >
                            Full dataset (Athena)
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Columns to keep</Label>
                        <div className="max-h-40 overflow-y-auto rounded-md border border-border/60 p-2 space-y-2">
                          {sheetColumnsForProps.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No columns found.</p>
                          ) : (
                            sheetColumnsForProps.map((col) => (
                              <label key={col} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                <Checkbox
                                  checked={refineSelectedCols.has(col)}
                                  onCheckedChange={() => {
                                    setRefineSelectedCols((prev) => {
                                      const n = new Set(prev);
                                      if (n.has(col)) n.delete(col);
                                      else n.add(col);
                                      return n;
                                    });
                                  }}
                                />
                                <span className="font-mono">{col}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Optional numeric filter (WHERE)</Label>
                        <div className="flex flex-wrap gap-2 items-end">
                          <div className="space-y-1 min-w-[7rem] flex-1">
                            <Label className="text-[10px] text-muted-foreground">Column</Label>
                            <Select value={refineWhereCol || ""} onValueChange={setRefineWhereCol}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Column" />
                              </SelectTrigger>
                              <SelectContent>
                                {sheetColumnsForProps.map((c) => (
                                  <SelectItem key={c} value={c} className="text-xs font-mono">
                                    {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1 min-w-[8rem]">
                            <Label className="text-[10px] text-muted-foreground">Operator</Label>
                            <Select value={refineWhereOp} onValueChange={setRefineWhereOp}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gte" className="text-xs">
                                  ≥
                                </SelectItem>
                                <SelectItem value="lte" className="text-xs">
                                  ≤
                                </SelectItem>
                                <SelectItem value="gt" className="text-xs">
                                  &gt;
                                </SelectItem>
                                <SelectItem value="lt" className="text-xs">
                                  &lt;
                                </SelectItem>
                                <SelectItem value="eq" className="text-xs">
                                  =
                                </SelectItem>
                                <SelectItem value="neq" className="text-xs">
                                  ≠
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1 min-w-[6rem] flex-1">
                            <Label className="text-[10px] text-muted-foreground">Value</Label>
                            <Input
                              className="h-8 text-xs"
                              type="number"
                              value={refineWhereVal}
                              onChange={(e) => setRefineWhereVal(e.target.value)}
                              placeholder="e.g. 100"
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Leave value empty to skip the WHERE clause (all rows pass).
                        </p>
                      </div>
                      {refineBusy ? (
                        <ConnectProgressWithLabel label={refineProgressLabel || "Working…"} progress={refineProgress} />
                      ) : null}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={() => setRefineQueryOpen(false)} disabled={refineBusy}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={() => void applyRefineQuery()} disabled={refineBusy}>
                        {refineBusy ? "Running…" : "Run"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={removeDupsDialogOpen} onOpenChange={setRemoveDupsDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Remove duplicates</DialogTitle>
                      <DialogDescription>
                        Deduplicate rows in the current sheet (row-level, like SQL DISTINCT).
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={() => setRemoveDupsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={applyRemoveDuplicates}>
                        Remove duplicates
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <TabsContent value="sort-filter" className="mt-3">
                <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                        <Filter className="h-3.5 w-3.5" />
                        Sort / Select / Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-52" align="start">
                      <DropdownMenuLabel className="text-xs">Filter & date</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {dateColumns.length > 0 && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="text-xs">
                            <Calendar className="h-3.5 w-3.5 mr-2" />
                            Date range
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent className="w-56 p-2">
                              <DropdownMenuLabel className="text-xs">Column</DropdownMenuLabel>
                              <Select value={filterState.dateColumn || ''} onValueChange={(v) => setFilterState((p) => ({ ...p, dateColumn: v || null }))}>
                                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Pick column" /></SelectTrigger>
                                <SelectContent>
                                  {dateColumns.map((col) => (
                                    <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Label className="text-[10px] text-muted-foreground mt-2 block">From</Label>
                              <Input type="date" className="h-8 text-xs mt-0.5" value={filterState.dateFrom} onChange={(e) => setFilterState((p) => ({ ...p, dateFrom: e.target.value }))} />
                              <Label className="text-[10px] text-muted-foreground mt-1 block">To</Label>
                              <Input type="date" className="h-8 text-xs mt-0.5" value={filterState.dateTo} onChange={(e) => setFilterState((p) => ({ ...p, dateTo: e.target.value }))} />
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                      )}
                      {colKeys.map((col) => {
                        const options = distinctByColumn[col] || [];
                        if (options.length === 0 || options.length > 100) return null;
                        return (
                          <DropdownMenuSub key={col}>
                            <DropdownMenuSubTrigger className="text-xs">
                              <span className="truncate">Filter: {col}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent className="max-h-[220px] w-56 overflow-y-auto">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="text-xs">Values</DropdownMenuLabel>
                                  {(options.slice(0, 60)).map((val) => {
                                    const selected = filterState.categoryFilters?.[col] || [];
                                    const isChecked = selected.includes(val);
                                    return (
                                      <DropdownMenuCheckboxItem
                                        key={val}
                                        checked={isChecked}
                                        onCheckedChange={(checked) => {
                                          const next = checked ? [...selected, val] : selected.filter((x) => x !== val);
                                          setCategoryFilter(col, next);
                                        }}
                                      >
                                        <span className="truncate">{String(val).slice(0, 40)}{String(val).length > 40 ? '…' : ''}</span>
                                      </DropdownMenuCheckboxItem>
                                    );
                                  })}
                                  {options.length > 60 && <div className="px-2 py-1 text-[10px] text-muted-foreground">+{options.length - 60} more</div>}
                                </DropdownMenuGroup>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Sort by</Label>
                    <Select value={filterState.sortKey || ''} onValueChange={(v) => setFilterState((p) => ({ ...p, sortKey: v || null }))}>
                      <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Column" /></SelectTrigger>
                      <SelectContent>
                        {colKeys.map((col) => (
                          <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filterState.sortKey && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={() => setFilterState((p) => ({ ...p, sortDir: p.sortDir === 'asc' ? 'desc' : 'asc' }))}
                        title={filterState.sortDir === 'asc' ? 'Descending' : 'Ascending'}
                      >
                        {filterState.sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 ml-auto min-w-0">
                    {filterState.dateColumn && (filterState.dateFrom || filterState.dateTo) && (
                      <Badge variant="secondary" className="text-[10px] gap-1 pr-1 pl-2 py-0.5">
                        <Calendar className="h-3 w-3" />
                        {filterState.dateColumn}: {filterState.dateFrom || '…'} → {filterState.dateTo || '…'}
                        <button type="button" className="rounded-full hover:bg-muted p-0.5" onClick={() => setFilterState((p) => ({ ...p, dateColumn: null, dateFrom: '', dateTo: '' }))} aria-label="Remove date filter">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {filterState.sortKey && (
                      <Badge variant="secondary" className="text-[10px] gap-1 pr-1 pl-2 py-0.5">
                        <ArrowUpDown className="h-3 w-3" />
                        {filterState.sortKey} {filterState.sortDir === 'asc' ? '↑' : '↓'}
                        <button type="button" className="rounded-full hover:bg-muted p-0.5" onClick={() => setFilterState((p) => ({ ...p, sortKey: null, sortDir: 'asc' }))} aria-label="Remove sort">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {Object.entries(filterState.categoryFilters || {}).map(([col, values]) => {
                      if (!values?.length) return null;
                      return (
                        <Badge key={col} variant="secondary" className="text-[10px] gap-1 pr-1 pl-2 py-0.5">
                          {col}: {values.length} selected
                          <button type="button" className="rounded-full hover:bg-muted p-0.5" onClick={() => setCategoryFilter(col, [])} aria-label={`Remove filter ${col}`}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="table" className="mt-0" />
            </Tabs>
            )}
            <div className={gridExpanded ? 'h-[750px]' :'h-[550px]'}>
                <AgGridReact 
                    defaultColDef={defaultColDef} 
                    rowData={displayData} 
                    columnDefs={columnDefsWithMeta} 
                    pagination={true}
                    onCellValueChanged={(event) => {
                        const rowIndex = event.rowIndex;
                        const field = event.colDef?.field;
                        const newValue = event.newValue;
                        if (field) updateCellData(rowIndex, field, newValue);
                    }}
                    gridOptions={gridOptions}
                    autoSizeStrategy={autoSizeStrategy}
                    />
            </div>
        </div>
    )



}

export default GridView;