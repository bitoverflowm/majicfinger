import Script from "next/script";
import { siteConfig } from "@/lib/site";
import { MarketingNavbar } from "@/components/sections/marketing-navbar";
import { FooterSection } from "@/components/sections/footer-section";
import { TelegramMarketingTracker } from "@/components/analytics/TelegramMarketingTracker";
import EasyCharts from "./easyCharts";

const canonical = `${siteConfig.url}/charts`;

export const metadata = {
  title: "Lychee: Your Quant in a Box",
  description:
    "Stop juggling CSVs, Python scripts, and messy charts. Connect data from Polymarket, manipulate it instantly, generate beautiful dashboards, and act on alpha—all in one browser. Zero coding. Zero friction. Real results.",
  alternates: {
    canonical,
  },
  openGraph: {
    url: canonical,
    type: "website",
    title: "Lychee: Your Quant in a Box",
    description:
      "One operator. Full pipeline. Real edge. Stop juggling CSVs, Python scripts, and messy charts. Connect data from Polymarket, manipulate it instantly, generate beautiful dashboards, and act on alpha—all in one browser. Zero coding. Zero friction. Real results.",
    siteName: "Lychee",
    images: [
      {
        url: "https://lycheedata.com/ogImage2.png",
        width: 1200,
        height: 630,
        alt: "Lychee OG Image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    domain: "lycheedata.com",
    url: canonical,
    title: "Lychee: Your Quant in a Box",
    description:
      "One operator. Full pipeline. Real edge. Stop juggling CSVs, Python scripts, and messy charts. Connect data from Polymarket, manipulate it instantly, generate beautiful dashboards, and act on alpha—all in one browser. Zero coding. Zero friction. Real results.",
    images: ["https://lycheedata.com/ogImage2.png"],
  },
};

const stripeReferralSnippet = `
(function () {
  function getReferral() {
    try {
      if (window.promotekit_referral) return String(window.promotekit_referral);
    } catch (_) {}
    try {
      var p = new URLSearchParams(window.location.search);
      return p.get("ref") || p.get("via") || "";
    } catch (_) {
      return "";
    }
  }
  function apply() {
    var ref = getReferral();
    if (!ref) return;
    var els = document.querySelectorAll("[pricing-table-id],[buy-button-id],a[href*='buy.stripe.com'],a[href*='checkout.stripe.com']");
    els.forEach(function (el) {
      if (el.tagName === "A" && el.href) {
        try {
          var u = new URL(el.href);
          if (!u.searchParams.get("client_reference_id")) {
            u.searchParams.set("client_reference_id", ref);
            el.href = u.toString();
          }
        } catch (_) {}
      }
    });
  }
  apply();
  document.addEventListener("DOMContentLoaded", apply);
  setTimeout(apply, 1000);
})();
`;

export default function ChartsPage() {
  return (
    <div className="relative mx-auto min-w-0 max-w-[min(100%,84rem)] overflow-x-visible border-x">
      <div className="absolute left-6 top-0 z-10 block h-full w-px border-l border-border" />
      <div className="absolute right-6 top-0 z-10 block h-full w-px border-r border-border" />
      <TelegramMarketingTracker />
      <MarketingNavbar />
      <Script
        async
        src="https://cdn.promotekit.com/promotekit.js"
        data-promotekit="03b8c588-8350-4a0c-97f0-0a839509e8e0"
        strategy="afterInteractive"
      />
      <Script id="stripeReferral" strategy="afterInteractive">
        {stripeReferralSnippet}
      </Script>
      <main className="flex min-h-screen w-full flex-col items-stretch overflow-x-visible bg-background font-sans antialiased theme-landing scroll-smooth">
        <EasyCharts />
        <FooterSection />
      </main>
    </div>
  );
}
