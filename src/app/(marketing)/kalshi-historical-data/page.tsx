import { HubPage } from "@/components/hubs/HubPage";
import { kalshiHistoricalHub } from "@/config/hubs/kalshiHistorical";
import { buildHubMetadata } from "@/lib/hubs/metadata";
import { queryHubPublishedAssets } from "@/lib/hubs/queryPublishedAssets";

export const metadata = buildHubMetadata(kalshiHistoricalHub);

export default async function KalshiHistoricalDataHubPage() {
  const assets = await queryHubPublishedAssets(kalshiHistoricalHub.assetFilter);
  return <HubPage config={kalshiHistoricalHub} assets={assets} />;
}
