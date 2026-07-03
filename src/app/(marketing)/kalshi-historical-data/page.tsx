import { createHubMetadata, hubPageRevalidate, renderHubPage } from "@/lib/hubs/loadHubPage";

const SLUG = "kalshi-historical-data";

export const revalidate = hubPageRevalidate;
export const metadata = createHubMetadata(SLUG);

export default async function KalshiHistoricalDataHubPage() {
  return renderHubPage(SLUG);
}
