import { HolderLandingPage, holderLandingMetadata } from "@/components/holderLanding/HolderLandingPage";

export const revalidate = 600;
export const metadata = holderLandingMetadata("market");

export default function PolymarketMarketHoldersPage() {
  return <HolderLandingPage pageKey="market" />;
}
