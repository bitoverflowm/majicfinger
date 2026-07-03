import { createHubMetadata, hubPageRevalidate, renderHubPage } from "@/lib/hubs/loadHubPage";

const SLUG = "polymarket-live-data";

export const revalidate = hubPageRevalidate;
export const metadata = createHubMetadata(SLUG);

export default async function PolymarketLiveDataHubPage() {
  return renderHubPage(SLUG);
}
