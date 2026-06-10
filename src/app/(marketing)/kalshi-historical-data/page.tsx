import { HubPage } from "@/components/hubs/HubPage";
import { kalshiHistoricalHub } from "@/config/hubs/kalshiHistorical";
import { buildHubMetadata } from "@/lib/hubs/metadata";
import { queryHubPublishedAssets } from "@/lib/hubs/queryPublishedAssets";
import type { HubPublishedAssets } from "@/types/hub";

/** Hub assets come from Mongo at request time — avoid blocking static generation at build. */
export const dynamic = "force-dynamic";

export const metadata = buildHubMetadata(kalshiHistoricalHub);

const EMPTY_ASSETS: HubPublishedAssets = { charts: [], dashboards: [] };

async function loadHubAssets(): Promise<HubPublishedAssets> {
  const filter = kalshiHistoricalHub.assetFilter;
  if (!filter) return EMPTY_ASSETS;

  try {
    return await queryHubPublishedAssets(filter);
  } catch (err) {
    console.error("[kalshi-historical-data] asset query failed:", err);
    return EMPTY_ASSETS;
  }
}

export default async function KalshiHistoricalDataHubPage() {
  const assets = await loadHubAssets();
  return <HubPage config={kalshiHistoricalHub} assets={assets} />;
}
