import { API_INTEGRATIONS, integrations_list } from "@/components/integrationsView/integrationsConfig";

/** Logo paths for sidebar integration rows (matches data sheet panel options). */
export const INTEGRATION_LOGO_BY_HANDLER = {
  binance: "/binance.jpeg",
  chainlink: "/chainlink.png",
  coinGecko: "/coinGecko.png",
  geckoDex: "/geckoDex1.png",
  polymarket: "/polymarket.png",
  polymarketHistorical: "/polymarket.png",
  kalshiHistorical: "/kalshi.png",
  twitter: "/x.png",
  wallStreetBets: "/wallStreetBets.png",
  productHunt: "/productHunt.png",
  shortSqueeze: "/shortSqueeze.png",
  secEdgar: "/sec.png",
  censusGov: "/censusGov.png",
  crunchbase: "/crunchbase.png",
  hackerNews: "/hackerNews.png",
};

const DEMO_ACTIVE_INTEGRATION_VALUES = new Set(["polymarket", "coinGecko"]);

function isComingSoonTags(tags) {
  return (tags || []).some((t) => /coming soon/i.test(String(t)));
}

/**
 * @param {{ isDemo?: boolean }} [opts]
 */
export function buildIntegrationPickerRows({ isDemo = false } = {}) {
  return integrations_list
    .filter((item) => item?.clickHandler)
    .map((item) => {
      const id = item.clickHandler;
      const comingSoon = isComingSoonTags(item.tags) || !item.live;
      const isApi = API_INTEGRATIONS.includes(id);
      const isProOnly = isDemo && !DEMO_ACTIVE_INTEGRATION_VALUES.has(id);
      const available = isApi && !!item.live && !comingSoon && !isProOnly;

      let badge = null;
      if (isProOnly) badge = "Pro";
      else if (!available) badge = "Coming soon";

      return {
        id,
        name: item.name,
        description: item.description,
        logoPath: INTEGRATION_LOGO_BY_HANDLER[id] ?? null,
        icon: item.icon,
        available,
        badge,
        selected: false,
      };
    })
    .sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function filterIntegrationPickerRows(rows, query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const hay = `${row.name} ${row.id}`.toLowerCase();
    return hay.includes(q);
  });
}
