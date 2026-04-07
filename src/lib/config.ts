import { siteConfig as coreSiteConfig } from "@/lib/site";

export const siteConfig = {
  ...coreSiteConfig,
  nav: {
    links: [
      { id: "hero", name: "Home", href: "#hero" },
      { id: "pricing", name: "Pricing", href: "#pricing" },
      { id: "guides", name: "Guides", href: "#guides" },
    ],
  },
  companyShowcase: {
    companyLogos: [
      { id: "jpm", src: "/jpm.svg", alt: "jpm", href: "#" },
      { id: "goldman", src: "/goldman.svg", alt: "goldman", href: "#" },
      { id: "meta", src: "/meta.svg", alt: "meta", href: "#" },
      { id: "google", src: "/google.svg", alt: "google", href: "#" },
      { id: "apple", src: "/apple.svg", alt: "apple", href: "#" },
      { id: "mit", src: "/mit.svg", alt: "mit", href: "#" },
    ],
  },
  hero: {
    badgeIcon: "dot",
    badge: "36GB of every Kalshi & Polymarket trade ever",
    title: "Analyze real-time prediction market data in <0.69 seconds— no coding, no setup",
    description:
      "500+ endpoints including Polymarket, Kalshi, Chainlink, and Twitter – all in one visual tool, built for traders, analysts, and data enthusiasts.",
    cta: {
      primary: {
        href: "/dashboard",
        text: "Get started",
      },
      secondary: {
        href: "/#pricing",
        text: "View pricing",
      },
    },
  },
} as const;
