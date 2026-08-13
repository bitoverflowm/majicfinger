'use client';

import React, { createContext, useState, useContext, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { pingKalshiLiveExchange } from '@/lib/kalshiLive/kalshiLivePing';
import { KALSHI_LIVE_DEFAULT_LIMIT } from '@/config/kalshiLiveConnect';
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
  setLiveFeedActions: stateV2Noop,
  setLiveFeedState: stateV2Noop,
  setSheetData: stateV2Noop,
  liveStreamActions: defaultLiveStreamActions,
  liveStreamState: { streamsBySheetId: {} },
  liveFeedActions: defaultLiveStreamActions,
  liveFeedState: { feedsById: {} },
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
    const [guidedWorkflowPull, setGuidedWorkflowPull] = useState(!!initialSettings?.guidedWorkflowPull)
    const [guidedWorkflowPullRequested, setGuidedWorkflowPullRequested] = useState(
      !!initialSettings?.guidedWorkflowPullRequested,
    )
    /** Dashboard Kalshi guided handoff after Run — shell hosts post-pull overlay (no nested DashBody). */
    const [connectHomeGuidedSession, setConnectHomeGuidedSession] = useState(
      initialSettings?.connectHomeGuidedSession ?? null,
    )
    const [runYourselfLocked, setRunYourselfLocked] = useState(!!initialSettings?.runYourselfLocked)
    const [runYourselfSessionActive, setRunYourselfSessionActive] = useState(
      !!initialSettings?.runYourselfSessionActive,
    )
    const [workspaceWriteLocked, setWorkspaceWriteLocked] = useState(
      !!initialSettings?.workspaceWriteLocked,
    )
    const [viewing, setViewing] = useState(
      initialSettings?.viewing || "connectDataHome",
    )
    const [integrationSidebar, setIntegrationSidebar] = useState(initialSettings?.integrationSidebar ?? null) // 'polymarket' | 'polymarketHistorical' | 'kalshiHistorical' | 'coinGecko' | etc.
    const [rightPanelOpen, setRightPanelOpen] = useState(!!initialSettings?.rightPanelOpen) // unified right-side panel (integrations/charts)
    const [rightPanelTab, setRightPanelTab] = useState(initialSettings?.rightPanelTab || 'integrations') // 'integrations' | 'requestHistory' | 'powerMoves' | 'charts' | 'export' | 'dashboard'
    /** Available power move after a qualifying pull (e.g. 'event_candlesticks'), or null. */
    const [connectPowerMove, setConnectPowerMove] = useState(/** @type {string | null} */ (null))
    /** Live progress while a power move builds a dashboard (waterfall charts). */
    const [connectPowerMoveBuild, setConnectPowerMoveBuild] = useState(
      /** @type {{ active: boolean; label: string; progress: number; error: string | null } | null} */ (null),
    )

    /** Inline workspace below Connect hub (upload, blank sheet, integration id, …). */
    const [connectWorkspace, setConnectWorkspace] = useState(initialSettings?.connectWorkspace ?? null);
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
    const [connectHomeAnalyzeActive, setConnectHomeAnalyzeActive] = useState(
      !!initialSettings?.connectHomeAnalyzeActive,
    );
    /** Main canvas: sheet grid vs chart vs dashboard (right drawer tab is separate). */
    const [connectHomeCenterView, setConnectHomeCenterView] = useState("sheet");
    const [connectAnalyzeScrollTick, setConnectAnalyzeScrollTick] = useState(0);
    /** Shared pull progress for inline Step 2 + minimized right drawer. */
    const [connectDataLakePullState, setConnectDataLakePullState] = useState(
      initialSettings?.connectDataLakePullState ?? {
        loading: false,
        label: '',
        progress: 0,
        error: null,
        /** Connect home Step 2: large Athena pull JSON browse (mirrors hidden bridge panel). */
        largePullView: null,
      },
    );
    /** Set by DataLakeParquetPanel bridge; invoked from ConnectHomeAnalyzeSection. */
    const connectLargePullApplyRef = useRef(null);
    /** Abort in-flight connect home data pulls (Athena ingest, Kalshi Live, etc.). */
    const connectDataLakePullAbortRef = useRef(null);
    /** Each connectDataLakePullTick is consumed once (survives panel remount during boot). */
    const connectDataLakePullConsumedTickRef = useRef(0);
    /** Guided inline pull — hub draft snapshot for compose filter fallback. */
    const guidedWorkflowHubDraftRef = useRef(initialSettings?.guidedWorkflowHubDraft ?? null);
    /** Saved project load — drives Connect home sheet skeleton + progress bar. */
    const [connectProjectLoadState, setConnectProjectLoadState] = useState(CONNECT_PROJECT_LOAD_IDLE);
    /** Kalshi/Polymarket lake sample id chosen on Connect home (e.g. athena-kal-markets). */
    const [connectDataLakeSampleId, setConnectDataLakeSampleId] = useState(
      initialSettings?.connectDataLakeSampleId ?? "",
    );
    /** Connect home data-lake column picks keyed by sample id (Kalshi + Polymarket historical). */
    const [connectDataLakeColumnSelections, setConnectDataLakeColumnSelections] = useState(
      initialSettings?.connectDataLakeColumnSelections ?? {},
    );
    /** Connect home Polymarket API endpoint query id (e.g. listMarkets). */
    const [connectApiEndpointId, setConnectApiEndpointId] = useState("");
    /** Connect home API column picks keyed by endpoint query id. */
    const [connectApiColumnSelections, setConnectApiColumnSelections] = useState({});
    /** Polymarket Live Get Event/Events compose (search vs advanced list filters). */
    const [connectPolymarketLiveEventsCompose, setConnectPolymarketLiveEventsCompose] = useState(
      /** @type {import("@/lib/polymarketLive/eventsCompose").PolymarketEventsComposeState | null} */ (null),
    );
    const [connectPolymarketLiveMarketsByEventsCompose, setConnectPolymarketLiveMarketsByEventsCompose] =
      useState(
        /** @type {import("@/lib/polymarketLive/marketsByEventsCompose").PolymarketMarketsByEventsComposeState | null} */ (
          null
        ),
      );
    const [connectPolymarketLiveMarketsCompose, setConnectPolymarketLiveMarketsCompose] = useState(
      /** @type {import("@/lib/polymarketLive/marketsCompose").PolymarketMarketsComposeState | null} */ (
        null
      ),
    );
    const [connectPolymarketLiveHoldersByMarketsCompose, setConnectPolymarketLiveHoldersByMarketsCompose] =
      useState(
        /** @type {import("@/lib/polymarketLive/holdersByMarketsCompose").PolymarketHoldersByMarketsComposeState | null} */ (
          null
        ),
      );
    const [connectPolymarketLiveOpenInterestCompose, setConnectPolymarketLiveOpenInterestCompose] =
      useState(
        /** @type {import("@/lib/polymarketLive/openInterestCompose").PolymarketOpenInterestComposeState | null} */ (
          null
        ),
      );
    /** Connect home live stream symbol (chainlink pair or binance symbol). */
    const [connectLiveSourceId, setConnectLiveSourceId] = useState("");
    /** Connect home live stream column picks keyed by symbol id. */
    const [connectLiveColumnSelections, setConnectLiveColumnSelections] = useState({});
    /** Kalshi Live API endpoint id (e.g. markets). */
    const [connectKalshiLiveEndpointId, setConnectKalshiLiveEndpointId] = useState("");
    /** Kalshi Live column picks keyed by endpoint id. */
    const [connectKalshiLiveColumnSelections, setConnectKalshiLiveColumnSelections] = useState({});
    /** Kalshi Live API filters (status / timestamp) — not SQL WHERE. */
    const [connectKalshiLiveFilters, setConnectKalshiLiveFilters] = useState([]);
    const [connectKalshiLiveLimit, setConnectKalshiLiveLimit] = useState(KALSHI_LIVE_DEFAULT_LIMIT);
    /** Kalshi Live GET /markets/{ticker} — comma-separated market tickers (1–100). */
    const [connectKalshiLiveTickers, setConnectKalshiLiveTickers] = useState("");
    /** Kalshi Live markets: ticker → market title (for sheet name hover). */
    const [connectKalshiLiveMarketsTickerMeta, setConnectKalshiLiveMarketsTickerMeta] = useState(
      /** @type {Record<string, string>} */ ({}),
    );
    /** Kalshi Live markets: combined sheet vs one sheet per market. */
    const [connectKalshiLiveMarketsSheetMode, setConnectKalshiLiveMarketsSheetMode] = useState(
      /** @type {"combined" | "per_market"} */ ("per_market"),
    );
    /** Markets discovery mode: GET /markets list filters instead of per-ticker GET. */
    const [connectKalshiLiveMarketsDiscoveryMode, setConnectKalshiLiveMarketsDiscoveryMode] =
      useState(false);
    const [connectKalshiLiveMarketsDiscoveryStatus, setConnectKalshiLiveMarketsDiscoveryStatus] =
      useState("");
    const [
      connectKalshiLiveMarketsDiscoveryMveFilter,
      setConnectKalshiLiveMarketsDiscoveryMveFilter,
    ] = useState(/** @type {"only" | "exclude" | "include"} */ ("exclude"));
    const [
      connectKalshiLiveMarketsDiscoveryEventTicker,
      setConnectKalshiLiveMarketsDiscoveryEventTicker,
    ] = useState("");
    const [
      connectKalshiLiveMarketsDiscoverySeriesTicker,
      setConnectKalshiLiveMarketsDiscoverySeriesTicker,
    ] = useState("");
    const [
      connectKalshiLiveMarketsDiscoveryTickers,
      setConnectKalshiLiveMarketsDiscoveryTickers,
    ] = useState("");
    const [
      connectKalshiLiveMarketsDiscoveryMinCreatedTs,
      setConnectKalshiLiveMarketsDiscoveryMinCreatedTs,
    ] = useState(/** @type {number | ""} */ (""));
    const [
      connectKalshiLiveMarketsDiscoveryMaxCreatedTs,
      setConnectKalshiLiveMarketsDiscoveryMaxCreatedTs,
    ] = useState(/** @type {number | ""} */ (""));
    const [
      connectKalshiLiveMarketsDiscoveryMinUpdatedTs,
      setConnectKalshiLiveMarketsDiscoveryMinUpdatedTs,
    ] = useState(/** @type {number | ""} */ (""));
    const [
      connectKalshiLiveMarketsDiscoveryMinCloseTs,
      setConnectKalshiLiveMarketsDiscoveryMinCloseTs,
    ] = useState(/** @type {number | ""} */ (""));
    const [
      connectKalshiLiveMarketsDiscoveryMaxCloseTs,
      setConnectKalshiLiveMarketsDiscoveryMaxCloseTs,
    ] = useState(/** @type {number | ""} */ (""));
    const [
      connectKalshiLiveMarketsDiscoveryMinSettledTs,
      setConnectKalshiLiveMarketsDiscoveryMinSettledTs,
    ] = useState(/** @type {number | ""} */ (""));
    const [
      connectKalshiLiveMarketsDiscoveryMaxSettledTs,
      setConnectKalshiLiveMarketsDiscoveryMaxSettledTs,
    ] = useState(/** @type {number | ""} */ (""));
    /** Historical v2 markets discovery: which ticker param to send (or general / none). */
    const [
      connectKalshiHistoricalV2MarketsDiscoveryScope,
      setConnectKalshiHistoricalV2MarketsDiscoveryScope,
    ] = useState(/** @type {"event" | "series" | "markets" | "general"} */ ("event"));
    /** Historical v2 trades: when false, send is_block_trade=false upstream. */
    const [
      connectKalshiHistoricalV2TradesIncludeBlockTrades,
      setConnectKalshiHistoricalV2TradesIncludeBlockTrades,
    ] = useState(true);
    /** Kalshi Live GET /events/{event_ticker} — comma-separated event tickers (1–100). */
    const [connectKalshiLiveEventsTickers, setConnectKalshiLiveEventsTickers] = useState("");
    /** Kalshi Live events: ticker → title (for sheet name hover). */
    const [connectKalshiLiveEventsTickerMeta, setConnectKalshiLiveEventsTickerMeta] = useState(
      /** @type {Record<string, string>} */ ({}),
    );
    /** Kalshi Live events: combined sheet vs one sheet per event. */
    const [connectKalshiLiveEventsSheetMode, setConnectKalshiLiveEventsSheetMode] = useState(
      /** @type {"combined" | "per_event"} */ ("per_event"),
    );
    /** Include nested markets for events (`with_nested_markets`). */
    const [connectKalshiLiveEventsIncludeMarkets, setConnectKalshiLiveEventsIncludeMarkets] =
      useState(false);
    /** nested = 1 event row with markets JSON; per_market = expand markets. */
    const [connectKalshiLiveEventsRowMode, setConnectKalshiLiveEventsRowMode] = useState(
      /** @type {"nested" | "per_market"} */ ("nested"),
    );
    /** Events discovery mode: GET /events list filters instead of per-ticker GET. */
    const [connectKalshiLiveEventsDiscoveryMode, setConnectKalshiLiveEventsDiscoveryMode] =
      useState(false);
    const [connectKalshiLiveEventsDiscoveryStatus, setConnectKalshiLiveEventsDiscoveryStatus] =
      useState("");
    const [
      connectKalshiLiveEventsDiscoverySeriesTicker,
      setConnectKalshiLiveEventsDiscoverySeriesTicker,
    ] = useState("");
    const [
      connectKalshiLiveEventsDiscoveryTickers,
      setConnectKalshiLiveEventsDiscoveryTickers,
    ] = useState("");
    const [
      connectKalshiLiveEventsDiscoveryMinCloseTs,
      setConnectKalshiLiveEventsDiscoveryMinCloseTs,
    ] = useState(/** @type {number | ""} */ (""));
    const [
      connectKalshiLiveEventsDiscoveryMinUpdatedTs,
      setConnectKalshiLiveEventsDiscoveryMinUpdatedTs,
    ] = useState(/** @type {number | ""} */ (""));

    /** Kalshi Live GET /events/multivariate — series ticker filter (semantic search). */
    const [connectKalshiLiveMultivariateEventsSeriesTicker, setConnectKalshiLiveMultivariateEventsSeriesTicker] =
      useState("");
    /** Kalshi Live multivariate events — collection ticker (manual; mutually exclusive with series). */
    const [
      connectKalshiLiveMultivariateEventsCollectionTicker,
      setConnectKalshiLiveMultivariateEventsCollectionTicker,
    ] = useState("");
    /** Include nested markets for multivariate events (`with_nested_markets`). */
    const [
      connectKalshiLiveMultivariateEventsIncludeMarkets,
      setConnectKalshiLiveMultivariateEventsIncludeMarkets,
    ] = useState(false);
    /** nested = 1 event row with markets JSON; per_market = expand markets. */
    const [
      connectKalshiLiveMultivariateEventsRowMode,
      setConnectKalshiLiveMultivariateEventsRowMode,
    ] = useState(/** @type {"nested" | "per_market"} */ ("nested"));
    /** Kalshi Live candlesticks: market ticker(s), comma/newline separated (1–100). */
    const [connectKalshiLiveCandlestickTickers, setConnectKalshiLiveCandlestickTickers] = useState("");
    /** Kalshi Live candlesticks: ticker → title/timing meta (for sheet names + realtime gates). */
    const [connectKalshiLiveCandlestickTickerMeta, setConnectKalshiLiveCandlestickTickerMeta] =
      useState(/** @type {Record<string, string | { title?: string; status?: string; openTime?: string; closeTime?: string; seriesTicker?: string }>} */ ({}));
    /** Kalshi Live event candlesticks: the single event ticker to pull. */
    const [connectKalshiLiveEventCandlesticksEventTicker, setConnectKalshiLiveEventCandlesticksEventTicker] =
      useState("");
    /** Kalshi Live event candlesticks: the parent series ticker (deduced or manual). */
    const [connectKalshiLiveEventCandlesticksSeriesTicker, setConnectKalshiLiveEventCandlesticksSeriesTicker] =
      useState("");
    /** Kalshi Live event candlesticks: event ticker → title (for hover/labels). */
    const [connectKalshiLiveEventCandlesticksTickerMeta, setConnectKalshiLiveEventCandlesticksTickerMeta] =
      useState(/** @type {Record<string, string>} */ ({}));
    /** Compose-time intent: start event-candlesticks live feed after submit. */
    const [connectKalshiLiveRealtimeFeedEnabled, setConnectKalshiLiveRealtimeFeedEnabled] =
      useState(false);
    /** Compose-time live poll interval (ms); clamped to candle period on start. */
    const [connectKalshiLiveRealtimePollIntervalMs, setConnectKalshiLiveRealtimePollIntervalMs] =
      useState(/** @type {number | null} */ (null));
    /** Market candlesticks: subset of active tickers to stream when realtime is enabled. */
    const [connectKalshiLiveRealtimeMarketTickers, setConnectKalshiLiveRealtimeMarketTickers] =
      useState(/** @type {string[]} */ ([]));
    /** Kalshi Live event forecast: the single event ticker to pull. */
    const [connectKalshiLiveEventForecastEventTicker, setConnectKalshiLiveEventForecastEventTicker] =
      useState("");
    /** Kalshi Live event forecast: the parent series ticker (deduced or manual). */
    const [connectKalshiLiveEventForecastSeriesTicker, setConnectKalshiLiveEventForecastSeriesTicker] =
      useState("");
    /** Kalshi Live event forecast: event ticker → title (for hover/labels). */
    const [connectKalshiLiveEventForecastTickerMeta, setConnectKalshiLiveEventForecastTickerMeta] =
      useState(/** @type {Record<string, string>} */ ({}));
    /** Kalshi Live event forecast: display percentiles (0–99.99), default even spread. */
    const [connectKalshiLiveEventForecastPercentilePcts, setConnectKalshiLiveEventForecastPercentilePcts] =
      useState(/** @type {number[]} */ ([10, 25, 50, 75, 90]));
    /** Kalshi Live social leaderboard: rank metric (API metric_name). */
    const [connectKalshiLiveLeaderboardMetricName, setConnectKalshiLiveLeaderboardMetricName] =
      useState("projected_pnl");
    /** Kalshi Live social leaderboard: time_period. */
    const [connectKalshiLiveLeaderboardTimePeriod, setConnectKalshiLiveLeaderboardTimePeriod] =
      useState("weekly");
    /** Kalshi Live social leaderboard: optional category (series taxonomy). */
    const [connectKalshiLiveLeaderboardCategory, setConnectKalshiLiveLeaderboardCategory] =
      useState("");
    /** Kalshi Live social leaderboard: custom category when Other is selected. */
    const [
      connectKalshiLiveLeaderboardCategoryOther,
      setConnectKalshiLiveLeaderboardCategoryOther,
    ] = useState("");
    /** Kalshi Live social holder profile: nickname to look up. */
    const [connectKalshiLiveHolderProfileNickname, setConnectKalshiLiveHolderProfileNickname] =
      useState("");
    /** Kalshi Live social trades-by-holder filters. */
    const [connectKalshiLiveHolderTradesNickname, setConnectKalshiLiveHolderTradesNickname] =
      useState("");
    const [connectKalshiLiveHolderTradesSeriesTicker, setConnectKalshiLiveHolderTradesSeriesTicker] =
      useState("");
    const [connectKalshiLiveHolderTradesEventTicker, setConnectKalshiLiveHolderTradesEventTicker] =
      useState("");
    const [connectKalshiLiveHolderTradesMinAmount, setConnectKalshiLiveHolderTradesMinAmount] =
      useState("");
    /** Kalshi Live search traders by nickname. */
    const [connectKalshiLiveSearchTradersQuery, setConnectKalshiLiveSearchTradersQuery] =
      useState("");
    const [
      connectKalshiLiveSearchTradersIncludeMetrics,
      setConnectKalshiLiveSearchTradersIncludeMetrics,
    ] = useState(false);
    const [
      connectKalshiLiveSearchTradersIncludeHoldings,
      setConnectKalshiLiveSearchTradersIncludeHoldings,
    ] = useState(false);
    const [
      connectKalshiLiveSearchTradersSelectedNickname,
      setConnectKalshiLiveSearchTradersSelectedNickname,
    ] = useState("");
    /** Kalshi Live trades: market ticker(s), comma/newline separated (1–100). */
    const [connectKalshiLiveTradesTicker, setConnectKalshiLiveTradesTicker] = useState("");
    /** Kalshi Live trades: ticker → market title (for sheet name hover). */
    const [connectKalshiLiveTradesTickerMeta, setConnectKalshiLiveTradesTickerMeta] =
      useState(/** @type {Record<string, string>} */ ({}));
    /** Kalshi Live orderbook: market ticker(s), comma/newline separated (1–100). */
    const [connectKalshiLiveOrderbookTicker, setConnectKalshiLiveOrderbookTicker] = useState("");
    /** Kalshi Live orderbook: ticker → market title (for sheet name hover). */
    const [connectKalshiLiveOrderbookTickerMeta, setConnectKalshiLiveOrderbookTickerMeta] =
      useState(/** @type {Record<string, string>} */ ({}));
    /** Kalshi Live GET /series/{series_ticker} — comma-separated series tickers (1–100). */
    const [connectKalshiLiveSeriesTicker, setConnectKalshiLiveSeriesTicker] = useState("");
    /** Kalshi Live series: ticker → series title (for sheet name hover). */
    const [connectKalshiLiveSeriesTickerMeta, setConnectKalshiLiveSeriesTickerMeta] = useState(
      /** @type {Record<string, string>} */ ({}),
    );
    /** Kalshi Live series: combined sheet vs one sheet per series. */
    const [connectKalshiLiveSeriesSheetMode, setConnectKalshiLiveSeriesSheetMode] = useState(
      /** @type {"combined" | "per_series"} */ ("per_series"),
    );
    /** Series discovery mode: GET /series list filters instead of semantic ticker search. */
    const [connectKalshiLiveSeriesDiscoveryMode, setConnectKalshiLiveSeriesDiscoveryMode] =
      useState(false);
    const [connectKalshiLiveSeriesDiscoveryCategory, setConnectKalshiLiveSeriesDiscoveryCategory] =
      useState("");
    const [connectKalshiLiveSeriesDiscoveryTag, setConnectKalshiLiveSeriesDiscoveryTag] =
      useState("");
    const [
      connectKalshiLiveSeriesDiscoveryIncludeProductMetadata,
      setConnectKalshiLiveSeriesDiscoveryIncludeProductMetadata,
    ] = useState(false);
    const [
      connectKalshiLiveSeriesDiscoveryMinUpdatedTs,
      setConnectKalshiLiveSeriesDiscoveryMinUpdatedTs,
    ] = useState(/** @type {number | ""} */ (""));
    /** Kalshi Live compose Where filters (all endpoints; API + client-side). */
    const [connectKalshiLiveWhereFilters, setConnectKalshiLiveWhereFilters] = useState([]);
    /** Kalshi Live compose Sort clauses (client-side). */
    const [connectKalshiLiveSortClauses, setConnectKalshiLiveSortClauses] = useState([]);
    /** Kalshi Live exchange status ping (idle | loading | ok | error). */
    const [kalshiLivePingState, setKalshiLivePingState] = useState("idle");
    /** Tick to trigger API / live-stream pulls from Connect home hidden bridges. */
    const [connectIntegrationPullTick, setConnectIntegrationPullTick] = useState(0);
    /** Connect home: optional name applied to active sheet on Run pull. */
    const [connectHomePendingSheetName, setConnectHomePendingSheetName] = useState("");
    /** Connect home: replace active sheet vs add new sheet when data already exists. */
    const [connectHomePullDestination, setConnectHomePullDestination] = useState("new_sheet");
    /** Athena test-ping status per lake sample id (idle | loading | ok | error). */
    const [athenaPingBySampleId, setAthenaPingBySampleId] = useState({});
    /** Connect home: refine operation panels open below the hub (stacked: where, join, sort, …). */
    const [connectActiveComposeOps, setConnectActiveComposeOps] = useState(
      Array.isArray(initialSettings?.connectActiveComposeOps)
        ? initialSettings.connectActiveComposeOps
        : [],
    );
    /** Shared compose state (Connect inline + Kalshi integrations panel). */
    const [dataLakeColumnComposeItems, setDataLakeColumnComposeItems] = useState(
      Array.isArray(initialSettings?.dataLakeColumnComposeItems)
        ? initialSettings.dataLakeColumnComposeItems
        : [],
    );
    const [dataLakeComposeOrderBy, setDataLakeComposeOrderBy] = useState(
      Array.isArray(initialSettings?.dataLakeComposeOrderBy)
        ? initialSettings.dataLakeComposeOrderBy
        : [],
    );
    const [dataLakeComposeLimitOpen, setDataLakeComposeLimitOpen] = useState(
      !!initialSettings?.dataLakeComposeLimitOpen,
    );
    const [dataLakeComposeLimitValue, setDataLakeComposeLimitValue] = useState(
      initialSettings?.dataLakeComposeLimitValue ?? "",
    );
    const [dataLakeComposeLimitScope, setDataLakeComposeLimitScope] = useState(
      initialSettings?.dataLakeComposeLimitScope ?? "primary",
    );
    const [dataLakeComposeWhereFilters, setDataLakeComposeWhereFilters] = useState(
      Array.isArray(initialSettings?.dataLakeComposeWhereFilters)
        ? initialSettings.dataLakeComposeWhereFilters
        : [],
    );
    const [dataLakeComposeHavingFilters, setDataLakeComposeHavingFilters] = useState(
      Array.isArray(initialSettings?.dataLakeComposeHavingFilters)
        ? initialSettings.dataLakeComposeHavingFilters
        : [],
    );
    const [dataLakeComposeJoins, setDataLakeComposeJoins] = useState(
      Array.isArray(initialSettings?.dataLakeComposeJoins)
        ? initialSettings.dataLakeComposeJoins
        : [],
    );

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
    /** Optional post-save hook (e.g. publish chart/dashboard after project save). Cleared on cancel or success. */
    const pendingSaveProjectSuccessRef = useRef(null)
    const [saveProjectDialogIntent, setSaveProjectDialogIntent] = useState(null)
    const requestSaveProjectDialog = useCallback((options = {}) => {
        pendingSaveProjectSuccessRef.current =
            typeof options?.onSuccess === "function" ? options.onSuccess : null
        setSaveProjectDialogIntent(options?.intent ? String(options.intent) : null)
        setSaveProjectDialogNonce((n) => n + 1)
    }, [])
    /** Which page text block the shared format dock edits (`null` = closed). */
    const [pageFormatDockTarget, setPageFormatDockTargetBase] = useState(null)
    /** Selected dashboard chart card for the chart composer dock (`null` = closed). */
    const [chartComposerDock, setChartComposerDockBase] = useState(null)
    /** Selected data card grid section for the composer dock (`null` = closed). */
    const [cardGridComposerDock, setCardGridComposerDockBase] = useState(null)
    const setChartComposerDock = useCallback((dock) => {
      if (dock) setCardGridComposerDockBase(null)
      setChartComposerDockBase(dock)
    }, [])
    const setCardGridComposerDock = useCallback((dock) => {
      if (dock) {
        setChartComposerDockBase(null)
        setChartPickerEmphasis(null)
      }
      setCardGridComposerDockBase(dock)
    }, [])
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
        setCardGridComposerDockBase(null)
      }
      setPageFormatDockTargetBase(target)
    }, [])
    const setPageTitleFormatDockOpen = useCallback((open) => {
      if (open) {
        setChartComposerDock(null)
        setChartPickerEmphasis(null)
        setCardGridComposerDockBase(null)
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
        const nextNum =
          keys.reduce((max, k) => {
            const n = parseInt(String(k).replace(/\D/g, ""), 10) || 0;
            return Math.max(max, n);
          }, 0) + 1;
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

    const pingKalshiLiveExchangeStatus = useCallback(async () => {
      setKalshiLivePingState("loading");
      try {
        const { ok } = await pingKalshiLiveExchange();
        setKalshiLivePingState(ok ? "ok" : "error");
      } catch {
        setKalshiLivePingState("error");
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
        largePullView: null,
      });
    }, []);

    const requestConnectWorkspace = useCallback((id, options) => {
      if (!id) {
        setConnectWorkspace(null);
        setConnectDataLakeSampleId("");
        setConnectDataLakeColumnSelections({});
        setConnectApiEndpointId("");
        setConnectApiColumnSelections({});
        setConnectPolymarketLiveEventsCompose(null);
        setConnectPolymarketLiveMarketsByEventsCompose(null);
        setConnectPolymarketLiveMarketsCompose(null);
        setConnectPolymarketLiveHoldersByMarketsCompose(null);
        setConnectPolymarketLiveOpenInterestCompose(null);
        setConnectLiveSourceId("");
        setConnectLiveColumnSelections({});
        setConnectKalshiLiveEndpointId("");
        setConnectKalshiLiveColumnSelections({});
        setConnectKalshiLiveFilters([]);
        setConnectKalshiLiveLimit(KALSHI_LIVE_DEFAULT_LIMIT);
        setConnectKalshiLiveTickers("");
        setConnectKalshiLiveMarketsTickerMeta({});
        setConnectKalshiLiveMarketsSheetMode("per_market");
        setConnectKalshiLiveMarketsDiscoveryMode(false);
        setConnectKalshiLiveMarketsDiscoveryStatus("");
        setConnectKalshiLiveMarketsDiscoveryMveFilter("exclude");
        setConnectKalshiLiveMarketsDiscoveryEventTicker("");
        setConnectKalshiLiveMarketsDiscoverySeriesTicker("");
        setConnectKalshiLiveMarketsDiscoveryTickers("");
        setConnectKalshiLiveMarketsDiscoveryMinCreatedTs("");
        setConnectKalshiLiveMarketsDiscoveryMaxCreatedTs("");
        setConnectKalshiLiveMarketsDiscoveryMinUpdatedTs("");
        setConnectKalshiLiveMarketsDiscoveryMinCloseTs("");
        setConnectKalshiLiveMarketsDiscoveryMaxCloseTs("");
        setConnectKalshiLiveMarketsDiscoveryMinSettledTs("");
        setConnectKalshiLiveMarketsDiscoveryMaxSettledTs("");
        setConnectKalshiHistoricalV2MarketsDiscoveryScope("event");
        setConnectKalshiHistoricalV2TradesIncludeBlockTrades(true);
        setConnectKalshiLiveEventsTickers("");
        setConnectKalshiLiveEventsTickerMeta({});
        setConnectKalshiLiveEventsSheetMode("per_event");
        setConnectKalshiLiveEventsIncludeMarkets(false);
        setConnectKalshiLiveEventsRowMode("nested");
        setConnectKalshiLiveEventsDiscoveryMode(false);
        setConnectKalshiLiveEventsDiscoveryStatus("");
        setConnectKalshiLiveEventsDiscoverySeriesTicker("");
        setConnectKalshiLiveEventsDiscoveryTickers("");
        setConnectKalshiLiveEventsDiscoveryMinCloseTs("");
        setConnectKalshiLiveEventsDiscoveryMinUpdatedTs("");
        setConnectKalshiLiveMultivariateEventsSeriesTicker("");
        setConnectKalshiLiveMultivariateEventsCollectionTicker("");
        setConnectKalshiLiveMultivariateEventsIncludeMarkets(false);
        setConnectKalshiLiveMultivariateEventsRowMode("nested");
        setConnectKalshiLiveCandlestickTickers("");
        setConnectKalshiLiveCandlestickTickerMeta({});
        setConnectKalshiLiveEventCandlesticksEventTicker("");
        setConnectKalshiLiveEventCandlesticksSeriesTicker("");
        setConnectKalshiLiveEventCandlesticksTickerMeta({});
        setConnectKalshiLiveRealtimeFeedEnabled(false);
        setConnectKalshiLiveRealtimePollIntervalMs(null);
        setConnectKalshiLiveRealtimeMarketTickers([]);
        setConnectKalshiLiveEventForecastEventTicker("");
        setConnectKalshiLiveEventForecastSeriesTicker("");
        setConnectKalshiLiveEventForecastTickerMeta({});
        setConnectKalshiLiveEventForecastPercentilePcts([10, 25, 50, 75, 90]);
        setConnectKalshiLiveLeaderboardMetricName("projected_pnl");
        setConnectKalshiLiveLeaderboardTimePeriod("weekly");
        setConnectKalshiLiveLeaderboardCategory("");
        setConnectKalshiLiveLeaderboardCategoryOther("");
        setConnectKalshiLiveHolderProfileNickname("");
        setConnectKalshiLiveHolderTradesNickname("");
        setConnectKalshiLiveHolderTradesSeriesTicker("");
        setConnectKalshiLiveHolderTradesEventTicker("");
        setConnectKalshiLiveHolderTradesMinAmount("");
        setConnectKalshiLiveSearchTradersQuery("");
        setConnectKalshiLiveSearchTradersIncludeMetrics(false);
        setConnectKalshiLiveSearchTradersIncludeHoldings(false);
        setConnectKalshiLiveSearchTradersSelectedNickname("");
        setConnectPowerMove(null);
        setConnectPowerMoveBuild(null);
        setConnectKalshiLiveTradesTicker("");
        setConnectKalshiLiveTradesTickerMeta({});
        setConnectKalshiLiveOrderbookTicker("");
        setConnectKalshiLiveOrderbookTickerMeta({});
        setConnectKalshiLiveSeriesTicker("");
        setConnectKalshiLiveSeriesTickerMeta({});
        setConnectKalshiLiveSeriesSheetMode("per_series");
        setConnectKalshiLiveSeriesDiscoveryMode(false);
        setConnectKalshiLiveSeriesDiscoveryCategory("");
        setConnectKalshiLiveSeriesDiscoveryTag("");
        setConnectKalshiLiveSeriesDiscoveryIncludeProductMetadata(false);
        setConnectKalshiLiveSeriesDiscoveryMinUpdatedTs("");
        setConnectKalshiLiveWhereFilters([]);
        setConnectKalshiLiveSortClauses([]);
        setKalshiLivePingState("idle");
        setConnectHomePendingSheetName("");
        setConnectHomePullDestination("new_sheet");
        setAthenaPingBySampleId({});
        setConnectActiveComposeOps([]);
        setDataLakeColumnComposeItems([]);
        setDataLakeComposeOrderBy([]);
        setDataLakeComposeLimitOpen(false);
        setDataLakeComposeLimitValue("");
        setDataLakeComposeLimitScope("primary");
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
      setConnectPolymarketLiveEventsCompose(null);
      setConnectPolymarketLiveMarketsByEventsCompose(null);
        setConnectPolymarketLiveMarketsCompose(null);
      setConnectPolymarketLiveHoldersByMarketsCompose(null);
      setConnectPolymarketLiveOpenInterestCompose(null);
      setConnectLiveSourceId("");
      setConnectLiveColumnSelections({});
      setConnectKalshiLiveEndpointId("");
      setConnectKalshiLiveColumnSelections({});
      setConnectKalshiLiveFilters([]);
      setConnectKalshiLiveLimit(KALSHI_LIVE_DEFAULT_LIMIT);
      setConnectKalshiLiveTickers("");
      setConnectKalshiLiveMarketsTickerMeta({});
      setConnectKalshiLiveMarketsSheetMode("per_market");
      setConnectKalshiLiveMarketsDiscoveryMode(false);
      setConnectKalshiLiveMarketsDiscoveryStatus("");
      setConnectKalshiLiveMarketsDiscoveryMveFilter("exclude");
      setConnectKalshiLiveMarketsDiscoveryEventTicker("");
      setConnectKalshiLiveMarketsDiscoverySeriesTicker("");
      setConnectKalshiLiveMarketsDiscoveryTickers("");
      setConnectKalshiLiveMarketsDiscoveryMinCreatedTs("");
      setConnectKalshiLiveMarketsDiscoveryMaxCreatedTs("");
      setConnectKalshiLiveMarketsDiscoveryMinUpdatedTs("");
      setConnectKalshiLiveMarketsDiscoveryMinCloseTs("");
      setConnectKalshiLiveMarketsDiscoveryMaxCloseTs("");
      setConnectKalshiLiveMarketsDiscoveryMinSettledTs("");
      setConnectKalshiLiveMarketsDiscoveryMaxSettledTs("");
      setConnectKalshiHistoricalV2MarketsDiscoveryScope("event");
      setConnectKalshiHistoricalV2TradesIncludeBlockTrades(true);
      setConnectKalshiLiveEventsTickers("");
      setConnectKalshiLiveEventsTickerMeta({});
      setConnectKalshiLiveEventsSheetMode("per_event");
      setConnectKalshiLiveEventsIncludeMarkets(false);
      setConnectKalshiLiveEventsRowMode("nested");
      setConnectKalshiLiveEventsDiscoveryMode(false);
      setConnectKalshiLiveEventsDiscoveryStatus("");
      setConnectKalshiLiveEventsDiscoverySeriesTicker("");
      setConnectKalshiLiveEventsDiscoveryTickers("");
      setConnectKalshiLiveEventsDiscoveryMinCloseTs("");
      setConnectKalshiLiveEventsDiscoveryMinUpdatedTs("");
      setConnectKalshiLiveMultivariateEventsSeriesTicker("");
      setConnectKalshiLiveMultivariateEventsCollectionTicker("");
      setConnectKalshiLiveMultivariateEventsIncludeMarkets(false);
      setConnectKalshiLiveMultivariateEventsRowMode("nested");
      setConnectKalshiLiveCandlestickTickers("");
      setConnectKalshiLiveCandlestickTickerMeta({});
      setConnectKalshiLiveEventCandlesticksEventTicker("");
      setConnectKalshiLiveEventCandlesticksSeriesTicker("");
      setConnectKalshiLiveEventCandlesticksTickerMeta({});
      setConnectKalshiLiveRealtimeFeedEnabled(false);
      setConnectKalshiLiveRealtimePollIntervalMs(null);
      setConnectKalshiLiveRealtimeMarketTickers([]);
      setConnectKalshiLiveEventForecastEventTicker("");
      setConnectKalshiLiveEventForecastSeriesTicker("");
      setConnectKalshiLiveEventForecastTickerMeta({});
      setConnectKalshiLiveEventForecastPercentilePcts([10, 25, 50, 75, 90]);
      setConnectKalshiLiveLeaderboardMetricName("projected_pnl");
      setConnectKalshiLiveLeaderboardTimePeriod("weekly");
      setConnectKalshiLiveLeaderboardCategory("");
      setConnectKalshiLiveLeaderboardCategoryOther("");
      setConnectKalshiLiveHolderProfileNickname("");
      setConnectKalshiLiveHolderTradesNickname("");
      setConnectKalshiLiveHolderTradesSeriesTicker("");
      setConnectKalshiLiveHolderTradesEventTicker("");
      setConnectKalshiLiveHolderTradesMinAmount("");
      setConnectKalshiLiveSearchTradersQuery("");
      setConnectKalshiLiveSearchTradersIncludeMetrics(false);
      setConnectKalshiLiveSearchTradersIncludeHoldings(false);
      setConnectKalshiLiveSearchTradersSelectedNickname("");
      setConnectPowerMove(null);
      setConnectPowerMoveBuild(null);
      setConnectKalshiLiveTradesTicker("");
      setConnectKalshiLiveTradesTickerMeta({});
      setConnectKalshiLiveOrderbookTicker("");
      setConnectKalshiLiveOrderbookTickerMeta({});
      setConnectKalshiLiveSeriesTicker("");
      setConnectKalshiLiveSeriesTickerMeta({});
      setConnectKalshiLiveSeriesSheetMode("per_series");
      setConnectKalshiLiveSeriesDiscoveryMode(false);
      setConnectKalshiLiveSeriesDiscoveryCategory("");
      setConnectKalshiLiveSeriesDiscoveryTag("");
      setConnectKalshiLiveSeriesDiscoveryIncludeProductMetadata(false);
      setConnectKalshiLiveSeriesDiscoveryMinUpdatedTs("");
      setConnectKalshiLiveWhereFilters([]);
      setConnectKalshiLiveSortClauses([]);
      setKalshiLivePingState("idle");
      setConnectHomePendingSheetName("");
      setConnectHomePullDestination("new_sheet");
      setAthenaPingBySampleId({});
      setConnectActiveComposeOps([]);
      setDataLakeColumnComposeItems([]);
      setDataLakeComposeOrderBy([]);
      setDataLakeComposeLimitOpen(false);
      setDataLakeComposeLimitValue("");
      setDataLakeComposeLimitScope("primary");
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
    const [activeChartSheetId, setActiveChartSheetId] = useState("chart-1");

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

    // REST live feeds (Kalshi poll etc.): keyed by feedId
    const [liveFeedState, setLiveFeedState] = useState({
      feedsById: {},
    });
    const [liveFeedActions, setLiveFeedActions] = useState({
      start: noop,
      stop: noop,
      pause: noop,
      resume: noop,
      restart: noop,
    });

    const cancelConnectDataFeedPull = useCallback(() => {
      connectDataLakePullAbortRef.current?.();

      setConnectDataLakePullState({
        loading: false,
        label: "",
        progress: 0,
        error: null,
        largePullView: null,
      });

      const feedsById = liveFeedState?.feedsById || {};
      Object.keys(feedsById).forEach((feedId) => {
        liveFeedActions?.stop?.(feedId);
      });
      liveFeedActions?.stop?.();
      setLiveFeedState?.({ feedsById: {} });

      const streamsBySheetId = liveStreamState?.streamsBySheetId || {};
      Object.keys(streamsBySheetId).forEach((sheetId) => {
        liveStreamActions?.stop?.(sheetId);
      });
      liveStreamActions?.stop?.();
      setLiveStreamState?.({ streamsBySheetId: {} });

      const hasData = connectHomeAnySheetHasData(dataSheets, connectedData);
      if (!hasData) {
        setConnectHomeAnalyzeActive(false);
        setConnectComposeScrollTick((t) => t + 1);
      }
    }, [
      connectedData,
      dataSheets,
      liveStreamActions,
      liveStreamState?.streamsBySheetId,
      liveFeedActions,
      liveFeedState?.feedsById,
      setLiveFeedState,
      setLiveStreamState,
    ]);

    const [chartSnapshotFlusher, setChartSnapshotFlusher] = useState(() => async () => null);

    const addNewChartAndActivate = useCallback((onNewChart, options = {}) => {
      const { initialSnapshot = null } = options;
      setChartSheets((prev) => {
        let n = Object.keys(prev || {}).length + 1;
        let newId = `chart-${n}`;
        while (prev?.[newId]) {
          n += 1;
          newId = `chart-${n}`;
        }
        setActiveChartSheetId(newId);
        if (typeof onNewChart === "function") onNewChart(newId);
        return {
          ...(prev || {}),
          [newId]: {
            name: `Chart ${n}`,
            snapshot: initialSnapshot,
            chartMeta: null,
            userCreated: true,
          },
        };
      });
    }, [setActiveChartSheetId]);

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
        <StateContextV2.Provider value={{providerValue, isDemo, setIsDemo, guidedWorkflowPull, setGuidedWorkflowPull, guidedWorkflowPullRequested, setGuidedWorkflowPullRequested, guidedWorkflowHubDraftRef, connectHomeGuidedSession, setConnectHomeGuidedSession, runYourselfLocked, setRunYourselfLocked, runYourselfSessionActive, setRunYourselfSessionActive, workspaceWriteLocked, setWorkspaceWriteLocked, dashData, setDashData, bentoContainer, setBentoContainer, viewing, setViewing, integrationSidebar, setIntegrationSidebar, rightPanelOpen, setRightPanelOpen, rightPanelTab, setRightPanelTab, connectPowerMove, setConnectPowerMove, connectPowerMoveBuild, setConnectPowerMoveBuild, connectWorkspace, setConnectWorkspace, connectWorkspaceScrollTick, requestConnectWorkspace, connectComposeScrollTick, requestConnectComposeScroll, connectDataLakePullTick, requestConnectDataLakePull, connectHomeLeftNavOpen, setConnectHomeLeftNavOpen, connectHomeFlowStepsOpen, setConnectHomeFlowStepsOpen, connectHomeAnalyzeActive, setConnectHomeAnalyzeActive, connectHomeCenterView, setConnectHomeCenterView, connectAnalyzeScrollTick, requestConnectAnalyzeScroll, connectDataLakePullState, setConnectDataLakePullState, connectLargePullApplyRef, connectDataLakePullAbortRef, connectDataLakePullConsumedTickRef, connectProjectLoadState, setConnectProjectLoadState, connectDataLakeSampleId, setConnectDataLakeSampleId, connectDataLakeColumnSelections, setConnectDataLakeColumnSelections, connectApiEndpointId, setConnectApiEndpointId, connectApiColumnSelections, setConnectApiColumnSelections, connectPolymarketLiveEventsCompose, setConnectPolymarketLiveEventsCompose, connectPolymarketLiveMarketsByEventsCompose, setConnectPolymarketLiveMarketsByEventsCompose, connectPolymarketLiveMarketsCompose, setConnectPolymarketLiveMarketsCompose, connectPolymarketLiveHoldersByMarketsCompose, setConnectPolymarketLiveHoldersByMarketsCompose, connectPolymarketLiveOpenInterestCompose, setConnectPolymarketLiveOpenInterestCompose, connectLiveSourceId, setConnectLiveSourceId, connectLiveColumnSelections, setConnectLiveColumnSelections, connectKalshiLiveEndpointId, setConnectKalshiLiveEndpointId, connectKalshiLiveColumnSelections, setConnectKalshiLiveColumnSelections, connectKalshiLiveFilters, setConnectKalshiLiveFilters, connectKalshiLiveLimit, setConnectKalshiLiveLimit, connectKalshiLiveTickers, setConnectKalshiLiveTickers, connectKalshiLiveMarketsTickerMeta, setConnectKalshiLiveMarketsTickerMeta, connectKalshiLiveMarketsSheetMode, setConnectKalshiLiveMarketsSheetMode, connectKalshiLiveMarketsDiscoveryMode, setConnectKalshiLiveMarketsDiscoveryMode, connectKalshiLiveMarketsDiscoveryStatus, setConnectKalshiLiveMarketsDiscoveryStatus, connectKalshiLiveMarketsDiscoveryMveFilter, setConnectKalshiLiveMarketsDiscoveryMveFilter, connectKalshiLiveMarketsDiscoveryEventTicker, setConnectKalshiLiveMarketsDiscoveryEventTicker, connectKalshiLiveMarketsDiscoverySeriesTicker, setConnectKalshiLiveMarketsDiscoverySeriesTicker, connectKalshiLiveMarketsDiscoveryTickers, setConnectKalshiLiveMarketsDiscoveryTickers, connectKalshiHistoricalV2MarketsDiscoveryScope, setConnectKalshiHistoricalV2MarketsDiscoveryScope, connectKalshiHistoricalV2TradesIncludeBlockTrades, setConnectKalshiHistoricalV2TradesIncludeBlockTrades, connectKalshiLiveMarketsDiscoveryMinCreatedTs, setConnectKalshiLiveMarketsDiscoveryMinCreatedTs, connectKalshiLiveMarketsDiscoveryMaxCreatedTs, setConnectKalshiLiveMarketsDiscoveryMaxCreatedTs, connectKalshiLiveMarketsDiscoveryMinUpdatedTs, setConnectKalshiLiveMarketsDiscoveryMinUpdatedTs, connectKalshiLiveMarketsDiscoveryMinCloseTs, setConnectKalshiLiveMarketsDiscoveryMinCloseTs, connectKalshiLiveMarketsDiscoveryMaxCloseTs, setConnectKalshiLiveMarketsDiscoveryMaxCloseTs, connectKalshiLiveMarketsDiscoveryMinSettledTs, setConnectKalshiLiveMarketsDiscoveryMinSettledTs, connectKalshiLiveMarketsDiscoveryMaxSettledTs, setConnectKalshiLiveMarketsDiscoveryMaxSettledTs, connectKalshiLiveEventsTickers, setConnectKalshiLiveEventsTickers, connectKalshiLiveEventsTickerMeta, setConnectKalshiLiveEventsTickerMeta, connectKalshiLiveEventsSheetMode, setConnectKalshiLiveEventsSheetMode, connectKalshiLiveEventsIncludeMarkets, setConnectKalshiLiveEventsIncludeMarkets, connectKalshiLiveEventsRowMode, setConnectKalshiLiveEventsRowMode, connectKalshiLiveEventsDiscoveryMode, setConnectKalshiLiveEventsDiscoveryMode, connectKalshiLiveEventsDiscoveryStatus, setConnectKalshiLiveEventsDiscoveryStatus, connectKalshiLiveEventsDiscoverySeriesTicker, setConnectKalshiLiveEventsDiscoverySeriesTicker, connectKalshiLiveEventsDiscoveryTickers, setConnectKalshiLiveEventsDiscoveryTickers, connectKalshiLiveEventsDiscoveryMinCloseTs, setConnectKalshiLiveEventsDiscoveryMinCloseTs, connectKalshiLiveEventsDiscoveryMinUpdatedTs, setConnectKalshiLiveEventsDiscoveryMinUpdatedTs, connectKalshiLiveMultivariateEventsSeriesTicker, setConnectKalshiLiveMultivariateEventsSeriesTicker, connectKalshiLiveMultivariateEventsCollectionTicker, setConnectKalshiLiveMultivariateEventsCollectionTicker, connectKalshiLiveMultivariateEventsIncludeMarkets, setConnectKalshiLiveMultivariateEventsIncludeMarkets, connectKalshiLiveMultivariateEventsRowMode, setConnectKalshiLiveMultivariateEventsRowMode, connectKalshiLiveCandlestickTickers, setConnectKalshiLiveCandlestickTickers, connectKalshiLiveCandlestickTickerMeta, setConnectKalshiLiveCandlestickTickerMeta, connectKalshiLiveEventCandlesticksEventTicker, setConnectKalshiLiveEventCandlesticksEventTicker, connectKalshiLiveEventCandlesticksSeriesTicker, setConnectKalshiLiveEventCandlesticksSeriesTicker, connectKalshiLiveEventCandlesticksTickerMeta, setConnectKalshiLiveEventCandlesticksTickerMeta, connectKalshiLiveRealtimeFeedEnabled, setConnectKalshiLiveRealtimeFeedEnabled, connectKalshiLiveRealtimePollIntervalMs, setConnectKalshiLiveRealtimePollIntervalMs, connectKalshiLiveRealtimeMarketTickers, setConnectKalshiLiveRealtimeMarketTickers, connectKalshiLiveEventForecastEventTicker, setConnectKalshiLiveEventForecastEventTicker, connectKalshiLiveEventForecastSeriesTicker, setConnectKalshiLiveEventForecastSeriesTicker, connectKalshiLiveEventForecastTickerMeta, setConnectKalshiLiveEventForecastTickerMeta, connectKalshiLiveEventForecastPercentilePcts, setConnectKalshiLiveEventForecastPercentilePcts, connectKalshiLiveLeaderboardMetricName, setConnectKalshiLiveLeaderboardMetricName, connectKalshiLiveLeaderboardTimePeriod, setConnectKalshiLiveLeaderboardTimePeriod, connectKalshiLiveLeaderboardCategory, setConnectKalshiLiveLeaderboardCategory, connectKalshiLiveLeaderboardCategoryOther, setConnectKalshiLiveLeaderboardCategoryOther, connectKalshiLiveHolderProfileNickname, setConnectKalshiLiveHolderProfileNickname, connectKalshiLiveHolderTradesNickname, setConnectKalshiLiveHolderTradesNickname, connectKalshiLiveHolderTradesSeriesTicker, setConnectKalshiLiveHolderTradesSeriesTicker, connectKalshiLiveHolderTradesEventTicker, setConnectKalshiLiveHolderTradesEventTicker, connectKalshiLiveHolderTradesMinAmount, setConnectKalshiLiveHolderTradesMinAmount, connectKalshiLiveSearchTradersQuery, setConnectKalshiLiveSearchTradersQuery, connectKalshiLiveSearchTradersIncludeMetrics, setConnectKalshiLiveSearchTradersIncludeMetrics, connectKalshiLiveSearchTradersIncludeHoldings, setConnectKalshiLiveSearchTradersIncludeHoldings, connectKalshiLiveSearchTradersSelectedNickname, setConnectKalshiLiveSearchTradersSelectedNickname, connectKalshiLiveTradesTicker, setConnectKalshiLiveTradesTicker, connectKalshiLiveTradesTickerMeta, setConnectKalshiLiveTradesTickerMeta, connectKalshiLiveOrderbookTicker, setConnectKalshiLiveOrderbookTicker, connectKalshiLiveOrderbookTickerMeta, setConnectKalshiLiveOrderbookTickerMeta, connectKalshiLiveSeriesTicker, setConnectKalshiLiveSeriesTicker, connectKalshiLiveSeriesTickerMeta, setConnectKalshiLiveSeriesTickerMeta, connectKalshiLiveSeriesSheetMode, setConnectKalshiLiveSeriesSheetMode, connectKalshiLiveSeriesDiscoveryMode, setConnectKalshiLiveSeriesDiscoveryMode, connectKalshiLiveSeriesDiscoveryCategory, setConnectKalshiLiveSeriesDiscoveryCategory, connectKalshiLiveSeriesDiscoveryTag, setConnectKalshiLiveSeriesDiscoveryTag, connectKalshiLiveSeriesDiscoveryIncludeProductMetadata, setConnectKalshiLiveSeriesDiscoveryIncludeProductMetadata, connectKalshiLiveSeriesDiscoveryMinUpdatedTs, setConnectKalshiLiveSeriesDiscoveryMinUpdatedTs, connectKalshiLiveWhereFilters, setConnectKalshiLiveWhereFilters, connectKalshiLiveSortClauses, setConnectKalshiLiveSortClauses, kalshiLivePingState, setKalshiLivePingState, pingKalshiLiveExchange: pingKalshiLiveExchangeStatus, connectIntegrationPullTick, requestConnectIntegrationPull, cancelConnectDataFeedPull, connectHomePendingSheetName, setConnectHomePendingSheetName, connectHomePullDestination, setConnectHomePullDestination, athenaPingBySampleId, setAthenaPingBySampleId, pingAthenaLakeSample, connectActiveComposeOps, setConnectActiveComposeOps, dataLakeColumnComposeItems, setDataLakeColumnComposeItems, dataLakeComposeOrderBy, setDataLakeComposeOrderBy, dataLakeComposeLimitOpen, setDataLakeComposeLimitOpen, dataLakeComposeLimitValue, setDataLakeComposeLimitValue, dataLakeComposeLimitScope, setDataLakeComposeLimitScope, dataLakeComposeWhereFilters, setDataLakeComposeWhereFilters, dataLakeComposeHavingFilters, setDataLakeComposeHavingFilters, dataLakeComposeJoins, setDataLakeComposeJoins, connectedData, setConnectedData, dataConnected, setDataConnected, tempData, setTempData, connectedCols, setConnectedCols, dataSetName, setDataSetName, savedDataSets, setSavedDataSets, loadedDataMeta, setLoadedDataMeta, savedCharts, setSavedCharts, loadedChartMeta, setLoadedChartMeta, savedChartDashboards, setSavedChartDashboards, activeChartDashboardId, setActiveChartDashboardId, chartDashboardDraft, setChartDashboardDraft, selectedDashboardCard, setSelectedDashboardCard, refetchChartDashboardsTick, setRefetchChartDashboardsTick, saveProjectDialogNonce, saveProjectDialogIntent, setSaveProjectDialogIntent, pendingSaveProjectSuccessRef, requestSaveProjectDialog, pageFormatDockTarget, setPageFormatDockTarget, chartComposerDock, setChartComposerDock, cardGridComposerDock, setCardGridComposerDock, chartPickerEmphasis, setChartPickerEmphasis, dashboardComposerLayoutActions, setDashboardComposerLayoutActions, pageTitleFormatDockOpen, setPageTitleFormatDockOpen, savedPresentations, setSavedPresentations, loadedPresentationMeta, setLoadedPresentationMeta, connectedPresentation, setConnectedPresentation, refetchData, setRefetchData, refetchChart, setRefetchChart, refetchPresentations, setRefetchPresentations, loadedDataId ,setLoadedDataId, dataTypes, setDataTypes, dataTypeMismatch, setDataTypeMismatch, userHandle, setUserHandle, profilePic, setProfilePic, isLifeTimeMember, setIsLifeTimeMember, summarizationTables, setSummarizationTables, chartDataOverride, setChartDataOverride, chartDataOverrideMeta, setChartDataOverrideMeta, loadedChartBuilderSnapshot, setLoadedChartBuilderSnapshot, chartSheets, setChartSheets, activeChartSheetId, setActiveChartSheetId, addNewChartAndActivate, chartSnapshotFlusher, setChartSnapshotFlusher, polymarketWsState, setPolymarketWsState, chainlinkWsState, setChainlinkWsState, liveStreamState, setLiveStreamState, liveStreamActions, setLiveStreamActions, liveFeedState, setLiveFeedState, liveFeedActions, setLiveFeedActions, dataSheets, setDataSheets, activeSheetId, setActiveSheetId, addNewSheetAndActivate, replaceCurrentSheetData, setSheetData}}>
            {children}
        </StateContextV2.Provider>
    )
}

  