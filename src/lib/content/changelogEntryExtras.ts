export type ChangelogEntryLink = {
  label: string;
  href: string;
};

export type ChangelogEntryHighlight = {
  title: string;
  body: string;
};

export type ChangelogEntryExtras = {
  tweetId?: string;
  highlights?: ChangelogEntryHighlight[];
  links?: ChangelogEntryLink[];
};

/** Extra media/links shown on `/changelog` under a release, keyed by MDX filename slug. */
export const CHANGELOG_ENTRY_EXTRAS: Record<string, ChangelogEntryExtras> = {
  "polymarket-holder-terminal-launch": {
    highlights: [
      {
        title: "Know who's on the other side.",
        body: "Every market opens with its YES and NO holders, what they paid, and how much of each side the top ten wallets own.",
      },
      {
        title: "Separate skill from luck.",
        body: "The Lychee Skill Score rates each wallet on finished markets only, so you can see whether a side is backed by proven traders or by noise.",
      },
      {
        title: "Spot the early movers.",
        body: "New wallets, first-ever trades, and wallets holding both sides are flagged, so the wallets worth a closer look stand out.",
      },
      {
        title: "Trade the why, not just the price.",
        body: "Headlines from Google News and GDELT sit on the price chart, so every jump in the odds comes with the story behind it.",
      },
      {
        title: "Follow the best wallets live.",
        body: "Open any trader for their P&L, open bets, and finished markets, and get an alert the moment they make a new trade.",
      },
    ],
    links: [
      {
        label: "Open the terminal",
        href: "/dashboard?terminal=holder",
      },
      {
        label: "Take the tour",
        href: "/polymarket-holder-terminal",
      },
      {
        label: "Look up market holders",
        href: "/polymarket-market-holders",
      },
      {
        label: "Track a wallet",
        href: "/polymarket-wallet-tracker",
      },
    ],
  },
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
