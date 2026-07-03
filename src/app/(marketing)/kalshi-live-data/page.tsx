import { createHubMetadata, hubPageRevalidate, renderHubPage } from "@/lib/hubs/loadHubPage";

const SLUG = "kalshi-live-data";

export const revalidate = hubPageRevalidate;
export const metadata = createHubMetadata(SLUG);

export default async function KalshiLiveDataHubPage() {
  return renderHubPage(SLUG);
}
