export type ContentClass = "research" | "guide" | "changelog" | "dashboard";

export type IntegrationHub =
  | "kalshi-historical"
  | "kalshi-live"
  | "polymarket-historical"
  | "polymarket-live"
  | "platform";

export type IntegrationTopic =
  | "overview"
  | "volume"
  | "politics"
  | "weather"
  | "markets"
  | "general"
  | "chainlink"
  | "sports"
  | "finance";

export const CONTENT_CLASS_LABELS: Record<ContentClass, string> = {
  dashboard: "Dashboards",
  research: "Research",
  guide: "Guides",
  changelog: "Changelog",
};

/** Sidebar bucket order within each topic. */
export const CONTENT_CLASS_ORDER: ContentClass[] = [
  "dashboard",
  "research",
  "guide",
];

export const INTEGRATION_HUB_ORDER: IntegrationHub[] = [
  "kalshi-historical",
  "kalshi-live",
  "polymarket-historical",
  "polymarket-live",
  "platform",
];

export type IntegrationHubMeta = {
  label: string;
  href: string;
  topicOrder: IntegrationTopic[];
  topicLabels: Partial<Record<IntegrationTopic, string>>;
};

export const INTEGRATION_HUBS: Record<IntegrationHub, IntegrationHubMeta> = {
  "kalshi-historical": {
    label: "Kalshi Historical",
    href: "/kalshi-historical-data",
    topicOrder: ["overview", "volume", "politics", "weather"],
    topicLabels: {
      overview: "Overview",
      volume: "Volume",
      politics: "Politics",
      weather: "Weather",
    },
  },
  "kalshi-live": {
    label: "Kalshi Live",
    href: "/kalshi-live-data",
    topicOrder: ["overview", "markets"],
    topicLabels: {
      overview: "Overview",
      markets: "Markets",
    },
  },
  "polymarket-historical": {
    label: "Polymarket Historical",
    href: "/polymarket-historical-data",
    topicOrder: ["overview", "markets"],
    topicLabels: {
      overview: "Overview",
      markets: "Markets",
    },
  },
  "polymarket-live": {
    label: "Polymarket Live",
    href: "/polymarket-live-data",
    topicOrder: ["overview", "markets"],
    topicLabels: {
      overview: "Overview",
      markets: "Markets",
    },
  },
  platform: {
    label: "Platform",
    href: "/guides",
    topicOrder: ["general", "chainlink"],
    topicLabels: {
      general: "General",
      chainlink: "Chainlink",
    },
  },
};

export function integrationTopicLabel(
  hub: IntegrationHub,
  topic: IntegrationTopic,
): string {
  return (
    INTEGRATION_HUBS[hub].topicLabels[topic] ??
    topic.charAt(0).toUpperCase() + topic.slice(1)
  );
}
