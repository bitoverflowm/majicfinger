import { createHubMetadata, hubPageRevalidate, renderHubPage } from "@/lib/hubs/loadHubPage";

const SLUG = "polymarket-historical-data";

export const revalidate = hubPageRevalidate;
export const metadata = createHubMetadata(SLUG);

export default async function PolymarketHistoricalDataHubPage() {
  return renderHubPage(SLUG);
}
