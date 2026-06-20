import { createHubMetadata, hubPageDynamic, renderHubPage } from "@/lib/hubs/loadHubPage";

const SLUG = "kalshi-live-data";

export const dynamic = hubPageDynamic;
export const metadata = createHubMetadata(SLUG);

export default async function KalshiLiveDataHubPage() {
  return renderHubPage(SLUG);
}
