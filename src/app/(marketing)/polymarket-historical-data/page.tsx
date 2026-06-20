import { createHubMetadata, hubPageDynamic, renderHubPage } from "@/lib/hubs/loadHubPage";

const SLUG = "polymarket-historical-data";

export const dynamic = hubPageDynamic;
export const metadata = createHubMetadata(SLUG);

export default async function PolymarketHistoricalDataHubPage() {
  return renderHubPage(SLUG);
}
