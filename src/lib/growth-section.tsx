import { GrowthDnaHelixArt } from "@/components/growth-dna-helix-art";
import { GrowthDnaRnaHelixArt } from "@/components/growth-dna-rna-helix-art";

export const growthSection = {
  title: "Turn Data Into Action",
  description:
    "Lychee isn’t just about seeing numbers — it’s about making decisions, testing ideas, and discovering insights faster than ever.",
  items: [
    {
      id: 1,
      content: <GrowthDnaHelixArt />,
      title: "Spot Trends Instantly",
      description:
        "From markets to social sentiment, see patterns emerge in real time. Make informed moves before others even notice the shift.",
    },
    {
      id: 2,
      content: <GrowthDnaRnaHelixArt />,
      title: "Test Ideas Quickly",
      description:
        "Run what-if scenarios, backtest strategies, or explore historical data — all without writing a line of code. Validate your decisions fast.",
    },
  ],
} as const;

