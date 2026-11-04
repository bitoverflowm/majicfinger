export type ChangelogEntryLink = {
  label: string;
  href: string;
};

export type ChangelogEntryExtras = {
  tweetId?: string;
  links?: ChangelogEntryLink[];
};

/** Extra media/links shown on `/changelog` under a release, keyed by MDX filename slug. */
export const CHANGELOG_ENTRY_EXTRAS: Record<string, ChangelogEntryExtras> = {
  "polymarket-top-holders": {
    links: [
      {
        label: "Read the recipe guide",
        href: "/guides/polymarket-top-holders",
      },
      {
        label: "Try the recipe",
        href: "/?recipe=polymarketHolderAnalysis#demo",
      },
    ],
  },
  "download-polymarket-trade-history": {
    links: [
      {
        label: "Read the recipe guide",
        href: "/guides/download-polymarket-trade-history",
      },
      {
        label: "Try the recipe",
        href: "/?recipe=polymarketTradeHistory#demo",
      },
    ],
  },
  "download-kalshi-trade-history": {
    links: [
      {
        label: "Read the recipe guide",
        href: "/guides/download-kalshi-trade-history",
      },
      {
        label: "Try the recipe",
        href: "/?recipe=kalshiTradeHistory#demo",
      },
    ],
  },
  "compare-kalshi-polymarket-odds": {
    tweetId: "2101004863379509595",
    links: [
      {
        label: "Read the guide",
        href: "/guides/how-to-compare-kalshi-polymarket-odds",
      },
      {
        label: "Open the comparison tool",
        href: "/kalshi-vs-polymarket-odds",
      },
    ],
  },
};
