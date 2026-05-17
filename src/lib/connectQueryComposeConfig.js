/**
 * Connect home Query Compose — integration-specific config.
 */

import {
  ATHENA_KALSHI_SAMPLE_OPTIONS,
  ATHENA_POLYMARKET_SAMPLE_OPTIONS,
  KALSHI_CONNECT_DATA_SOURCES,
  POLYMARKET_CONNECT_DATA_SOURCES,
} from "@/config/dataLakeParquetSamples";
import { ENDPOINTS, POLYMARKET_GROUPS } from "@/components/integrationsView/integrationPlayground/integrations/polymarket/config";
import {
  getKalshiColumnDisplayLabel,
  getKalshiConnectColumnsForSample,
} from "@/lib/kalshiConnectColumns";
import {
  getPolymarketColumnDisplayLabel,
  getPolymarketConnectColumnsForSample,
} from "@/lib/polymarketConnectColumns";

/** @typedef {"dataLake" | "api" | "liveStream"} ConnectComposeKind */

/** @typedef {{ sampleId: string; title: string; description: string }} ConnectDataLakeSource */

/** @typedef {{ id: string; title: string; description: string; group?: string }} ConnectApiSource */

/** @typedef {{ id: string; title: string; description: string }} ConnectLiveSource */

/** @typedef {{ name: string; type: string; description: string; label?: string }} ConnectComposeColumn */

/** Integrations using Athena + DataLakeParquetPanel on Connect home. */
export const CONNECT_DATA_LAKE_INTEGRATIONS = {
  kalshiHistorical: {
    kind: "dataLake",
    dataset: "kalshi",
    lake: "kalshi",
    sampleOptions: ATHENA_KALSHI_SAMPLE_OPTIONS,
    connectSources: KALSHI_CONNECT_DATA_SOURCES,
    getColumnsForSample: getKalshiConnectColumnsForSample,
    getColumnDisplayLabel: getKalshiColumnDisplayLabel,
  },
  polymarketHistorical: {
    kind: "dataLake",
    dataset: "polymarket",
    lake: "polymarket",
    sampleOptions: ATHENA_POLYMARKET_SAMPLE_OPTIONS,
    connectSources: POLYMARKET_CONNECT_DATA_SOURCES,
    getColumnsForSample: getPolymarketConnectColumnsForSample,
    getColumnDisplayLabel: getPolymarketColumnDisplayLabel,
  },
};

/** @param {string} integrationId */
export function getConnectDataLakeConfig(integrationId) {
  return CONNECT_DATA_LAKE_INTEGRATIONS[integrationId] || null;
}

/** @param {string} integrationId */
export function isConnectDataLakeIntegration(integrationId) {
  return integrationId in CONNECT_DATA_LAKE_INTEGRATIONS;
}

/** HTTP Polymarket API endpoints (exclude WebSocket-only). */
export const POLYMARKET_API_CONNECT_SOURCES = ENDPOINTS.filter((ep) => !ep.wsType).map((ep) => ({
  id: ep.query,
  title: ep.name,
  description: ep.description,
  group: POLYMARKET_GROUPS[ep.group] || ep.group,
}));

/** @type {ConnectComposeColumn[]} */
export const LIVE_STREAM_CONNECT_COLUMNS = [
  { name: "source", type: "string", description: "Data source identifier" },
  { name: "symbol", type: "string", description: "Trading pair or symbol" },
  { name: "time", type: "int", description: "Event timestamp (ms)" },
  { name: "value", type: "float", description: "Price or value at event time" },
  { name: "price", type: "float", description: "Same as value (alias for charts)" },
  { name: "receivedAt", type: "int", description: "When the row was received in Lychee" },
];

export const CHAINLINK_LIVE_SOURCES = [
  { id: "btc/usd", title: "BTC / USD", description: "Bitcoin priced in US dollars (Chainlink)." },
  { id: "eth/usd", title: "ETH / USD", description: "Ethereum priced in US dollars (Chainlink)." },
  { id: "sol/usd", title: "SOL / USD", description: "Solana priced in US dollars (Chainlink)." },
  { id: "xrp/usd", title: "XRP / USD", description: "XRP priced in US dollars (Chainlink)." },
];

export const BINANCE_LIVE_SOURCES = [
  { id: "btcusdt", title: "BTCUSDT", description: "Bitcoin to USDT (Binance RTDS)." },
  { id: "ethusdt", title: "ETHUSDT", description: "Ethereum to USDT (Binance RTDS)." },
  { id: "solusdt", title: "SOLUSDT", description: "Solana to USDT (Binance RTDS)." },
  { id: "xrpusdt", title: "XRPUSDT", description: "XRP to USDT (Binance RTDS)." },
];

/** @param {string} integrationId */
export function getConnectLiveStreamConfig(integrationId) {
  if (integrationId === "chainlink") {
    return { streamType: "chainlink", sources: CHAINLINK_LIVE_SOURCES, columns: LIVE_STREAM_CONNECT_COLUMNS };
  }
  if (integrationId === "binance") {
    return { streamType: "binance", sources: BINANCE_LIVE_SOURCES, columns: LIVE_STREAM_CONNECT_COLUMNS };
  }
  return null;
}

/** @param {string} endpointQuery */
export function getPolymarketApiColumnsForEndpoint(endpointQuery) {
  const ep = ENDPOINTS.find((e) => e.query === endpointQuery);
  if (!ep?.responseFields?.length) return [];
  return ep.responseFields.map((name) => ({
    name,
    type: "string",
    description: defaultApiFieldDescription(name),
  }));
}

/** @param {string} name */
function defaultApiFieldDescription(name) {
  return String(name || "").replace(/([A-Z])/g, " $1").trim();
}

/** @param {string} integrationId */
export function isConnectQueryComposeIntegration(integrationId) {
  return (
    isConnectDataLakeIntegration(integrationId) ||
    integrationId === "polymarket" ||
    integrationId === "chainlink" ||
    integrationId === "binance"
  );
}
