import { CTASection } from "@/components/sections/cta-section";
import { FooterSection } from "@/components/sections/footer-section";
import { MarketingNavbar } from "@/components/sections/marketing-navbar";
import { TelegramMarketingTracker } from "@/components/analytics/TelegramMarketingTracker";
import { UniversityHome } from "@/components/university/university-home";
import { listUniversityLessons } from "@/lib/university/lessons";
import { canonicalUrl } from "@/lib/site";

const PAGE_TITLE = "Lychee University";
const PAGE_DESCRIPTION =
  "Free Lychee University lessons on forecasting, sports analytics and prediction markets. Learn to think in probabilities and read the numbers like an analyst.";
const OG_IMAGE = {
  url: canonicalUrl("/images/university/main.jpg"),
  width: 1280,
  height: 720,
  alt: "Lychee University: forecasting, sports analytics and prediction markets",
};

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
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [OG_IMAGE.url],
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
