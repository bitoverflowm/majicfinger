import { siteConfig } from "@/lib/config";
import { getLycheeContentRegistry } from "@/lib/content/lychee-content-registry";
import type { ResolvedRegistryEntry } from "@/lib/content/lychee-content-registry";
import {
  CONTENT_CLASS_LABELS,
  CONTENT_CLASS_ORDER,
  INTEGRATION_HUB_ORDER,
  INTEGRATION_HUBS,
  integrationTopicLabel,
  type ContentClass,
  type IntegrationHub,
  type IntegrationTopic,
} from "@/lib/content/taxonomy";

export type LycheeContentNavLink = {
  label: string;
  href: string;
  slug?: string;
};

export type LycheeContentNavBucket = {
  id: ContentClass;
  label: string;
  items: LycheeContentNavLink[];
};

export type LycheeContentNavTopic = {
  id: IntegrationTopic;
  label: string;
  buckets: LycheeContentNavBucket[];
};

export type LycheeContentNavSection = {
  id: string;
  label: string;
  /** Hub landing page — integration sections only. */
  hubHref?: string;
  topics?: LycheeContentNavTopic[];
  /** Flat list — Build in public changelogs. */
  items?: LycheeContentNavLink[];
};

export type LycheeContentNavData = {
  platform: LycheeContentNavLink[];
  sections: LycheeContentNavSection[];
  cta: {
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
  };
};

/** Match active sidebar link on the server (no client pathname required). */
export function isLycheeContentNavLinkActive(
  href: string,
  currentPath: string,
): boolean {
  if (href.startsWith("/#")) return false;
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function toNavLink(entry: ResolvedRegistryEntry): LycheeContentNavLink {
  return {
    label: entry.label,
    href: entry.href,
    ...(entry.slug && { slug: entry.slug }),
  };
}

function buildIntegrationSections(
  entries: ResolvedRegistryEntry[],
): LycheeContentNavSection[] {
  const sections: LycheeContentNavSection[] = [];

  for (const hubId of INTEGRATION_HUB_ORDER) {
    const hubEntries = entries.filter(
      (entry) =>
        entry.integrationHub === hubId && entry.contentClass !== "changelog",
    );
    if (hubEntries.length === 0) continue;

    const hubMeta = INTEGRATION_HUBS[hubId];
    const topics: LycheeContentNavTopic[] = [];

    for (const topicId of hubMeta.topicOrder) {
      const topicEntries = hubEntries.filter(
        (entry) => entry.integrationTopic === topicId,
      );
      if (topicEntries.length === 0) continue;

      const buckets: LycheeContentNavBucket[] = [];

      for (const contentClass of CONTENT_CLASS_ORDER) {
        const bucketEntries = topicEntries.filter(
          (entry) => entry.contentClass === contentClass,
        );
        if (bucketEntries.length === 0) continue;

        buckets.push({
          id: contentClass,
          label: CONTENT_CLASS_LABELS[contentClass],
          items: bucketEntries.map(toNavLink),
        });
      }

      topics.push({
        id: topicId,
        label: integrationTopicLabel(hubId, topicId),
        buckets,
      });
    }

    sections.push({
      id: hubId,
      label: hubMeta.label,
      hubHref: hubMeta.href,
      topics,
    });
  }

  return sections;
}

function buildBuildInPublicSection(
  entries: ResolvedRegistryEntry[],
): LycheeContentNavSection | null {
  const changelogs = entries
    .filter((entry) => entry.contentClass === "changelog")
    .sort((a, b) =>
      (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
    );

  if (changelogs.length === 0) return null;

  return {
    id: "build-in-public",
    label: "Build in public",
    items: changelogs.map(toNavLink),
  };
}

/** Server-side nav tree for lychee_content reading chrome (sidebar). */
export function getLycheeContentNavData(): LycheeContentNavData {
  const registry = getLycheeContentRegistry();
  const sections = buildIntegrationSections(registry);
  const buildInPublic = buildBuildInPublicSection(registry);

  if (buildInPublic) {
    sections.push(buildInPublic);
  }

  return {
    platform: [
      { label: "Home", href: "/" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Guides", href: "/guides" },
      { label: "Dashboards", href: "/#guides" },
    ],
    sections,
    cta: {
      primary: {
        label: siteConfig.hero.cta.primary.text,
        href: "/#demo",
      },
      secondary: {
        label: "Log in",
        href: "/login",
      },
    },
  };
}
