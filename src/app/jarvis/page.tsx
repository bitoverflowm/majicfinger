import type { Metadata } from "next";
import { TelegramMarketingTracker } from "@/components/analytics/TelegramMarketingTracker";
import { JarvisMcpLanding } from "@/components/marketing/jarvis-mcp-landing";
import { MarketingNavbar } from "@/components/sections/marketing-navbar";
import { landingPageV2Config } from "@/lib/landingPageV2Config";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";
const TITLE = "Lychee MCP + Jarvis";
const DESCRIPTION =
  landingPageV2Config.mcpPrereg?.description ||
  "Preregister for Lychee MCP, Jarvis mode, chat approvals, and X @lychee_data research — $49 one-time founding access.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { absolute: `${TITLE} · Preregister` },
  description: DESCRIPTION,
  alternates: { canonical: `${SITE.replace(/\/$/, "")}/jarvis` },
  openGraph: {
    title: `${TITLE} · Lychee`,
    description: DESCRIPTION,
    url: `${SITE.replace(/\/$/, "")}/jarvis`,
    siteName: "Lychee",
    type: "website",
    images: [
      {
        url: `${SITE}/og/lychee-research-terminal.png`,
        width: 1200,
        height: 630,
        alt: TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} · Lychee`,
    description: DESCRIPTION,
    images: [`${SITE}/og/lychee-research-terminal.png`],
  },
};

export default function JarvisLandingPage() {
  const price = landingPageV2Config.mcpPrereg?.price || "$49";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Lychee MCP + Jarvis preregistration",
    description: DESCRIPTION,
    brand: { "@type": "Brand", name: "Lychee" },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: "49.00",
      availability: "https://schema.org/PreOrder",
      url: `${SITE.replace(/\/$/, "")}/checkout?plan=mcp_prereg`,
      name: `Preregister · ${price}`,
    },
  };

  return (
    <>
      <TelegramMarketingTracker />
      <MarketingNavbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <JarvisMcpLanding />
    </>
  );
}
