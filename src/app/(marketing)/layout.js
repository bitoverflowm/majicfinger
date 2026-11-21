import { MarketingNavbar } from "@/components/sections/marketing-navbar";
import { TelegramMarketingTracker } from "@/components/analytics/TelegramMarketingTracker";

export default function MarketingLayout({ children }) {
  return (
    <div className="relative min-w-0 overflow-x-visible">
      <TelegramMarketingTracker />
      <MarketingNavbar />
      <div className="mx-auto min-w-0 max-w-[min(100%,84rem)]">{children}</div>
    </div>
  );
}

