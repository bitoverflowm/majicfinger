import {
  INTEGRATION_HUBS,
  type IntegrationHub,
} from "@/lib/content/taxonomy";
import type { HubSection } from "@/types/hub";

type IntegrationHubSectionOptions = {
  hubId: IntegrationHub;
  heroSubtitle: string;
  heroMicrotext?: string;
  introTitle: string;
  introContent: string;
  useCasesTitle: string;
  useCasesContent: string;
  linkGroupTitle: string;
  ctaTitle: string;
  ctaDescription: string;
  extraSections?: HubSection[];
};

export function createIntegrationHubSections(
  options: IntegrationHubSectionOptions,
): HubSection[] {
  const hubMeta = INTEGRATION_HUBS[options.hubId];

  const sections: HubSection[] = [
    {
      type: "hero",
      title: hubMeta.label,
      subtitle: options.heroSubtitle,
      microtext: options.heroMicrotext,
      primaryCTAs: [{ label: "Browse guides", href: "#guides" }],
      secondaryCTAs: [{ label: "Get started", href: "/#demo" }],
    },
    {
      type: "text_block",
      title: options.introTitle,
      content: options.introContent,
    },
  ];

  sections.push({
    type: "link_group",
    anchorId: "guides",
    title: options.linkGroupTitle,
    groups: [],
  });

  if (options.extraSections?.length) {
    sections.push(...options.extraSections);
  }

  sections.push(
    {
      type: "text_block",
      title: options.useCasesTitle,
      content: options.useCasesContent,
    },
    {
      type: "cta",
      title: options.ctaTitle,
      description: options.ctaDescription,
      cta: {
        label: "Start Free Query",
        href: "/#demo",
        requiresAuth: false,
      },
      secondaryCta: {
        label: "Get Full Access",
        href: "/#pricing",
        requiresAuth: false,
      },
    },
  );

  return sections;
}
