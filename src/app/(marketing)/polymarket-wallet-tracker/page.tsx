import { HolderLandingPage, holderLandingMetadata } from "@/components/holderLanding/HolderLandingPage";

export const revalidate = 600;
export const metadata = holderLandingMetadata("wallet");

export default function PolymarketWalletTrackerPage() {
  return <HolderLandingPage pageKey="wallet" />;
}
