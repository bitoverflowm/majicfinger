import type { HubLinkGroupSection } from "@/types/hub";

export const polymarketHistoricalResearchGuides: HubLinkGroupSection = {
  type: "link_group",
  anchorId: "guides-research",
  eyebrow: "LEARN THE DATA",
  title: "Polymarket Historical Data Guides and Research",
  description:
    "Start with the historical workspace, then go deeper into the market definitions, research methods, and analysis patterns behind prices, trades, events, and resolutions.",
  categories: [
    {
      subgroups: [
        {
          label: "Guides",
          links: [
            {
              title: "Polymarket Odds Over Time",
              href: "/guides/polymarket-odds-over-time",
              description:
                "Track how a market’s implied probability changed, read the historical path, and turn price history into an interpretable chart.",
            },
            {
              title: "Find a Polymarket Market ID",
              href: "/guides/polymarket-market-id",
              description:
                "Understand the market, event, condition, token, and asset identifiers used to connect Polymarket data.",
            },
            {
              title: "Explore Polymarket Events Without Code",
              href: "/guides/polymarket-events-endpoint-no-code",
              description:
                "Find event metadata and connected markets through a visual workflow.",
            },
          ],
        },
      ],
    },
  ],
  cta: {
    label: "Upgrade Now to Get Full Access",
    href: "#pricing",
    ariaLabel: "Upgrade now to get full access — view pricing",
    requiresAuth: false,
    eventLabel: "polymarket_historical_guides_upgrade",
    tracking: {
      page: "/polymarket-historical-data",
      destination: "pricing",
    },
  },
};
