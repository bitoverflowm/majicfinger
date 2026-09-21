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
