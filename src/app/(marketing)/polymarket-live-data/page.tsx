import { createHubMetadata, hubPageDynamic, renderHubPage } from "@/lib/hubs/loadHubPage";

const SLUG = "polymarket-live-data";

export const dynamic = hubPageDynamic;
export const metadata = createHubMetadata(SLUG);

export default async function PolymarketLiveDataHubPage() {
  return renderHubPage(SLUG);
}
