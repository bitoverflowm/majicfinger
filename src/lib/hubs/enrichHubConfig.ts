import { buildRegistryHubLinkGroups } from "@/lib/hubs/buildRegistryLinkGroups";
import type { IntegrationHub } from "@/lib/content/taxonomy";
import type { HubPageConfig, HubSection } from "@/types/hub";

/** Inject registry-driven guide links into hub configs at request time (server only). */
export function enrichHubConfig(config: HubPageConfig): HubPageConfig {
  const hubId = config.id as IntegrationHub | undefined;
  if (!hubId) return config;

  const groups = buildRegistryHubLinkGroups(hubId);
  let foundGuidesSection = false;

  const sections = config.sections.flatMap((section) => {
    if (
      section.type !== "link_group" ||
      section.anchorId !== "guides" ||
      (section.categories && section.categories.length > 0)
    ) {
      return [section];
    }

    foundGuidesSection = true;
    if (groups.length === 0) return [];
    return [{ ...section, groups }];
  });

  if (!foundGuidesSection && groups.length > 0) {
    const guidesSection: HubSection = {
      type: "link_group",
      anchorId: "guides",
      title: `${config.title.split("|")[0]?.trim() || config.title} Guides`,
      groups,
    };

    const heroIndex = sections.findIndex((section) => section.type === "hero");
    const insertAt = heroIndex >= 0 ? heroIndex + 1 : 0;
    sections.splice(insertAt, 0, guidesSection);
  }

  return { ...config, sections };
}
