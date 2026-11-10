import { HolderLandingPage, holderLandingMetadata } from "@/components/holderLanding/HolderLandingPage";

export const revalidate = 600;
export const metadata = holderLandingMetadata("flagship");

export default function PolymarketHolderTerminalPage() {
  return <HolderLandingPage pageKey="flagship" />;
}
