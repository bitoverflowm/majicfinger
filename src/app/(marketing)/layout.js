import { MarketingNavbar } from "@/components/sections/marketing-navbar";
import { TelegramMarketingTracker } from "@/components/analytics/TelegramMarketingTracker";

export default function MarketingLayout({ children }) {
  return (
    <div className="relative mx-auto min-w-0 max-w-[min(100%,84rem)] overflow-x-visible">
      <TelegramMarketingTracker />
      <MarketingNavbar />
      {children}
    </div>
  );
}

