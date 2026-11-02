import { CTASection } from "@/components/sections/cta-section";
import { FooterSection } from "@/components/sections/footer-section";
import { MarketingNavbar } from "@/components/sections/marketing-navbar";
import { TelegramMarketingTracker } from "@/components/analytics/TelegramMarketingTracker";
import { UniversityHome } from "@/components/university/university-home";
import { listUniversityLessons } from "@/lib/university/lessons";
import { canonicalUrl } from "@/lib/site";

const PAGE_TITLE = "Lychee University";
const PAGE_DESCRIPTION =
  "Lychee University lessons on forecasting and prediction markets. Start with lesson 1: what Tetlock’s expert prediction study actually found.";

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: canonicalUrl("/university"),
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: canonicalUrl("/university"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function UniversityPage() {
  const lessons = listUniversityLessons();

  return (
    <div className="relative mx-auto min-w-0 max-w-[min(100%,84rem)] overflow-x-visible">
      <TelegramMarketingTracker />
      <MarketingNavbar />
      <main className="flex min-h-screen w-full flex-col divide-y divide-border bg-background font-sans antialiased theme-landing">
        <UniversityHome lessons={lessons} />
        <CTASection />
        <FooterSection />
      </main>
    </div>
  );
}
