import { getLycheeContentRegistry } from "@/lib/content/lychee-content-registry";
import {
  CONTENT_CLASS_ORDER,
  INTEGRATION_HUBS,
  integrationTopicLabel,
  type IntegrationHub,
} from "@/lib/content/taxonomy";
import type { HubLinkGroup } from "@/types/hub";

/** Build hub link groups from the lychee_content registry (topic → content links). */
export function buildRegistryHubLinkGroups(
  hubId: IntegrationHub,
): HubLinkGroup[] {
  const registry = getLycheeContentRegistry();
  const hubMeta = INTEGRATION_HUBS[hubId];
  const hubEntries = registry.filter(
    (entry) =>
      entry.integrationHub === hubId && entry.contentClass !== "changelog",
  );

  const groups: HubLinkGroup[] = [];

  for (const topicId of hubMeta.topicOrder) {
    const topicEntries = hubEntries.filter(
      (entry) => entry.integrationTopic === topicId,
    );
    if (topicEntries.length === 0) continue;

    const links: HubLinkGroup["links"] = [];

    for (const contentClass of CONTENT_CLASS_ORDER) {
      for (const entry of topicEntries.filter(
        (e) => e.contentClass === contentClass,
      )) {
        links.push({ title: entry.label, href: entry.href });
      }
    }

    if (links.length > 0) {
      groups.push({
        label: integrationTopicLabel(hubId, topicId),
        links,
      });
    }
  }

  return groups;
}
