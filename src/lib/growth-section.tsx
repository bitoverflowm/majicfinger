import { GrowthDnaHelixArt } from "@/components/growth-dna-helix-art";
import { GrowthDnaRnaHelixArt } from "@/components/growth-dna-rna-helix-art";

export const growthSection = {
  title: "Test prediction market ideas before you trade",
  description:
    "Compare Kalshi, Polymarket, historical prices, live feeds, and external signals to backtest hypotheses and find patterns without code.",
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
