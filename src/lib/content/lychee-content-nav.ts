import { siteConfig } from "@/lib/config";
import { getLycheeContentRegistry } from "@/lib/content/lychee-content-registry";
import type { ResolvedRegistryEntry } from "@/lib/content/lychee-content-registry";
import { listUniversityLessons } from "@/lib/university/lessons";
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

export type LycheeContentNavGroup = {
  id: string;
  label: string;
  items: LycheeContentNavLink[];
};

export type LycheeContentNavSection = {
  id: string;
  label: string;
  /** Hub landing page — integration sections only. */
  hubHref?: string;
  topics?: LycheeContentNavTopic[];
  /** Cluster lists, used by University. */
  groups?: LycheeContentNavGroup[];
  /** Flat list of links, used instead of topics. */
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

export function isLycheeContentNavLinkTreeActive(
  items: LycheeContentNavLink[],
  currentPath: string,
): boolean {
  return items.some((item) =>
    isLycheeContentNavLinkActive(item.href, currentPath),
  );
}

export function isLycheeContentNavBucketActive(
  bucket: LycheeContentNavBucket,
  currentPath: string,
): boolean {
  return isLycheeContentNavLinkTreeActive(bucket.items, currentPath);
}

export function isLycheeContentNavTopicActive(
  topic: LycheeContentNavTopic,
  currentPath: string,
): boolean {
  return topic.buckets.some((bucket) =>
    isLycheeContentNavBucketActive(bucket, currentPath),
  );
}

export function isLycheeContentNavSectionActive(
  section: LycheeContentNavSection,
  currentPath: string,
): boolean {
  if (
    section.hubHref &&
    isLycheeContentNavLinkActive(section.hubHref, currentPath)
  ) {
    return true;
  }
  if (section.items) {
    return isLycheeContentNavLinkTreeActive(section.items, currentPath);
  }
  if (section.groups?.length) {
    return section.groups.some((group) =>
      isLycheeContentNavLinkTreeActive(group.items, currentPath),
    );
  }
  return (
    section.topics?.some((topic) =>
      isLycheeContentNavTopicActive(topic, currentPath),
    ) ?? false
  );
}

function toNavLink(entry: ResolvedRegistryEntry): LycheeContentNavLink {
  return {
    label: entry.label,
    href: entry.href,
    ...(entry.slug && { slug: entry.slug }),
  };
}

function registryEntryKey(entry: ResolvedRegistryEntry): string {
  return entry.slug ?? entry.href;
}

function buildTopicBuckets(
  topicEntries: ResolvedRegistryEntry[],
): LycheeContentNavBucket[] {
  const buckets: LycheeContentNavBucket[] = [];

  for (const contentClass of CONTENT_CLASS_ORDER) {
    const bucketEntries = topicEntries.filter(
      (entry) => entry.contentClass === contentClass,
    );
    if (bucketEntries.length === 0) continue;
    if (contentClass === "changelog") {
      bucketEntries.sort((a, b) =>
        (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
      );
    }

    buckets.push({
      id: contentClass,
      label: CONTENT_CLASS_LABELS[contentClass],
      items: bucketEntries.map(toNavLink),
    });
  }

  return buckets;
}

/** All navigable links under a hub section (for compact collapsed sidebar lists). */
export function flattenLycheeContentNavSectionLinks(
  section: LycheeContentNavSection,
): LycheeContentNavLink[] {
  const links: LycheeContentNavLink[] = [];
  const seen = new Set<string>();

  const add = (items: LycheeContentNavLink[]) => {
    for (const item of items) {
      if (seen.has(item.href)) continue;
      seen.add(item.href);
      links.push(item);
    }
  };

  if (section.items) {
    add(section.items);
  }

  for (const group of section.groups ?? []) {
    add(group.items);
  }

  for (const topic of section.topics ?? []) {
    for (const bucket of topic.buckets) {
      add(bucket.items);
    }
  }

  return links;
}

function buildIntegrationSections(
  entries: ResolvedRegistryEntry[],
): LycheeContentNavSection[] {
  const sections: LycheeContentNavSection[] = [];

  for (const hubId of INTEGRATION_HUB_ORDER) {
    const hubEntries = entries.filter(
      (entry) => entry.integrationHub === hubId,
    );
    if (hubEntries.length === 0) continue;

    const hubMeta = INTEGRATION_HUBS[hubId];
    const topics: LycheeContentNavTopic[] = [];
    const assignedKeys = new Set<string>();

    for (const topicId of hubMeta.topicOrder) {
      const topicEntries = hubEntries.filter(
        (entry) => entry.integrationTopic === topicId,
      );
      if (topicEntries.length === 0) continue;

      for (const entry of topicEntries) {
        assignedKeys.add(registryEntryKey(entry));
      }

      const buckets = buildTopicBuckets(topicEntries);
      if (buckets.length === 0) continue;

      topics.push({
        id: topicId,
        label: integrationTopicLabel(hubId, topicId),
        buckets,
      });
    }

    const unassignedEntries = hubEntries.filter(
      (entry) => !assignedKeys.has(registryEntryKey(entry)),
    );
    if (unassignedEntries.length > 0) {
      const buckets = buildTopicBuckets(unassignedEntries);
      if (buckets.length > 0) {
        topics.push({
          id: "general",
          label: "More",
          buckets,
        });
      }
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

function buildUniversitySection(): LycheeContentNavSection | null {
  const lessons = listUniversityLessons();
  if (lessons.length === 0) return null;

  const groups = new Map<string, LycheeContentNavGroup>();
  for (const lesson of lessons) {
    const existing = groups.get(lesson.cluster);
    const item: LycheeContentNavLink = {
      label: `Lesson ${lesson.lesson} · ${lesson.title}`,
      href: lesson.href,
      slug: lesson.slug,
    };
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(lesson.cluster, {
        id: lesson.cluster,
        label: lesson.clusterLabel,
        items: [item],
      });
    }
  }

  return {
    id: "university",
    label: "University",
    hubHref: "/university",
    groups: [...groups.values()],
  };
}

/** Server-side nav tree for lychee_content reading chrome (sidebar). */
export function getLycheeContentNavData(): LycheeContentNavData {
  const registry = getLycheeContentRegistry();
  const university = buildUniversitySection();
  const sections = [
    ...(university ? [university] : []),
    ...buildIntegrationSections(registry),
  ];

  return {
    platform: [
      { label: "Home", href: "/" },
      { label: "University", href: "/university" },
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
