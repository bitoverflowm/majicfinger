export const siteConfig = {
  name: "Lychee",
  url: "https://lycheedata.com",
  description: "Lychee: Your Quant in a Box",
  links: {
    twitter: "https://x.com/misterrpink1",
    github: "https://github.com/misterrpink1",
  },
} as const;

export type SiteConfig = typeof siteConfig;
