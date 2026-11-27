/**
 * Shared product / integration feature-icon catalog (Figma-style marks).
 * Use FeatureIcon / FeatureIconLabel / FeatureIconStrip for consistent listing.
 */

export type FeatureIconKind = "mark" | "logo";

export type FeatureIconDef = {
  id: string;
  label: string;
  kind: FeatureIconKind;
  /** Solid tile background (logo tiles + colored marks). */
  tileClass: string;
  /** Lucide-friendly glyph key for mark icons. */
  glyph?: "export" | "jarvis" | "mcp" | "more";
  /** Public asset path for brand logos. */
  logoSrc?: string;
  /** Optional badge shown in legends (e.g. Beta). */
  badge?: string;
};

/** First-party product capabilities. */
export const PRODUCT_FEATURE_ICONS = {
  export: {
    id: "export",
    label: "Export",
    kind: "mark",
    tileClass: "bg-[#0d99ff] text-white",
    glyph: "export",
  },
  jarvis: {
    id: "jarvis",
    label: "Jarvis",
    kind: "mark",
    tileClass: "bg-[#f59e0b] text-white",
    glyph: "jarvis",
    badge: "Early access",
  },
  mcp: {
    id: "mcp",
    label: "MCP",
    kind: "mark",
    tileClass: "bg-[#10b981] text-white",
    glyph: "mcp",
  },
  more: {
    id: "more",
    label: "And much more",
    kind: "mark",
    tileClass: "bg-muted text-muted-foreground",
    glyph: "more",
  },
} as const satisfies Record<string, FeatureIconDef>;

/**
 * Major integrations surfaced in marketing / connect / pricing.
 * Reuses existing public brand assets.
 */
export const INTEGRATION_FEATURE_ICONS = {
  kalshi: {
    id: "kalshi",
    label: "Kalshi",
    kind: "logo",
    tileClass: "bg-[#28CC95]",
    logoSrc: "/landing/logos/kalshi.png",
  },
  polymarket: {
    id: "polymarket",
    label: "Polymarket",
    kind: "logo",
    tileClass: "bg-[#2E5CFF]",
    logoSrc: "/polymarket.png",
  },
  chainlink: {
    id: "chainlink",
    label: "Chainlink",
    kind: "logo",
    tileClass: "bg-[#375BD2] p-[2px]",
    logoSrc: "/chainlink.png",
  },
  binance: {
    id: "binance",
    label: "Binance",
    kind: "logo",
    tileClass: "bg-black",
    logoSrc: "/binance.jpeg",
    badge: "Beta",
  },
  x: {
    id: "x",
    label: "X",
    kind: "logo",
    tileClass: "bg-white p-[2px] ring-1 ring-inset ring-border",
    logoSrc: "/x.png",
    badge: "Coming soon",
  },
  reddit: {
    id: "reddit",
    label: "Reddit",
    kind: "logo",
    tileClass: "bg-[#FF4500] p-[1px]",
    logoSrc: "/reddit.png",
    badge: "Coming soon",
  },
  coinGecko: {
    id: "coinGecko",
    label: "CoinGecko",
    kind: "logo",
    tileClass: "bg-black p-[2px]",
    logoSrc: "/coinGecko.png",
    badge: "Coming soon",
  },
  wallStreetBets: {
    id: "wallStreetBets",
    label: "Wall Street Bets",
    kind: "logo",
    tileClass: "bg-[#FF4500] p-[1px]",
    logoSrc: "/wallStreetBets.png",
    badge: "Coming soon",
  },
} as const satisfies Record<string, FeatureIconDef>;

export type ProductFeatureIconId = keyof typeof PRODUCT_FEATURE_ICONS;
export type IntegrationFeatureIconId = keyof typeof INTEGRATION_FEATURE_ICONS;
export type FeatureIconId = ProductFeatureIconId | IntegrationFeatureIconId;

export const FEATURE_ICON_CATALOG: Record<FeatureIconId, FeatureIconDef> = {
  ...PRODUCT_FEATURE_ICONS,
  ...INTEGRATION_FEATURE_ICONS,
};

/** Default strip order for “every integration” rows on upsells. */
export const PRIMARY_INTEGRATION_ICON_IDS: IntegrationFeatureIconId[] = [
  "kalshi",
  "polymarket",
  "chainlink",
  "binance",
  "x",
  "reddit",
];

export function getFeatureIcon(id: FeatureIconId): FeatureIconDef {
  return FEATURE_ICON_CATALOG[id];
}

export function resolveFeatureIcon(id: string): FeatureIconDef | undefined {
  return FEATURE_ICON_CATALOG[id as FeatureIconId];
}
