'use client';

import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { CONNECT_PROJECT_LOAD_IDLE } from '@/lib/connectProjectLoad';
import { coerceDataTypes } from '@/lib/coerceDataTypes';
import { isComposeBucketMsColumn } from '@/lib/composeDateDisplay';
import { composeFieldDisplayNameMap } from '@/lib/connectComposeDisplayLabels';
import {
  CONNECT_WORKSPACE,
  CONNECT_BLANK_SHEET_SEED_ROWS,
  isConnectIntegrationWorkspace,
  isConnectWarmIntegration,
} from '@/lib/connectHomeWorkspace';
import { pingAthenaLakeConnection } from '@/lib/athenaLakePing';
import { connectHomeAnySheetHasData } from '@/lib/connectHomePullDestination';

const stateV2Noop = () => {};
const defaultLiveStreamActions = {
  start: stateV2Noop,
  stop: stateV2Noop,
  pause: stateV2Noop,
  resume: stateV2Noop,
  restart: stateV2Noop,
};

/** Defaults so client hooks (e.g. LiveStreamManager) never crash outside a provider. */
export const StateContextV2 = createContext({
  setLiveStreamActions: stateV2Noop,
  setLiveStreamState: stateV2Noop,
  setSheetData: stateV2Noop,
  liveStreamActions: defaultLiveStreamActions,
  liveStreamState: { streamsBySheetId: {} },
});

// Custom hook for using the created context
export function useMyStateV2(){
    return useContext(StateContextV2);
}

export const StateProviderV2 = ({children, initialSettings}) => {
    /* Admin states */
    const [userHandle, setUserHandle] = useState()
    const [profilePic, setProfilePic] = useState()
    const [isLifeTimeMember, setIsLifeTimeMember] = useState()
    const [settings, setSettings] = useState(initialSettings)
    const [isDemo, setIsDemo] = useState(!!initialSettings?.demo)
    const [viewing, setViewing] = useState(
      initialSettings?.viewing || "connectDataHome",
    )
    const [integrationSidebar, setIntegrationSidebar] = useState(initialSettings?.integrationSidebar ?? null) // 'polymarket' | 'polymarketHistorical' | 'kalshiHistorical' | 'coinGecko' | etc.
    const [rightPanelOpen, setRightPanelOpen] = useState(!!initialSettings?.rightPanelOpen) // unified right-side panel (integrations/charts)
    const [rightPanelTab, setRightPanelTab] = useState(initialSettings?.rightPanelTab || 'integrations') // 'integrations' | 'charts' | 'export'

    /** Inline workspace below Connect hub (upload, blank sheet, integration id, …). */
    const [connectWorkspace, setConnectWorkspace] = useState(null);
    const [connectWorkspaceScrollTick, setConnectWorkspaceScrollTick] = useState(0);
    /** Increment to smooth-scroll Connect home to the integration query builder. */
    const [connectComposeScrollTick, setConnectComposeScrollTick] = useState(0);
    /** Increment to trigger compose pull from Connect home inline editor. */
    const [connectDataLakePullTick, setConnectDataLakePullTick] = useState(0);
    /** Connect home Step 2: slide in app SideNav when sheet has data. */
    const [connectHomeLeftNavOpen, setConnectHomeLeftNavOpen] = useState(false);
    /** Connect home: platform step rail expanded (false = off-canvas + peek tab). */
    const [connectHomeFlowStepsOpen, setConnectHomeFlowStepsOpen] = useState(true);
    /** Connect home Step 2: scroll + show analyze sheet region. */
    const [connectHomeAnalyzeActive, setConnectHomeAnalyzeActive] = useState(false);
    /** Main canvas: sheet grid vs chart vs dashboard (right drawer tab is separate). */
    const [connectHomeCenterView, setConnectHomeCenterView] = useState("sheet");
    const [connectAnalyzeScrollTick, setConnectAnalyzeScrollTick] = useState(0);
    /** Shared pull progress for inline Step 2 + minimized right drawer. */
    const [connectDataLakePullState, setConnectDataLakePullState] = useState({
        loading: false,
        label: '',
        progress: 0,
        error: null,
    });
    /** Saved project load — drives Connect home sheet skeleton + progress bar. */
    const [connectProjectLoadState, setConnectProjectLoadState] = useState(CONNECT_PROJECT_LOAD_IDLE);
    /** Kalshi/Polymarket lake sample id chosen on Connect home (e.g. athena-kal-markets). */
    const [connectDataLakeSampleId, setConnectDataLakeSampleId] = useState("");
    /** Connect home data-lake column picks keyed by sample id (Kalshi + Polymarket historical). */
    const [connectDataLakeColumnSelections, setConnectDataLakeColumnSelections] = useState({});
    /** Connect home Polymarket API endpoint query id (e.g. listMarkets). */
    const [connectApiEndpointId, setConnectApiEndpointId] = useState("");
    /** Connect home API column picks keyed by endpoint query id. */
    const [connectApiColumnSelections, setConnectApiColumnSelections] = useState({});
    /** Connect home live stream symbol (chainlink pair or binance symbol). */
    const [connectLiveSourceId, setConnectLiveSourceId] = useState("");
    /** Connect home live stream column picks keyed by symbol id. */
    const [connectLiveColumnSelections, setConnectLiveColumnSelections] = useState({});
    /** Tick to trigger API / live-stream pulls from Connect home hidden bridges. */
    const [connectIntegrationPullTick, setConnectIntegrationPullTick] = useState(0);
    /** Connect home: optional name applied to active sheet on Run pull. */
    const [connectHomePendingSheetName, setConnectHomePendingSheetName] = useState("");
    /** Connect home: replace active sheet vs add new sheet when data already exists. */
    const [connectHomePullDestination, setConnectHomePullDestination] = useState("replace");
    /** Athena test-ping status per lake sample id (idle | loading | ok | error). */
    const [athenaPingBySampleId, setAthenaPingBySampleId] = useState({});
    /** Connect home: refine operation panels open below the hub (stacked: where, join, sort, …). */
    const [connectActiveComposeOps, setConnectActiveComposeOps] = useState([]);
    /** Shared compose state (Connect inline + Kalshi integrations panel). */
    const [dataLakeColumnComposeItems, setDataLakeColumnComposeItems] = useState([]);
    const [dataLakeComposeOrderBy, setDataLakeComposeOrderBy] = useState([]);
    const [dataLakeComposeLimitOpen, setDataLakeComposeLimitOpen] = useState(false);
    const [dataLakeComposeLimitValue, setDataLakeComposeLimitValue] = useState("");
    const [dataLakeComposeWhereFilters, setDataLakeComposeWhereFilters] = useState([]);
    const [dataLakeComposeHavingFilters, setDataLakeComposeHavingFilters] = useState([]);
    const [dataLakeComposeJoins, setDataLakeComposeJoins] = useState([]);

    /* Dashboard and bento state */
    const [dashData, setDashData] = useState([{
        "Icon": 'CubeIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "Data",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '56px',
            'animation': '',
        },
        "description": "Upload, integrate, generate scrape or start With a blank slate ",
        "description_style": {
            'fontWeight': 500,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '16px',
        },
        "refType": "internal",
        "href": "",
        "cta": "Go",
        "navTo": "dataStart",
        "className": "col-span-3 lg:col-span-1",
        "background":"",
        "background_color": "",
    },
    {
        "Icon": 'TargetIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "Athena",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '56px',
            'animation': '',
        },
        "description": "Play with Lychee's AI",
        "description_style": {
            'fontWeight': 500,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '20px',
        },
        "className": "col-span-3 lg:col-span-1",
        "refType": "internal",
        "href": "",
        "cta": "Go",
        "navTo": "ai",
        "background": "",
        "background_color": "",
    },
    {
        "Icon": 'QuestionMarkIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "How To's",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '56px',
            'animation': '',
        },
        "description": "Learn how to use Lychee",
        "description_style": {
            'fontWeight': 500,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '16px',
        },
        "refType": "external",
        "href": "https://misterrpink.beehiiv.com/",
        "cta": "Go",
        "navTo": "",
        "className": "col-span-1 lg:col-span-1",
        "background": "",
        "background_color": "",
    },
    {
        "Icon": 'MixIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "Integrate",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '56px',
            'animation': '',
        },
        "description": "Pull data from CoinGecko, Twitter, Wall St Bets, Reddit, Stripe, SEC EDGAR...",
        "description_style": {
            'fontWeight': 500,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '16px',
        },
        "refType": "internal",
        "href": "",
        "cta": "Start",
        "navTo": "integrations",
        "className": "col-span-3 lg:col-span-2",
        "background": "globe",
        "background_color": "",
    },
    {
        "Icon": 'HeartFilledIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "Created By",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '24px',
            'animation': '',
        },
        "description": "@misterrpink1",
        "description_style": {
            'fontWeight': 500,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '20px',
        },
        "refType": "external",
        "className": "col-span-3 lg:col-span-1",
        "href": "https://twitter.com/misterrpink1",
        "cta": "Learn more",
        "background": "",
        "background_color": "",
    },
    {
        "Icon": 'BarChartIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "Present your Findings",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '24px',
            'animation': '',
        },
        "description": "With Mind-blowing charts, visualizations and more",
        "description_style": {
            'fontWeight': 500,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '20px',
        },
        "className": "col-span-3 lg:col-span-2",
        "refType": "internal",
        "href": "/",
        "cta": "Learn more",
        "navTo": "charts",
        "background": "",
        "background_color": "",
    },
    {
        "Icon": 'RocketIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "85% Off",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '56px',
            'animation': '',
        },
        "description": "Life Time Access Once Time Payment",
        "description_style": {
            'fontWeight': 500,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '16px',
        },
        "refType": "external",
        "href": "https://buy.stripe.com/aEUaGYfkW9L04wgbJ3",
        "cta": "Go",
        "navTo": "charts",
        "className": "col-span-1 lg:col-span-1",
        "background": "",
        "background_color": "",
    },
    ])
    const [bentoContainer, setBentoContainer] = useState({
        'background' : 'dotPattern',
        'background_color': ''
    })

    /*data management*/
    const [dataSetName, setDataSetName] = useState()
    const [refetchData, setRefetchData] = useState()
    const [refetchChart, setRefetchChart] = useState()
    const [refetchPresentations, setRefetchPresentations] = useState()

    //all saved DataSets
    const [savedDataSets, setSavedDataSets] = useState()
    const [loadedDataMeta, setLoadedDataMeta] = useState()
    const [loadedDataId, setLoadedDataId] = useState()
    
    //all saved Charts
    const [savedCharts, setSavedCharts] = useState()
    const [loadedChartMeta, setLoadedChartMeta ] = useState()

    /** Chart-backed dashboards (composer) */
    const [savedChartDashboards, setSavedChartDashboards] = useState()
    const [activeChartDashboardId, setActiveChartDashboardId] = useState(null)
    const [chartDashboardDraft, setChartDashboardDraft] = useState(null)
    const [selectedDashboardCard, setSelectedDashboardCard] = useState(null)
    const [refetchChartDashboardsTick, setRefetchChartDashboardsTick] = useState(0)
    /** Incremented to ask Nav to open the unified Save Project dialog (charts / sheets / dashboards). */
    const [saveProjectDialogNonce, setSaveProjectDialogNonce] = useState(0)
    const requestSaveProjectDialog = useCallback(() => {
        setSaveProjectDialogNonce((n) => n + 1)
    }, [])
    /** Which page text block the shared format dock edits (`null` = closed). */
    const [pageFormatDockTarget, setPageFormatDockTargetBase] = useState(null)
    /** Selected dashboard chart card for the chart composer dock (`null` = closed). */
    const [chartComposerDock, setChartComposerDock] = useState(null)
    /** Sidebar chart dropdown to highlight (e.g. after Add Chart) — `{ rowId, colId }`. */
    const [chartPickerEmphasis, setChartPickerEmphasis] = useState(null)
    /** Set by DashboardComposerPage while a draft is open: Add Chart / Add Text for the bottom dock. */
    const [dashboardComposerLayoutActions, setDashboardComposerLayoutActions] = useState(null)
    const setPageFormatDockTarget = useCallback((target) => {
      const isFreeTextTarget =
        target &&
        typeof target === "object" &&
        (target.type === "freeTextHeading" || target.type === "freeTextParagraph");
      if (target === "pageTitle" || target === "pageSubheading" || isFreeTextTarget) {
        setChartComposerDock(null)
        setChartPickerEmphasis(null)
      }
      setPageFormatDockTargetBase(target)
    }, [])
    const setPageTitleFormatDockOpen = useCallback((open) => {
      if (open) {
        setChartComposerDock(null)
        setChartPickerEmphasis(null)
      }
      setPageFormatDockTargetBase(open ? "pageTitle" : null)
    }, [])
    const pageTitleFormatDockOpen = pageFormatDockTarget != null
    
    //all saved presentations
    const [savedPresentations, setSavedPresentations] = useState()
    const [loadedPresentationMeta, setLoadedPresentationMeta] = useState()
    const [connectedPresentation, setConnectedPresentation] = useState()

    // Data sheets: user can have multiple sheets (Sheet 1, Sheet 2, ...); each can have its own data and optional live stream
    // `provenance` stores the structured query that produced the sheet (so we can re-run it server-side as a CTE).
    const [dataSheets, setDataSheets] = useState(() => ({ 'sheet-1': { name: 'Sheet 1', data: [], provenance: null } }));
    const [activeSheetId, setActiveSheetId] = useState('sheet-1');

    //Connected Data is active working data (derived from active sheet)
    const [dataConnected, setDataConnected] = useState()
    const connectedData = useMemo(() => dataSheets[activeSheetId]?.data ?? [], [dataSheets, activeSheetId]);
    const setConnectedData = useCallback((value) => {
      setDataSheets((prev) => {
        const sheet = prev[activeSheetId] || { name: 'Sheet 1', data: [] };
        const raw = typeof value === 'function' ? value(sheet.data || []) : value;
        const data = Array.isArray(raw) ? coerceDataTypes(raw) : (raw != null && typeof raw === 'object' ? coerceDataTypes([raw]) : sheet.data || []);
        return { ...prev, [activeSheetId]: { ...sheet, data } };
      });
    }, [activeSheetId]);

    const addNewSheetAndActivate = useCallback((onNewSheet, options) => {
      let newId;
      setDataSheets((prev) => {
        const keys = Object.keys(prev);
        const nextNum = keys.length + 1;
        newId = `sheet-${nextNum}`;
        return { ...prev, [newId]: { name: `Sheet ${nextNum}`, data: [] } };
      });
      const activate = () => {
        setActiveSheetId(newId);
        if (typeof onNewSheet === 'function') onNewSheet(newId);
      };
      if (options?.syncActivate) {
        flushSync(activate);
      } else {
        setTimeout(activate, 0);
      }
    }, []);

    const replaceCurrentSheetData = useCallback((data) => {
      const raw = Array.isArray(data) ? data : (data != null ? [data] : []);
      setDataSheets((prev) => ({
        ...prev,
        [activeSheetId]: { ...(prev[activeSheetId] || { name: 'Sheet 1' }), data: coerceDataTypes(raw) },
      }));
    }, [activeSheetId]);

    const setSheetData = useCallback((sheetId, value) => {
      setDataSheets((prev) => {
        const sheet = prev[sheetId] || { name: `Sheet ${sheetId}`, data: [] };
        const raw = typeof value === 'function' ? value(sheet.data || []) : value;
        const data = Array.isArray(raw) ? coerceDataTypes(raw) : (raw != null && typeof raw === 'object' ? coerceDataTypes([raw]) : sheet.data || []);
        return { ...prev, [sheetId]: { ...sheet, data } };
      });
    }, []);

    const pingAthenaLakeSample = useCallback(async ({ sampleId, lake, table }) => {
      const id = String(sampleId || "").trim();
      const lakeName = String(lake || "").trim();
      const tableName = String(table || "").trim();
      if (!id || !lakeName || !tableName) return;
      setAthenaPingBySampleId((prev) => ({ ...(prev || {}), [id]: "loading" }));
      try {
        await pingAthenaLakeConnection({ lake: lakeName, table: tableName });
        setAthenaPingBySampleId((prev) => ({ ...(prev || {}), [id]: "ok" }));
      } catch {
        setAthenaPingBySampleId((prev) => ({ ...(prev || {}), [id]: "error" }));
      }
    }, []);

    const requestConnectDataLakePull = useCallback(() => {
      setConnectHomeAnalyzeActive(true);
      setConnectDataLakePullState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        label: "Preparing your data pull…",
        progress: 2,
      }));
      setConnectDataLakePullTick((t) => t + 1);
      setConnectAnalyzeScrollTick((t) => t + 1);
    }, []);

    const requestConnectIntegrationPull = useCallback(() => {
      setConnectHomeAnalyzeActive(true);
      setConnectDataLakePullState({
        loading: true,
        error: null,
        label: "Preparing your data pull…",
        progress: 2,
      });
      setConnectIntegrationPullTick((t) => t + 1);
      setConnectAnalyzeScrollTick((t) => t + 1);
    }, []);

    const requestConnectAnalyzeScroll = useCallback(() => {
      setConnectHomeAnalyzeActive(true);
      setConnectAnalyzeScrollTick((t) => t + 1);
    }, []);

    const requestConnectComposeScroll = useCallback(() => {
      setConnectComposeScrollTick((t) => t + 1);
    }, []);

    const resetConnectAnalyzeFlow = useCallback(() => {
      setConnectHomeAnalyzeActive(false);
      setConnectHomeCenterView("sheet");
      setConnectHomeLeftNavOpen(false);
      setConnectDataLakePullState({
        loading: false,
        label: "",
        progress: 0,
        error: null,
      });
    }, []);

    const requestConnectWorkspace = useCallback((id, options) => {
      if (!id) {
        setConnectWorkspace(null);
        setConnectDataLakeSampleId("");
        setConnectDataLakeColumnSelections({});
        setConnectApiEndpointId("");
        setConnectApiColumnSelections({});
        setConnectLiveSourceId("");
        setConnectLiveColumnSelections({});
        setConnectHomePendingSheetName("");
        setConnectHomePullDestination("replace");
        setAthenaPingBySampleId({});
        setConnectActiveComposeOps([]);
        setDataLakeColumnComposeItems([]);
        setDataLakeComposeOrderBy([]);
        setDataLakeComposeLimitOpen(false);
        setDataLakeComposeLimitValue("");
        setDataLakeComposeWhereFilters([]);
        setDataLakeComposeHavingFilters([]);
        setDataLakeComposeJoins([]);
        resetConnectAnalyzeFlow();
        return;
      }
      if (id === CONNECT_WORKSPACE.PROJECT) {
        setConnectWorkspace(id);
        setDataConnected(true);
        const shouldScroll =
          options?.scroll === true ||
          (options?.scroll !== false && !isConnectWarmIntegration(id));
        if (shouldScroll) {
          setConnectWorkspaceScrollTick((t) => t + 1);
        }
        return;
      }
      setConnectDataLakeSampleId("");
      setConnectDataLakeColumnSelections({});
      setConnectApiEndpointId("");
      setConnectApiColumnSelections({});
      setConnectLiveSourceId("");
      setConnectLiveColumnSelections({});
      setConnectHomePendingSheetName("");
      setConnectHomePullDestination("replace");
      setAthenaPingBySampleId({});
      setConnectActiveComposeOps([]);
      setDataLakeColumnComposeItems([]);
      setDataLakeComposeOrderBy([]);
      setDataLakeComposeLimitOpen(false);
      setDataLakeComposeLimitValue("");
      setDataLakeComposeWhereFilters([]);
      setDataLakeComposeHavingFilters([]);
      setDataLakeComposeJoins([]);
      resetConnectAnalyzeFlow();
      if (id === CONNECT_WORKSPACE.UPLOAD || id === CONNECT_WORKSPACE.INTEGRATIONS_PICKER) {
        setDataSheets({ 'sheet-1': { name: 'Sheet 1', data: [], provenance: null } });
        setActiveSheetId('sheet-1');
        setDataConnected(false);
        setLoadedDataId(null);
        setLoadedDataMeta(null);
      }
      if (id === CONNECT_WORKSPACE.BLANK) {
        setDataSheets({
          'sheet-1': {
            name: 'Sheet 1',
            data: [...CONNECT_BLANK_SHEET_SEED_ROWS],
            provenance: null,
          },
        });
        setActiveSheetId('sheet-1');
        setDataConnected(true);
        setLoadedDataId(null);
        setLoadedDataMeta(null);
        setIntegrationSidebar(null);
        setConnectHomeAnalyzeActive(true);
        setConnectHomeCenterView('sheet');
        setConnectAnalyzeScrollTick((t) => t + 1);
      }
      if (id === CONNECT_WORKSPACE.INTEGRATIONS_PICKER) {
        setIntegrationSidebar((prev) => prev ?? 'polymarket');
        setRightPanelTab('integrations');
        setRightPanelOpen(true);
      }
      if (isConnectIntegrationWorkspace(id)) {
        setIntegrationSidebar(id);
      }
      setConnectWorkspace(id);
      const shouldScroll =
        options?.scroll === true ||
        (options?.scroll !== false && !isConnectWarmIntegration(id));
      if (shouldScroll) {
        setConnectWorkspaceScrollTick((t) => t + 1);
      }
    }, [
      resetConnectAnalyzeFlow,
      setDataSheets,
      setActiveSheetId,
      setDataConnected,
      setLoadedDataId,
      setLoadedDataMeta,
      setIntegrationSidebar,
      setRightPanelTab,
      setRightPanelOpen,
      setConnectHomeAnalyzeActive,
      setConnectHomeCenterView,
      setConnectAnalyzeScrollTick,
    ]);
    const [connectedCols, setConnectedCols] = useState() //cols of fresh data
    const [tempData, setTempData] = useState() //holder state; whenver new data comes, tempData holds the previous state incase an action was a mistake

    //datatypes
    const [dataTypes, setDataTypes] = useState({});
    const [dataTypeMismatch, setDataTypeMismatch] = useState(false);

    // Summarization: tables created from frequency count, contingency, etc. Kept in memory alongside main data.
    const [summarizationTables, setSummarizationTables] = useState([]);
    // When charting a summary table, ChartView uses this instead of connectedData. Does not override main data.
    const [chartDataOverride, setChartDataOverride] = useState(null);
    const [chartDataOverrideMeta, setChartDataOverrideMeta] = useState(null); // { type, title, summarizationId }
    // Snapshot used to hydrate ChartBuilder state when loading an existing saved chart.
    const [loadedChartBuilderSnapshot, setLoadedChartBuilderSnapshot] = useState(null);
    const [chartSheets, setChartSheets] = useState(() => ({
      "chart-1": { name: "Chart 1", snapshot: null, chartMeta: null, userCreated: false },
    }));
    const [activeChartSheetId, setActiveChartSheetId] = useState(null);

    // Polymarket WebSocket live price feed: controls and preset for line chart (time/price)
    const [polymarketWsState, setPolymarketWsState] = useState({
      isRunning: false,
      stop: null,
      start: null,
      assetIds: null,
      chartPreset: null, // { type: 'line', xKey: 'time', yKey: 'price' } when user clicks Chart
    });

    // Chainlink (RTDS crypto_prices_chainlink) live feed: keep sidebar mounted on Charts so WS stays alive
    const [chainlinkWsState, setChainlinkWsState] = useState({
      isRunning: false,
      stop: null,
      start: null,
      chartPreset: { type: 'line', xKey: 'time', yKey: 'value' },
    });

    // App-level live streams: multiple streams keyed by sheetId (streamsBySheetId)
    const [liveStreamState, setLiveStreamState] = useState({
      streamsBySheetId: {},
    });
    const noop = useCallback(() => {}, []);
    const [liveStreamActions, setLiveStreamActions] = useState({
      start: noop,
      stop: noop,
      pause: noop,
      resume: noop,
      restart: noop,
    });

    const cancelConnectDataFeedPull = useCallback(() => {
      setConnectDataLakePullState({
        loading: false,
        label: "",
        progress: 0,
        error: null,
      });

      const streamsBySheetId = liveStreamState?.streamsBySheetId || {};
      Object.entries(streamsBySheetId).forEach(([sheetId, stream]) => {
        if (stream?.isRunning || stream?.connecting) {
          liveStreamActions?.stop?.(sheetId);
        }
      });

      const hasData = connectHomeAnySheetHasData(dataSheets, connectedData);
      if (!hasData) {
        setConnectHomeAnalyzeActive(false);
        setConnectComposeScrollTick((t) => t + 1);
        return;
      }

      setConnectHomeAnalyzeActive(true);
      const sheetWithData = Object.entries(dataSheets || {}).find(
        ([, sheet]) => Array.isArray(sheet?.data) && sheet.data.length > 0,
      );
      if (sheetWithData) {
        const [sheetId] = sheetWithData;
        if (sheetId !== activeSheetId) setActiveSheetId(sheetId);
      }
      setConnectAnalyzeScrollTick((t) => t + 1);
    }, [
      activeSheetId,
      connectedData,
      dataSheets,
      liveStreamActions,
      liveStreamState?.streamsBySheetId,
    ]);

    const [chartSnapshotFlusher, setChartSnapshotFlusher] = useState(() => async () => null);

    const addNewChartAndActivate = useCallback((onNewChart) => {
      setChartSheets((prev) => {
        const keys = Object.keys(prev || {});
        const nextNum = keys.length + 1;
        const newId = `chart-${nextNum}`;
        setTimeout(() => {
          setActiveChartSheetId(newId);
          if (typeof onNewChart === "function") onNewChart(newId);
        }, 0);
        return {
          ...(prev || {}),
          [newId]: { name: `Chart ${nextNum}`, snapshot: null, chartMeta: null, userCreated: true },
        };
      });
    }, []);

    // Memoize the context value to optimize performance
    const providerValue = useMemo(() => ({
        settings, setSettings, viewing, setViewing, connectedData, setConnectedData, connectedCols, setConnectedCols, dataTypes, setDataTypes, dataTypeMismatch, setDataTypeMismatch
    }), [settings, viewing, connectedCols, dataTypes, dataTypeMismatch]);
    

    useEffect(() => {
        if (connectedData && connectedData.length > 0) {
            const detectedDataTypes = determineDataTypes(connectedData);
            setDataTypes((prev) => {
                const merged = { ...prev };
                let changed = false;
                for (const [k, v] of Object.entries(detectedDataTypes)) {
                    if (merged[k] !== v) {
                        merged[k] = v;
                        changed = true;
                    }
                }
                if (!changed) return prev;
                return merged;
            });

            const keys = Object.keys(connectedData[0]).filter((key) => !isComposeBucketMsColumn(key));
            const displayNames = composeFieldDisplayNameMap(dataLakeColumnComposeItems);
            setConnectedCols(
                keys.map((key) => ({
                    field: key,
                    ...(displayNames[key] ? { headerName: displayNames[key] } : {}),
                    cellDataType: detectedDataTypes[key] || "text",
                }))
            );
        }
    }, [connectedData, dataLakeColumnComposeItems]);

    useEffect(() => {
        if (!connectedData?.length) return;
        const detectedDataTypes = determineDataTypes(connectedData);
        setDataTypeMismatch(checkDataTypeMismatch(detectedDataTypes, dataTypes));
    }, [connectedData, dataTypes]);

    const detectDataType = (value) => {
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'boolean') return 'boolean';
        if (value instanceof Date) return 'date';
        // Scientific notation parses as finite Number() but must not use AG Grid `number` cells with raw strings.
        if (typeof value === 'string') {
          const ts = value.trim();
          if (ts && /^-?\d*\.?\d+[eE][+-]?\d+$/.test(ts)) return 'text';
        }
        // If value is a long string representing a number, treat it as text
        if (typeof value === 'string' && value.length > 15 && !isNaN(parseFloat(value))) return 'text';
        if (typeof value === 'number' && Number.isNaN(value)) return 'number';
        if (typeof value === 'number' && isFinite(value)) return 'number';
        if (typeof value === 'string' && value !== '' && !isNaN(parseFloat(value)) && isFinite(Number(value))) return 'number';
        if (typeof value === 'object' && value !== null) return 'object';
        return 'text';
    };

    const determineDataTypes = (data) => {
        const types = {};
        if (!data.length) return types;
        const keySet = new Set();
        for (const row of data) {
          if (row && typeof row === 'object') Object.keys(row).forEach((k) => keySet.add(k));
        }
        for (const key of keySet) {
          let t = 'text';
          for (const row of data) {
            if (!row || typeof row !== 'object') continue;
            const v = row[key];
            if (v == null || v === '') continue;
            const dt = detectDataType(v);
            if (dt === 'number' || dt === 'date' || dt === 'boolean') {
              t = dt;
              break;
            }
            if (dt !== 'text') {
              t = dt;
              break;
            }
          }
          types[key] = t;
        }
        return types;
      };

    const checkDataTypeMismatch = (detectedDataTypes, existingDataTypes) => {
        return Object.keys(detectedDataTypes).some(key => detectedDataTypes[key] !== existingDataTypes[key]);
    };

    //when we save we need to load meta; this is how we do it 
    useEffect(() => {
        savedDataSets && savedDataSets[loadedDataId] && setLoadedDataMeta(savedDataSets.loadedDataId) 
    }, [loadedDataId, savedDataSets])


    return (
        <StateContextV2.Provider value={{providerValue, isDemo, setIsDemo, dashData, setDashData, bentoContainer, setBentoContainer, viewing, setViewing, integrationSidebar, setIntegrationSidebar, rightPanelOpen, setRightPanelOpen, rightPanelTab, setRightPanelTab, connectWorkspace, setConnectWorkspace, connectWorkspaceScrollTick, requestConnectWorkspace, connectComposeScrollTick, requestConnectComposeScroll, connectDataLakePullTick, requestConnectDataLakePull, connectHomeLeftNavOpen, setConnectHomeLeftNavOpen, connectHomeFlowStepsOpen, setConnectHomeFlowStepsOpen, connectHomeAnalyzeActive, setConnectHomeAnalyzeActive, connectHomeCenterView, setConnectHomeCenterView, connectAnalyzeScrollTick, requestConnectAnalyzeScroll, connectDataLakePullState, setConnectDataLakePullState, connectProjectLoadState, setConnectProjectLoadState, connectDataLakeSampleId, setConnectDataLakeSampleId, connectDataLakeColumnSelections, setConnectDataLakeColumnSelections, connectApiEndpointId, setConnectApiEndpointId, connectApiColumnSelections, setConnectApiColumnSelections, connectLiveSourceId, setConnectLiveSourceId, connectLiveColumnSelections, setConnectLiveColumnSelections, connectIntegrationPullTick, requestConnectIntegrationPull, cancelConnectDataFeedPull, connectHomePendingSheetName, setConnectHomePendingSheetName, connectHomePullDestination, setConnectHomePullDestination, athenaPingBySampleId, setAthenaPingBySampleId, pingAthenaLakeSample, connectActiveComposeOps, setConnectActiveComposeOps, dataLakeColumnComposeItems, setDataLakeColumnComposeItems, dataLakeComposeOrderBy, setDataLakeComposeOrderBy, dataLakeComposeLimitOpen, setDataLakeComposeLimitOpen, dataLakeComposeLimitValue, setDataLakeComposeLimitValue, dataLakeComposeWhereFilters, setDataLakeComposeWhereFilters, dataLakeComposeHavingFilters, setDataLakeComposeHavingFilters, dataLakeComposeJoins, setDataLakeComposeJoins, connectedData, setConnectedData, dataConnected, setDataConnected, tempData, setTempData, connectedCols, setConnectedCols, dataSetName, setDataSetName, savedDataSets, setSavedDataSets, loadedDataMeta, setLoadedDataMeta, savedCharts, setSavedCharts, loadedChartMeta, setLoadedChartMeta, savedChartDashboards, setSavedChartDashboards, activeChartDashboardId, setActiveChartDashboardId, chartDashboardDraft, setChartDashboardDraft, selectedDashboardCard, setSelectedDashboardCard, refetchChartDashboardsTick, setRefetchChartDashboardsTick, saveProjectDialogNonce, requestSaveProjectDialog, pageFormatDockTarget, setPageFormatDockTarget, chartComposerDock, setChartComposerDock, chartPickerEmphasis, setChartPickerEmphasis, dashboardComposerLayoutActions, setDashboardComposerLayoutActions, pageTitleFormatDockOpen, setPageTitleFormatDockOpen, savedPresentations, setSavedPresentations, loadedPresentationMeta, setLoadedPresentationMeta, connectedPresentation, setConnectedPresentation, refetchData, setRefetchData, refetchChart, setRefetchChart, refetchPresentations, setRefetchPresentations, loadedDataId ,setLoadedDataId, dataTypes, setDataTypes, dataTypeMismatch, setDataTypeMismatch, userHandle, setUserHandle, profilePic, setProfilePic, isLifeTimeMember, setIsLifeTimeMember, summarizationTables, setSummarizationTables, chartDataOverride, setChartDataOverride, chartDataOverrideMeta, setChartDataOverrideMeta, loadedChartBuilderSnapshot, setLoadedChartBuilderSnapshot, chartSheets, setChartSheets, activeChartSheetId, setActiveChartSheetId, addNewChartAndActivate, chartSnapshotFlusher, setChartSnapshotFlusher, polymarketWsState, setPolymarketWsState, chainlinkWsState, setChainlinkWsState, liveStreamState, setLiveStreamState, liveStreamActions, setLiveStreamActions, dataSheets, setDataSheets, activeSheetId, setActiveSheetId, addNewSheetAndActivate, replaceCurrentSheetData, setSheetData}}>
            {children}
        </StateContextV2.Provider>
    )
}

  