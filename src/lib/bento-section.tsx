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
  title: "Turn Data Into Action — No Code Required",
  description:
    "Lychee makes it effortless to connect data, visualize insights, and automate workflows — all from one simple platform, no coding needed.",
  items: [
    {
      id: "1",
      content: <FirstBentoAnimation />,
      title: "Connect Your Data Instantly",
      description:
        "Bring together spreadsheets, APIs, and social data in one place. No setup, no headaches — just a unified view of your information.",
    },
    {
      id: "2",
      content: <SecondBentoAnimation />,
      title: "Visual Dashboards in Seconds",
      description:
        "Create charts, tables, and interactive dashboards in minutes. Spot trends and track metrics without writing a single formula.",
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
      title: "Instant Insights at Your Fingertips",
      description:
        "Turn raw numbers into clear, actionable insights. Make smarter decisions faster with always-ready visualizations.",
    },
    {
      id: "4",
      content: <FourthBentoAnimation once={false} />,
      title: "Automate Routine Updates",
      description:
        "Set up refreshes, schedule reports, and reduce repetitive tasks. Keep your data current without lifting a finger.",
    },
  ],
} as const;

