import type { ReactNode } from "react";

export type BentoItem = {
  id: string;
  title: string;
  description: string;
  content: ReactNode;
};

/** Copy only: `siteConfig` is imported by client components on every page, so it must not pull in animation code. */
export type BentoCopyItem = Omit<BentoItem, "content">;

export type BentoSectionConfig = {
  title: string;
  description: string;
  items: readonly BentoCopyItem[];
};

export const bentoSection: BentoSectionConfig = {
  title: "Connect Kalshi, Polymarket, and market data in one workspace",
  description:
    "Query live and historical prediction market data, build charts, create dashboards, export results, and test ideas without code or API setup.",
  items: [
    {
      id: "1",
      title: "Connect Your Data Instantly",
      description:
        "Bring together spreadsheets, APIs, and social data in one place. No setup, no headaches — just a unified view of your information.",
    },
    {
      id: "2",
      title: "Visual Dashboards in Seconds",
      description:
        "Create charts, tables, and interactive dashboards in minutes. Spot trends and track metrics without writing a single formula.",
    },
    {
      id: "3",
      title: "Instant Insights at Your Fingertips",
      description:
        "Turn raw numbers into clear, actionable insights. Make smarter decisions faster with always-ready visualizations.",
    },
    {
      id: "4",
      title: "Automate Routine Updates",
      description:
        "Set up refreshes, schedule reports, and reduce repetitive tasks. Keep your data current without lifting a finger.",
    },
  ],
} as const;
