import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import moment from "moment"


//Shdcn
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useUser } from '@/lib/hooks';
import { useMyStateV2  } from '@/context/stateContextV2'
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger} from "@/components/ui/sheet"
import { toast } from "sonner"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { Progress } from "@/components/ui/progress"
import { Pause, Play, RotateCw, Square, ExternalLink, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { inferDefaultBuilderSnapshot } from "@/lib/inferDefaultBuilderSnapshot"
import {
  applyDataSetToWorkspace,
  hydrateChartSheetsForDataSet,
} from "@/lib/hydrateProjectWorkspace"
import {
  persistChartDashboardDraft,
  mergeCreatedChartDashboardDraft,
} from "@/lib/persistChartDashboardDraft"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DestructiveIconButton } from "@/components/primitives/destructive-icon-button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { UserAvatar } from "@/components/ui/user-avatar"

function attachPublicAssetsToProjectRow(row) {
  row.publicCharts = (row.charts || []).filter((c) => c?.is_public && c?.public_slug)
  row.publicDashboards = (row.dashboards || []).filter((d) => d?.is_public && d?.public_slug)
}

/**
 * One row per saved dataset (project), with charts and dashboards grouped by data_set_id.
 * Assets with missing or unknown data_set_id get numbered "Unnamed project N" rows.
 */
function buildProjectRows(savedDataSets, savedCharts, savedChartDashboards) {
  const datasets = Array.isArray(savedDataSets) ? savedDataSets.filter((d) => d?._id) : []
  const sorted = [...datasets].sort((a, b) => {
    const ta = new Date(a?.last_saved_date || 0).getTime()
    const tb = new Date(b?.last_saved_date || 0).getTime()
    return tb - ta
  })
  const charts = Array.isArray(savedCharts) ? savedCharts : []
  const dashboards = Array.isArray(savedChartDashboards) ? savedChartDashboards : []
  const idSet = new Set(sorted.map((d) => String(d._id)))

  const rowById = new Map()
  const rows = []
  for (const ds of sorted) {
    const id = String(ds._id)
    const row = {
      key: `dataset-${id}`,
      kind: "dataset",
      dataSet: ds,
      charts: [],
      dashboards: [],
    }
    rowById.set(id, row)
    rows.push(row)
  }

  const targetRow = (dataSetId) => {
    const id = dataSetId != null && String(dataSetId).trim() !== "" ? String(dataSetId) : ""
    if (!id || !idSet.has(id)) return null
    return rowById.get(id)
  }

  const orphanCharts = []
  const orphanDashboards = []
  for (const ch of charts) {
    const t = targetRow(ch?.data_set_id)
    if (t) t.charts.push(ch)
    else orphanCharts.push(ch)
  }
  for (const d of dashboards) {
    const t = targetRow(d?.data_set_id)
    if (t) t.dashboards.push(d)
    else orphanDashboards.push(d)
  }

  rows.forEach((r) => attachPublicAssetsToProjectRow(r))

  let unnamedIdx = 0
  if (orphanCharts.length) {
    const r = {
      key: `orphan-charts-${unnamedIdx}`,
      kind: "orphan",
      name: `Unnamed project ${unnamedIdx}`,
      dataSet: null,
      charts: orphanCharts,
      dashboards: [],
    }
    attachPublicAssetsToProjectRow(r)
    rows.push(r)
    unnamedIdx += 1
  }
  if (orphanDashboards.length) {
    const r = {
      key: `orphan-dashboards-${unnamedIdx}`,
      kind: "orphan",
      name: `Unnamed project ${unnamedIdx}`,
      dataSet: null,
      charts: [],
      dashboards: orphanDashboards,
    }
    attachPublicAssetsToProjectRow(r)
    rows.push(r)
  }

  return rows
}

const Nav = () => {
  const user = useUser()
  const router = useRouter();
  const contextStateV2 = useMyStateV2()

  const hasDbBackedUserId =
    typeof user?.userId === "string" &&
    user.userId !== "dev-bypass-no-db" &&
    /^[a-f0-9]{24}$/i.test(user.userId)

  //what component are we viewing
  const viewing = contextStateV2?.viewing
  const setViewing = contextStateV2?.setViewing
  const connectedData = contextStateV2?.connectedData
  const dataSetName = contextStateV2?.dataSetName
  const setDataSetName = contextStateV2?.setDataSetName
  
  const savedDataSets = contextStateV2?.savedDataSets
  const setConnectedData = contextStateV2?.setConnectedData

  const loadedDataMeta = contextStateV2?.loadedDataMeta
  const setLoadedDataMeta = contextStateV2?.setLoadedDataMeta
  const userHandle = contextStateV2?.userHandle
  const profilePic = contextStateV2?.profilePic
  const loadedDataId = contextStateV2?.loadedDataId
  const setLoadedDataId = contextStateV2?.setLoadedDataId

  const loadedPresentationMeta = contextStateV2?.loadedPresentationMeta
  const setLoadedPresentationMeta = contextStateV2?.setLoadedPresentationMeta
  const connectedPresentation = contextStateV2?.connectedPresentation
  const setConnectedPresentation = contextStateV2?.setConnectedPresentation



  //saving charts
  const savedCharts = contextStateV2?.savedCharts
  const setSavedCharts = contextStateV2?.setSavedCharts
  const savedChartDashboards = contextStateV2?.savedChartDashboards
  const setActiveChartDashboardId = contextStateV2?.setActiveChartDashboardId
  const setChartDashboardDraft = contextStateV2?.setChartDashboardDraft
  const chartDashboardDraft = contextStateV2?.chartDashboardDraft
  const activeChartDashboardId = contextStateV2?.activeChartDashboardId
  const setRefetchChartDashboardsTick = contextStateV2?.setRefetchChartDashboardsTick
  const saveProjectDialogNonce = contextStateV2?.saveProjectDialogNonce ?? 0
  const prevSaveProjectNonceRef = useRef(0)

  const savedWorkCountLoading =
    hasDbBackedUserId &&
    (savedDataSets === undefined || savedCharts === undefined || savedChartDashboards === undefined)

  const projectRows = useMemo(
    () => buildProjectRows(savedDataSets, savedCharts, savedChartDashboards),
    [savedDataSets, savedCharts, savedChartDashboards],
  )

  // chart properties used by legacy save flow
  const chartOptions = contextStateV2?.chartOptions
  const chartTheme = contextStateV2?.chartTheme
  const bgColor = contextStateV2?.bgColor
  const textColor = contextStateV2?.textColor
  const cardColor = contextStateV2?.cardColor
  const title = contextStateV2?.title
  const subTitle = contextStateV2?.subTitle

  //let system know to conduct refetch
  const setRefetchData = contextStateV2?.setRefetchData
  const setRefetchChart = contextStateV2?.setRefetchChart
  const setRefetchPresentations = contextStateV2?.setRefetchPresentations

  //loading charts
  const loadedChartMeta = contextStateV2?.loadedChartMeta
  const setLoadedChartMeta = contextStateV2?.setLoadedChartMeta
  const setLoadedChartBuilderSnapshot = contextStateV2?.setLoadedChartBuilderSnapshot
  const chartSheets = contextStateV2?.chartSheets || {}
  const setChartSheets = contextStateV2?.setChartSheets
  const activeChartSheetId = contextStateV2?.activeChartSheetId
  const setActiveChartSheetId = contextStateV2?.setActiveChartSheetId

  // summarization: when charting a summary table
  const chartDataOverride = contextStateV2?.chartDataOverride
  const chartDataOverrideMeta = contextStateV2?.chartDataOverrideMeta
  const setChartDataOverride = contextStateV2?.setChartDataOverride
  const setChartDataOverrideMeta = contextStateV2?.setChartDataOverrideMeta

  const liveStreamState = contextStateV2?.liveStreamState
  const liveStreamActions = contextStateV2?.liveStreamActions
  const dataSheets = contextStateV2?.dataSheets
  const setDataSheets = contextStateV2?.setDataSheets
  const setActiveSheetId = contextStateV2?.setActiveSheetId
  const chartSnapshotFlusher = contextStateV2?.chartSnapshotFlusher
  const [selectedStreamSheetId, setSelectedStreamSheetId] = useState(null)
  const streamsBySheetId = liveStreamState?.streamsBySheetId || {}
  const streamSheetIds = Object.keys(streamsBySheetId).filter((id) => streamsBySheetId[id]?.isRunning || streamsBySheetId[id]?.config)
  const hasAnyStream = streamSheetIds.length > 0
  const effectiveStreamSheetId = selectedStreamSheetId && streamsBySheetId[selectedStreamSheetId] ? selectedStreamSheetId : (streamSheetIds[0] || null)
  const currentStreamState = effectiveStreamSheetId ? streamsBySheetId[effectiveStreamSheetId] : null

  const [isOpen, setIsOpen] = useState(false) 
  const [saveIsOpen, setSaveIsOpen] = useState(false)
  const [saveProjectBusy, setSaveProjectBusy] = useState(false)
  const [saveProjectProgress, setSaveProjectProgress] = useState(0)
  const [saveProjectMessage, setSaveProjectMessage] = useState("")
  const [projectNameInput, setProjectNameInput] = useState("")
  const [runtimeOrigin, setRuntimeOrigin] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteUses, setDeleteUses] = useState([])
  const [deleteDownstream, setDeleteDownstream] = useState(false)
  const [isDeleteBusy, setIsDeleteBusy] = useState(false)
  /** Your Projects sheet: per-row expansion for workbook / charts / dashboards (default collapsed). */
  const [expandedProjectDetails, setExpandedProjectDetails] = useState({})

  const publicBase =
    process.env.NODE_ENV === "development" && runtimeOrigin
      ? runtimeOrigin
      : (process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com")

  useEffect(() => {
    if (typeof window === "undefined") return
    setRuntimeOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    const n = saveProjectDialogNonce
    if (n > prevSaveProjectNonceRef.current) {
      prevSaveProjectNonceRef.current = n
      setSaveIsOpen(true)
    }
  }, [saveProjectDialogNonce])

  const handleLogout = async () => {
    try {
      liveStreamActions?.stop?.();
      const response = await fetch('/api/logout', {
        method: 'POST',
      });
      if (response.ok) {
        router.push('/');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('An error occurred during logout', error);
    }
  };

  const [overwrite, setOverwrite] = useState()
  const activeChartSheet = activeChartSheetId ? chartSheets?.[activeChartSheetId] : null;
  const activeChartMeta = activeChartSheet?.chartMeta || loadedChartMeta;

  const handleStartNewProject = () => {
    const ok = window.confirm("Start a new project? This clears your current loaded workspace state.");
    if (!ok) return;

    const blankSheets = { "sheet-1": { name: "Sheet 1", data: [], provenance: null } };
    const blankCharts = { "chart-1": { name: "Chart 1", snapshot: null, chartMeta: null } };

    setConnectedData?.([]);
    setDataSheets?.(blankSheets);
    setActiveSheetId?.("sheet-1");
    setChartSheets?.(blankCharts);
    setActiveChartSheetId?.("chart-1");

    setLoadedDataMeta?.(null);
    setLoadedDataId?.(null);
    setLoadedChartMeta?.(null);
    setLoadedChartBuilderSnapshot?.(null);
    setLoadedPresentationMeta?.(null);
    setConnectedPresentation?.(null);
    setChartDataOverride?.(null);
    setChartDataOverrideMeta?.(null);
    setProjectNameInput("");
    setOverwrite(false);
    setViewing?.("dataStart");
    toast.success("Started a new blank project.");
  };

  const saveAllChartsForProject = async (dataSetId, forceCreate = false, chartSheetsForSave = chartSheets) => {
    const entries = Object.entries(chartSheetsForSave || {});
    const nextSheets = {};
    for (let idx = 0; idx < entries.length; idx += 1) {
      const [chartId, sheet] = entries[idx];
      const chartMeta = sheet?.chartMeta || null;
      const chartName = sheet?.name || chartMeta?.chart_name || `Chart ${idx + 1}`;
      const snapshot =
        sheet?.snapshot ||
        chartMeta?.chart_properties?.[0]?.rechartsBuilder ||
        inferDefaultBuilderSnapshot(connectedData || []);
      const hasChartState = !!snapshot && (snapshot.selX || (Array.isArray(snapshot.selY) && snapshot.selY.length));
      const hasNamedChart = String(chartName || "").trim() !== "" && String(chartName || "").trim() !== `Chart ${idx + 1}`;
      const hasExistingChart = !!chartMeta?._id;
      if (!hasChartState && !hasNamedChart && !hasExistingChart) continue;
      const payload = {
        chart_name: chartName,
        chart_properties: [{ title: chartName, rechartsBuilder: snapshot }],
        last_saved_date: new Date(),
        labels: ['project'],
      };

      let saved = null;
      const canUpdateExisting = !forceCreate && chartMeta?._id && String(chartMeta?.data_set_id || dataSetId) === String(dataSetId);
      if (canUpdateExisting) {
        const updateRes = await fetch(`/api/charts/chart/${chartMeta._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const updateJson = await updateRes.json();
        saved = updateJson?.data || null;
      } else {
        const createRes = await fetch('/api/charts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            created_date: new Date(),
            user_id: user.userId,
            data_set_id: dataSetId,
          }),
        });
        const createJson = await createRes.json();
        saved = createJson?.data || null;
      }

      nextSheets[chartId] = {
        ...(sheet || {}),
        name: saved?.chart_name || chartName,
        chartMeta: saved || chartMeta || null,
        snapshot,
      };
    }
    if (Object.keys(nextSheets).length > 0) {
      setChartSheets?.(nextSheets);
      const active = nextSheets?.[activeChartSheetId] || Object.values(nextSheets)[0];
      setLoadedChartMeta?.(active?.chartMeta || null);
      setLoadedChartBuilderSnapshot?.(active?.snapshot || null);
    }
  };

  const generateDashboardOgImageDataUrl = (title, subtitle) => {
    try {
      if (typeof document === "undefined") return null;
      const w = 1200;
      const h = 630;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);

      const padX = 90;
      const maxW = w - padX * 2;
      const wrap = (text, font, lineHeight) => {
        ctx.font = font;
        const words = String(text || "").trim().split(/\s+/).filter(Boolean);
        const lines = [];
        let line = "";
        for (const word of words) {
          const next = line ? `${line} ${word}` : word;
          if (ctx.measureText(next).width <= maxW) {
            line = next;
            continue;
          }
          if (line) lines.push(line);
          line = word;
        }
        if (line) lines.push(line);
        return { lines, lineHeight };
      };

      const titleText = String(title || "").trim() || "Dashboard";
      const subtitleText = String(subtitle || "").trim();

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      const titleFont = "800 64px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
      const subFont = "500 34px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";

      const titleWrapped = wrap(titleText, titleFont, 78);
      const maxTitleLines = 3;
      const titleLines = titleWrapped.lines.slice(0, maxTitleLines);

      const subWrapped = subtitleText ? wrap(subtitleText, subFont, 48) : { lines: [], lineHeight: 48 };
      const maxSubLines = 3;
      const subLines = subWrapped.lines.slice(0, maxSubLines);

      let y = 120;
      ctx.font = titleFont;
      for (const ln of titleLines) {
        ctx.fillText(ln, padX, y);
        y += titleWrapped.lineHeight;
      }

      if (subLines.length) {
        y += 26;
        ctx.fillStyle = "rgba(255,255,255,0.82)";
        ctx.font = subFont;
        for (const ln of subLines) {
          ctx.fillText(ln, padX, y);
          y += subWrapped.lineHeight;
        }
      }

      // Small brand line
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "500 22px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
      ctx.fillText("lycheedata.com", padX, h - 70);

      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  };

  const uploadDashboardOgImage = async (dashboardId, title, subtitle) => {
    if (!dashboardId) return false;
    const imageDataUrl = generateDashboardOgImageDataUrl(title, subtitle);
    if (!imageDataUrl) return false;
    const ogRes = await fetch(`/api/chart-dashboards/og-image/${dashboardId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ imageDataUrl }),
    });
    const ogJson = await ogRes.json().catch(() => null);
    return !!(ogRes.ok && ogJson?.success);
  };

  const handleSave = async () => {
    const bump = (pct, msg) => {
      setSaveProjectProgress(pct);
      setSaveProjectMessage(msg);
    };
    try {
      const flushedSnapshot = typeof chartSnapshotFlusher === "function"
        ? await chartSnapshotFlusher()
        : null;
      const chartSheetsForSave = flushedSnapshot && activeChartSheetId
        ? {
            ...(chartSheets || {}),
            [activeChartSheetId]: {
              ...(chartSheets?.[activeChartSheetId] || { name: "Chart", chartMeta: null, snapshot: null }),
              snapshot: flushedSnapshot,
            },
          }
        : (chartSheets || {});
      const hasLoadedProject = !!loadedDataMeta?._id;
      const shouldOverwrite = hasLoadedProject && !!overwrite;
      const projectName = shouldOverwrite
        ? loadedDataMeta?.data_set_name
        : String(projectNameInput || "").trim();

      if (!projectName) {
        toast.error("Name your project before saving.");
        return;
      }

      setSaveProjectBusy(true);
      bump(6, "Saving in progress…");
      await new Promise((r) => requestAnimationFrame(r));

      const sanitizedSheets = Object.entries(dataSheets || {}).reduce((acc, [sheetId, sheet]) => {
        const rows = Array.isArray(sheet?.data) ? sheet.data : [];
        const name = String(sheet?.name || sheetId);
        const hasData = rows.length > 0;
        const hasName = !!name.trim();
        if (!hasData && !hasName) return acc;
        acc[sheetId] = {
          name: hasName ? name : sheetId,
          data: rows,
          provenance: sheet?.provenance ?? null,
        };
        return acc;
      }, {});

      const dataPayload = {
        data_set_name: projectName,
        data: connectedData || [],
        data_sheets: sanitizedSheets,
        last_saved_date: new Date(),
        labels: ['project'],
        source: 'project',
      };

      bump(18, "Preparing data sheets…");
      await new Promise((r) => requestAnimationFrame(r));

      let savedProject = null;
      bump(28, "Uploading project data…");
      if (shouldOverwrite) {
        const updateRes = await fetch(`/api/dataSets/dataSet/${loadedDataMeta._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataPayload),
        });
        const updateJson = await updateRes.json();
        savedProject = updateJson?.data || null;
      } else {
        const createRes = await fetch('/api/dataSets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...dataPayload,
            created_date: new Date(),
            user_id: user.userId,
          }),
        });
        const createJson = await createRes.json();
        savedProject = createJson?.data || null;
      }

      if (!savedProject?._id) {
        toast.error("Failed to save project.");
        return;
      }

      bump(48, "Saving charts…");
      await saveAllChartsForProject(savedProject._id, !shouldOverwrite, chartSheetsForSave);

      bump(68, "Indexing data…");
      await new Promise((r) => setTimeout(r, 280));

      bump(78, "Updating workspace…");
      setLoadedDataMeta(savedProject);
      setLoadedDataId(savedProject._id);
      setRefetchData(1);
      setRefetchChart(1);
      setChartDataOverride?.(null);
      setChartDataOverrideMeta?.(null);

      const dashDraft =
        chartDashboardDraft && typeof chartDashboardDraft === "object"
          ? { ...chartDashboardDraft, data_set_id: String(savedProject._id) }
          : null;
      const hasDashboardToSave =
        dashDraft &&
        dashDraft.data_set_id &&
        (dashDraft._id || (dashDraft.layout && typeof dashDraft.layout === "object"));
      if (hasDashboardToSave) {
        bump(88, "Saving dashboard…");
        const dashResult = await persistChartDashboardDraft({
          draft: dashDraft,
          userId: user.userId,
          includePublishFields: true,
        });
        if (!dashResult.ok) {
          toast.warning(dashResult.message);
        } else {
          const savedDashId = String(dashResult.created?._id || dashDraft._id || "");
          if (dashResult.created) {
            setChartDashboardDraft?.((prev) => mergeCreatedChartDashboardDraft(prev, dashResult.created));
            setActiveChartDashboardId?.(String(dashResult.created._id));
          }
          // If public, generate an OG cover image for link previews / SEO.
          if (dashDraft?.is_public && dashDraft?.public_slug && savedDashId) {
            bump(94, "Generating dashboard cover image…");
            await uploadDashboardOgImage(
              savedDashId,
              String(dashDraft.seo_title || dashDraft.page_heading || dashDraft.dashboard_name || "Dashboard"),
              String(dashDraft.page_subheading || ""),
            );
          }
          setRefetchChartDashboardsTick?.((t) => (t || 0) + 1);
          toast.success("Dashboard saved.");
        }
      }

      bump(100, "Saved successfully.");
      toast.success(shouldOverwrite ? "Project overwritten." : "New project saved.");
      await new Promise((r) => setTimeout(r, 480));
      setSaveIsOpen(false);
      setProjectNameInput("");
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error("Failed to save project.");
    } finally {
      setSaveProjectBusy(false);
      setSaveProjectProgress(0);
      setSaveProjectMessage("");
    }
  }

  const handleSaveProjectSubmit = (e) => {
    e.preventDefault();
    if (saveProjectBusy) return;
    handleSave();
  };

  const hydrateProjectCharts = async (dataSetId, preferredChartId = null) =>
    hydrateChartSheetsForDataSet({
      dataSetId,
      userId: user?.userId,
      preferredChartId,
      setSavedCharts,
      setChartSheets,
      setActiveChartSheetId,
      setLoadedChartMeta,
      setLoadedChartBuilderSnapshot,
    });

  const loadDataSheet = async (dataSetId, dataSet) => {
    if(loadedDataMeta && dataSetId === loadedDataMeta._id){
      setRefetchChartDashboardsTick?.((t) => (t || 0) + 1)
      setViewing('dataStart')
      setIsOpen(false)
    }else{
      fetch(`/api/dataSets/dataSet/${dataSetId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(response => response.json())
        .then(res =>{
          applyDataSetToWorkspace(res.data, { setDataSheets, setActiveSheetId, setConnectedData })
          setLoadedDataMeta(res.data || dataSet)
          hydrateProjectCharts(dataSetId)
          setRefetchChartDashboardsTick?.((t) => (t || 0) + 1)
          toast.success(`Data: ${res.data.data_set_name} loaded`, {
            duration: 99999999
          })
          setIsOpen(false)
          setViewing('dataStart')
        })
    }    
  }

  const loadOrphanProjectBucket = (row) => {
    if (!row || row.kind !== "orphan") return
    if (row.charts?.length) {
      const ch = row.charts[0]
      loadChart(ch._id, ch)
      return
    }
    if (row.dashboards?.length) {
      loadChartDashboard(row.dashboards[0]._id)
      return
    }
    toast.info("Nothing to load in this bucket yet.")
  }

  const loadChart = async (chartId, chartMeta) => {
    if(loadedChartMeta && chartId === loadedChartMeta._id){
      setViewing('charts')
      setIsOpen(false)
    }else{
      fetch(`/api/charts/chart/${chartId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(response => response.json())
        .then(res =>{
          console.log(res.data)
          //letting system know that a new chart has been propogated
          setLoadedChartMeta(chartMeta)
          const cp0 = Array.isArray(res.data.chart_properties) ? res.data.chart_properties[0] : res.data.chart_properties
          toast.success(`Chart: ${cp0?.title || res.data.chart_name || chartMeta?.chart_name} loaded`, {
            duration: 99999999
          })

          fetch(`/api/dataSets/dataSet/${chartMeta.data_set_id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }).then(response => response.json())
            .then(dataSheetRes =>{
              const rows = dataSheetRes?.data?.data || []
              applyDataSetToWorkspace(dataSheetRes?.data || {}, { setDataSheets, setActiveSheetId, setConnectedData })
              setLoadedDataMeta(savedDataSets.find(ds => ds._id === chartMeta.data_set_id))
              hydrateProjectCharts(chartMeta.data_set_id, chartMeta._id).then(() => {
                const incomingSnapshot = cp0?.rechartsBuilder
                const normalizedSnapshot = incomingSnapshot?.v === 1
                  ? incomingSnapshot
                  : inferDefaultBuilderSnapshot(rows)
                setLoadedChartBuilderSnapshot?.(normalizedSnapshot)
              })
          })
          setIsOpen(false)
          setViewing('charts')
        })
    }    
  }

  const loadChartDashboard = (dashboardId) => {
    if (!dashboardId) return;
    if (activeChartDashboardId && String(dashboardId) === String(activeChartDashboardId)) {
      setViewing("dashboardComposer");
      setIsOpen(false);
      return;
    }
    setActiveChartDashboardId?.(String(dashboardId));
    setChartDashboardDraft?.(null);
    setViewing("dashboardComposer");
    setIsOpen(false);
    toast.success("Loading dashboard…", { duration: 4000 });
  };

  const openDeleteDialog = async (type, item, event) => {
    event?.stopPropagation?.()
    const id = item?._id
    if (!id) return
    const kindLabel =
      type === "dataset"
        ? "data sheet"
        : type === "chart"
          ? "chart"
          : type === "presentation"
            ? "presentation"
            : "public page"
    try {
      const res = await fetch(`/api/assets/dependencies?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`, {
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        toast.error(json?.message || `Unable to inspect ${kindLabel} dependencies`)
        return
      }
      setDeleteTarget({
        type,
        id,
        name: json?.asset?.name || item?.data_set_name || item?.chart_name || item?.presentation_name || "Untitled",
      })
      setDeleteUses(Array.isArray(json?.uses) ? json.uses : [])
      setDeleteDownstream(false)
      setDeleteDialogOpen(true)
    } catch {
      toast.error(`Unable to inspect ${kindLabel} dependencies`)
    }
  }

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget?.id || !deleteTarget?.type) return
    try {
      setIsDeleteBusy(true)
      const res = await fetch("/api/assets/delete", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: deleteTarget.type,
          id: deleteTarget.id,
          deleteDownstream: deleteDownstream,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        toast.error(json?.message || "Delete failed")
        return
      }

      const t = deleteTarget.type
      if (t === "dataset") {
        if (loadedDataMeta?._id === deleteTarget.id) setLoadedDataMeta(null)
        setRefetchData?.(1)
        if (deleteDownstream) {
          if (loadedChartMeta?._id && (json?.uses || []).some((u) => u.kind === "chart" && u.id === loadedChartMeta._id)) {
            setLoadedChartMeta(null)
          }
          if (loadedPresentationMeta?._id && (json?.uses || []).some((u) => u.kind === "presentation" && u.id === loadedPresentationMeta._id)) {
            setLoadedPresentationMeta(null)
          }
          setRefetchChart?.(1)
          setRefetchPresentations?.(1)
        }
      } else if (t === "chart") {
        if (loadedChartMeta?._id === deleteTarget.id) {
          setLoadedChartMeta(null)
          setLoadedChartBuilderSnapshot?.(null)
        }
        setRefetchChart?.(1)
      } else if (t === "presentation") {
        if (loadedPresentationMeta?._id === deleteTarget.id) {
          setLoadedPresentationMeta(null)
          setConnectedPresentation?.(null)
        }
        setRefetchPresentations?.(1)
      } else if (t === "publicPage") {
        if (loadedChartMeta?._id === deleteTarget.id) {
          setLoadedChartMeta((prev) => (prev ? { ...prev, is_public: false, public_slug: undefined } : prev))
        }
        setRefetchChart?.(1)
      }

      toast.success("Deleted successfully")
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      setDeleteUses([])
      setDeleteDownstream(false)
    } catch {
      toast.error("Delete failed")
    } finally {
      setIsDeleteBusy(false)
    }
  }

  const renderDeleteButton = (type, item) => (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex shrink-0">
            <DestructiveIconButton onClick={(e) => openDeleteDialog(type, item, e)} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6} className="z-[100] text-xs">
          delete
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  useEffect(()=> {
    loadedChartMeta || loadedDataMeta && setOverwrite(true)
  }, [])

  useEffect(() => {
    if (!saveIsOpen) return;
    const hasProject = !!loadedDataMeta?.data_set_name;
    setOverwrite(hasProject);
    setProjectNameInput(hasProject ? "" : (loadedDataMeta?.data_set_name || ""));
  }, [saveIsOpen, loadedDataMeta?.data_set_name]);


  const breadcrumb = viewing === 'dashboardComposer' ? 'Lychee / Dashboard' :
    viewing === 'charts' ? 'Lychee / Charts' :
    (viewing === 'dataStart' || viewing === 'upload' || viewing === 'newSheet' || viewing === 'integrations') ? 'Lychee / Data' :
    viewing === 'ai' ? 'Lychee / AI' :
    viewing === 'scrape' ? 'Lychee / Scrape' :
    viewing ? `Lychee / ${viewing}` : 'Lychee';

  const showUnsavedFlag = connectedData && connectedData.length > 0 && !loadedDataMeta?.data_set_name && !loadedChartMeta?.chart_name;

  return (
    <div className="w-full flex flex-col items-start gap-2 px-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2 md:h-16">
          <div className="flex min-w-0 flex-1 items-center gap-2 pl-2">
            <div className="flex min-w-0 flex-1 items-baseline gap-1.5 overflow-hidden">
              <span className="text-sm font-semibold truncate">{breadcrumb}</span>
              {loadedDataMeta?.data_set_name && (
                <>
                  <span className="hidden shrink-0 text-sm text-muted-foreground/50 sm:inline" aria-hidden>
                    ·
                  </span>
                  <span
                    className="hidden min-w-0 truncate text-xs text-muted-foreground sm:inline"
                    title={loadedDataMeta.data_set_name}
                  >
                    {loadedDataMeta.data_set_name}
                  </span>
                </>
              )}
            </div>
          </div>
          { user ? (
              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:ml-auto sm:flex-nowrap">
                  {hasAnyStream && (
                    <div className="flex items-center gap-1 shrink-0 rounded-md border bg-muted/50 px-1 py-0.5">
                      {streamSheetIds.length > 1 && (
                        <select
                          className="text-xs bg-transparent border-0 rounded px-1 py-0.5 min-w-0 max-w-[80px]"
                          value={effectiveStreamSheetId || ""}
                          onChange={(e) => setSelectedStreamSheetId(e.target.value || null)}
                          title="Select sheet"
                        >
                          {streamSheetIds.map((id) => (
                            <option key={id} value={id}>
                              {dataSheets?.[id]?.name || id}
                            </option>
                          ))}
                        </select>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Pause" disabled={!currentStreamState?.isRunning || currentStreamState?.isPaused} onClick={() => liveStreamActions?.pause?.(effectiveStreamSheetId)}>
                        <Pause className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title={currentStreamState?.isPaused ? "Resume" : "Start"} onClick={() => liveStreamActions?.resume?.(effectiveStreamSheetId)}>
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Restart" onClick={() => liveStreamActions?.restart?.(effectiveStreamSheetId)}>
                        <RotateCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Stop" onClick={() => liveStreamActions?.stop?.(effectiveStreamSheetId)}>
                        <Square className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  {showUnsavedFlag && (
                    <span className="text-[7pt] px-2 py-1 rounded-sm bg-rose-100 text-rose-500  dark:text-amber-400 font-bold shrink-0">Viewing Unsaved Data</span>
                  )}
                  {(connectedData || (viewing === 'charts' && chartDataOverride)) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs font-medium"
                        onClick={handleStartNewProject}
                      >
                        New Project
                      </Button>
                  )}
                  {(connectedData || (viewing === 'charts' && chartDataOverride)) && (
                      <Dialog
                        open={saveIsOpen}
                        onOpenChange={(open) => {
                          if (!open && saveProjectBusy) return;
                          setSaveIsOpen(open);
                          if (open) {
                            setSaveProjectBusy(false);
                            setSaveProjectProgress(0);
                            setSaveProjectMessage("");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs font-medium">
                            Save Project
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Save Project</DialogTitle>
                            <DialogDescription className={saveProjectBusy ? "sr-only" : ""}>
                              Save all sheets and charts, and the open dashboard (layout plus publish settings if set)
                              in one project. Overwrite updates the loaded project; otherwise enter a new name.
                            </DialogDescription>
                          </DialogHeader>
                          {saveProjectBusy ? (
                            <div className="grid gap-3 py-2">
                              <p className="text-sm text-foreground" aria-live="polite">
                                {saveProjectMessage || "Working…"}
                              </p>
                              <Progress value={saveProjectProgress} className="h-2" />
                              <p className="text-xs text-muted-foreground tabular-nums">
                                {Math.min(100, Math.round(saveProjectProgress))}%
                              </p>
                            </div>
                          ) : (
                            <form onSubmit={handleSaveProjectSubmit}>
                              <div className="grid gap-4 py-4">
                                {loadedDataMeta?.data_set_name && (
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="overwrite" className="text-right">
                                      Overwrite current project?
                                    </Label>
                                    <Checkbox id="overwrite" checked={!!overwrite} onCheckedChange={setOverwrite}/>
                                  </div>
                                )}
                                {(!loadedDataMeta?.data_set_name || !overwrite) && (
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="project-name" className="text-right">
                                      Project Name
                                    </Label>
                                    <Input
                                      id="project-name"
                                      placeholder="myProject"
                                      className="col-span-3"
                                      value={projectNameInput}
                                      onChange={(e)=>setProjectNameInput(e.target.value)}
                                    />
                                  </div>
                                )}
                              </div>
                              <DialogFooter>
                                <Button type="submit">Save Project</Button>
                              </DialogFooter>
                            </form>
                          )}
                        </DialogContent>
                      </Dialog>
                  )}
                  <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs font-medium">
                        Your Projects
                        {savedWorkCountLoading ? (
                          <span
                            className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center"
                            aria-label="Loading saved work"
                          >
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          </span>
                        ) : (
                          <Badge variant="secondary" className="ml-0.5 h-4 min-h-4 px-1 py-0 text-[9px] leading-none">
                            {projectRows.length}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                        <SheetContent side={'left'} className="w-[1000px]! sm:max-w-4xl flex flex-col">
                          <SheetHeader>
                            <SheetTitle>Your Saved Work</SheetTitle>
                            <SheetDescription>
                              Load a project to open its workbook, charts, and dashboards together. Use the lists below to open a single chart or dashboard.
                            </SheetDescription>
                          </SheetHeader>
                          <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
                            {savedWorkCountLoading ? (
                              <div className="flex justify-center py-16" aria-label="Loading saved work">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              <>
                            {!projectRows.length && (
                              <p className="py-6 text-sm text-muted-foreground">No saved projects yet.</p>
                            )}
                            <div className="space-y-4 pb-6">
                              {projectRows.map((row) => {
                                const title =
                                  row.kind === "dataset"
                                    ? String(row.dataSet?.data_set_name || "").trim() || "Untitled project"
                                    : row.name
                                const ds = row.dataSet
                                return (
                                  <div
                                    key={row.key}
                                    className="rounded-lg border border-border bg-card/40 p-4 text-sm shadow-sm"
                                  >
                                    <Collapsible
                                      open={!!expandedProjectDetails[row.key]}
                                      onOpenChange={(open) =>
                                        setExpandedProjectDetails((prev) => ({ ...prev, [row.key]: open }))
                                      }
                                    >
                                      <div className="flex flex-wrap items-start gap-2">
                                        <div className="min-w-0 flex-1">
                                          <div className="font-semibold leading-tight">{title}</div>
                                          {row.kind === "dataset" && ds?.last_saved_date && (
                                            <div className="mt-0.5 text-xs text-muted-foreground">
                                              Edited: {moment(ds.last_saved_date).format("ddd MMM YY h:mm a")}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                                          {row.kind === "dataset" && ds?._id && (
                                            <Button
                                              type="button"
                                              variant="default"
                                              size="sm"
                                              className="h-7 px-2 text-xs"
                                              onClick={() => loadDataSheet(ds._id, ds)}
                                            >
                                              Load project
                                            </Button>
                                          )}
                                          {row.kind === "orphan" && (
                                            <Button
                                              type="button"
                                              variant="default"
                                              size="sm"
                                              className="h-7 px-2 text-xs"
                                              onClick={() => loadOrphanProjectBucket(row)}
                                            >
                                              Load project
                                            </Button>
                                          )}
                                          {row.kind === "dataset" && ds && renderDeleteButton("dataset", ds)}
                                          <CollapsibleTrigger asChild>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="icon"
                                              className="h-7 w-7 shrink-0 text-muted-foreground"
                                              aria-expanded={!!expandedProjectDetails[row.key]}
                                              aria-label={
                                                expandedProjectDetails[row.key]
                                                  ? "Collapse project details"
                                                  : "Expand project details"
                                              }
                                            >
                                              {expandedProjectDetails[row.key] ? (
                                                <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                              ) : (
                                                <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                              )}
                                            </Button>
                                          </CollapsibleTrigger>
                                        </div>
                                      </div>

                                      <CollapsibleContent className="mt-0 space-y-0">
                                    {row.kind === "dataset" && ds && (
                                      <button
                                        type="button"
                                        className="mt-3 w-full rounded-md border border-dashed border-muted-foreground/25 bg-muted/30 px-3 py-2 text-left text-xs transition hover:bg-muted/50"
                                        onClick={() => loadDataSheet(ds._id, ds)}
                                      >
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="font-medium">Workbook</span>
                                          {loadedDataMeta && String(loadedDataMeta._id) === String(ds._id) && (
                                            <Badge className="bg-green-200 text-black">Loaded</Badge>
                                          )}
                                        </div>
                                        <div className="text-muted-foreground">{ds.source || "project"}</div>
                                        {(ds.labels || []).length > 0 && (
                                          <div className="mt-1 flex flex-wrap gap-1">
                                            {(ds.labels || []).map((label) => (
                                              <Badge key={String(label)} variant="secondary" className="text-[10px]">
                                                {label}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </button>
                                    )}
                                    {row.kind === "orphan" && (
                                      <p className="mt-3 text-xs text-muted-foreground">
                                        These items are not linked to a saved project. Load opens the first chart (if any),
                                        otherwise the first dashboard.
                                      </p>
                                    )}

                                    <div className="mt-3 space-y-2">
                                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Charts
                                      </div>
                                      {row.charts.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">None in this project.</p>
                                      ) : (
                                        <ul className="flex flex-col gap-1.5">
                                          {row.charts.map((chart) => (
                                            <li key={chart._id}>
                                              <div className="flex flex-wrap items-center gap-2 rounded-md border border-transparent px-1 py-0.5 hover:border-muted">
                                                <button
                                                  type="button"
                                                  className="min-w-0 flex-1 truncate text-left text-xs underline-offset-2 hover:underline"
                                                  onClick={() => loadChart(chart._id, chart)}
                                                >
                                                  {chart.chart_name || "Untitled chart"}
                                                </button>
                                                {loadedChartMeta && String(loadedChartMeta._id) === String(chart._id) && (
                                                  <Badge className="bg-green-200 text-[10px] text-black">Loaded</Badge>
                                                )}
                                                {renderDeleteButton("chart", chart)}
                                              </div>
                                              <div className="pl-1 text-[10px] text-muted-foreground">
                                                {chart.last_saved_date
                                                  ? `Edited: ${moment(chart.last_saved_date).format("ddd MMM YY h:mm a")}`
                                                  : null}
                                              </div>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>

                                    <div className="mt-3 space-y-2">
                                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Dashboards
                                      </div>
                                      {row.dashboards.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">None in this project.</p>
                                      ) : (
                                        <ul className="flex flex-col gap-1.5">
                                          {row.dashboards.map((dash) => (
                                            <li key={dash._id}>
                                              <div className="flex flex-wrap items-center gap-2 rounded-md border border-transparent px-1 py-0.5 hover:border-muted">
                                                <button
                                                  type="button"
                                                  className="min-w-0 flex-1 truncate text-left text-xs underline-offset-2 hover:underline"
                                                  onClick={() => loadChartDashboard(dash._id)}
                                                >
                                                  {dash.dashboard_name || dash.page_heading || "Dashboard"}
                                                </button>
                                                {activeChartDashboardId &&
                                                  String(activeChartDashboardId) === String(dash._id) && (
                                                    <Badge className="bg-green-200 text-[10px] text-black">Loaded</Badge>
                                                  )}
                                              </div>
                                              <div className="pl-1 text-[10px] text-muted-foreground">
                                                {dash.last_edited_date
                                                  ? `Edited: ${moment(dash.last_edited_date).format("ddd MMM YY h:mm a")}`
                                                  : "—"}
                                              </div>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>

                                    {(row.publicCharts?.length > 0 || row.publicDashboards?.length > 0) && (
                                      <div className="mt-3 space-y-2 border-t pt-3">
                                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                          Live public pages
                                        </div>
                                        <ul className="space-y-2">
                                          {row.publicCharts.map((chart) => {
                                            const publicUrl = `${publicBase.replace(/\/$/, "")}/${encodeURIComponent(userHandle || "handle")}/charts/${encodeURIComponent(chart.public_slug)}`
                                            return (
                                              <li key={`pub-ch-${chart._id}`} className="rounded-md border bg-muted/20 p-2 text-xs">
                                                <div className="flex flex-wrap items-start gap-2">
                                                  <span className="min-w-0 flex-1 font-medium">{chart.chart_name}</span>
                                                  {renderDeleteButton("publicPage", chart)}
                                                </div>
                                                <a
                                                  href={publicUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="mt-1 inline-flex max-w-full items-center gap-1 break-all text-primary underline underline-offset-2"
                                                >
                                                  {publicUrl}
                                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                                </a>
                                              </li>
                                            )
                                          })}
                                          {row.publicDashboards.map((dash) => {
                                            const publicUrl = `${publicBase.replace(/\/$/, "")}/${encodeURIComponent(userHandle || "handle")}/dashboards/${encodeURIComponent(dash.public_slug)}`
                                            return (
                                              <li key={`pub-d-${dash._id}`} className="rounded-md border bg-muted/20 p-2 text-xs">
                                                <div className="flex flex-wrap items-start gap-2">
                                                  <span className="min-w-0 flex-1 font-medium">
                                                    {dash.page_heading || dash.dashboard_name || "Dashboard"}
                                                  </span>
                                                </div>
                                                <a
                                                  href={publicUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="mt-1 inline-flex max-w-full items-center gap-1 break-all text-primary underline underline-offset-2"
                                                >
                                                  {publicUrl}
                                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                                </a>
                                              </li>
                                            )
                                          })}
                                        </ul>
                                      </div>
                                    )}
                                      </CollapsibleContent>
                                    </Collapsible>
                                  </div>
                                )
                              })}
                            </div>
                              </>
                            )}
                          </div>
                        </SheetContent>
                  </Sheet>
                  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {deleteTarget?.type === "dataset" ? "data sheet" : deleteTarget?.type === "chart" ? "chart" : deleteTarget?.type === "presentation" ? "presentation" : "public page"}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {deleteUses.length > 0 ? (
                            <span>
                              This asset is currently used by {deleteUses.length} item(s). Deleting it can break those pages.
                            </span>
                          ) : (
                            <span>This action cannot be undone.</span>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      {deleteUses.length > 0 && (
                        <div className="max-h-40 overflow-y-auto rounded-md border p-2 text-xs">
                          {deleteUses.map((use) => (
                            <div key={`${use.kind}-${use.id}`} className="py-0.5">
                              {use.kind}: {use.name}{use.slug ? ` (${use.slug})` : ""}
                            </div>
                          ))}
                        </div>
                      )}
                      {deleteTarget?.type === "dataset" && deleteUses.length > 0 && (
                        <div className="flex items-center gap-2 rounded-md border p-2">
                          <Checkbox
                            id="delete-downstream"
                            checked={deleteDownstream}
                            onCheckedChange={(v) => setDeleteDownstream(!!v)}
                          />
                          <Label htmlFor="delete-downstream" className="text-xs cursor-pointer">
                            Delete all downstream data
                          </Label>
                        </div>
                      )}
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleteBusy}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={isDeleteBusy}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={(e) => {
                            e.preventDefault()
                            handleDeleteConfirmed()
                          }}
                        >
                          {isDeleteBusy ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="rounded-full h-9 w-9 overflow-hidden">
                        <UserAvatar
                          src={profilePic}
                          handle={userHandle}
                          name={user?.name}
                          email={user?.email}
                          size={36}
                          className="h-9 w-9"
                        />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuLabel>My Profile</DropdownMenuLabel>
                      <DropdownMenuItem  onClick={()=>setViewing('profilePage')}>Manage</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem  onClick={()=>setViewing('manageAccount')}>Billing</DropdownMenuItem>
                      <DropdownMenuItem>Support</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={()=>handleLogout()}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
                <AnimatedThemeToggler className="h-9 w-9 shrink-0 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center" />
              </div>
            ) : (
              <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:ml-auto">
                {connectedData && (
                  <span className="flex-1 text-right text-xs text-muted-foreground hidden sm:inline whitespace-nowrap">
                    Register to save your work
                  </span>
                )}
                <Button variant="default" size="sm" onClick={() => router.push('/login')}>Log In</Button>
                <AnimatedThemeToggler className="h-9 w-9 shrink-0 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center" />
              </div>
            )}
    </div>
  )
}

export default Nav;