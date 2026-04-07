import type { ReactNode } from "react";
import { FirstBentoAnimation } from "@/components/first-bento-animation";
import { FourthBentoAnimation } from "@/components/fourth-bento-animation";
import { SecondBentoAnimation } from "@/components/second-bento-animation";
import { ThirdBentoAnimation } from "@/components/third-bento-animation";

export type BentoItem = {
  id: string;
  title: string;
  description: string;
  content: ReactNode;
};

export type BentoSectionConfig = {
  title: string;
  description: string;
  items: readonly BentoItem[];
};

export const bentoSection: BentoSectionConfig = {
  title: "Empower Your Workflow with AI",
  description:
    "Ask your AI Agent for real-time collaboration, seamless integrations, and actionable insights to streamline your operations.",
  items: [
    {
      id: "1",
      content: <FirstBentoAnimation />,
      title: "Real-time AI Collaboration",
      description:
        "Experience real-time assistance. Ask your AI Agent to coordinate tasks, answer questions, and maintain team alignment.",
    },
    {
      id: "2",
      content: <SecondBentoAnimation />,
      title: "Seamless Integrations",
      description:
        "Unite your favorite tools for effortless connectivity. Boost productivity through interconnected workflows.",
    },
    {
      id: "3",
      content: (
        <ThirdBentoAnimation
          data={[20, 30, 25, 45, 40, 55, 75]}
          toolTipValues={[
            1234, 1678, 2101, 2534, 2967, 3400, 3833, 4266, 4700, 5133,
          ]}
        />
      ),
      title: "Instant Insight Reporting",
      description:
        "Transform raw data into clear insights in seconds. Empower smarter decisions with real-time, always-learning intelligence.",
    },
    {
      id: "4",
      content: <FourthBentoAnimation once={false} />,
      title: "Smart Automation",
      description:
        "Set it, forget it. Your AI Agent tackles repetitive tasks so you can focus on strategy, innovation, and growth.",
    },
  ],
} as const;

