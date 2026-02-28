"use client";

import Section from "./Section";
import { Sparkles, Upload, Zap } from "lucide-react";
import FeaturesVertical from "./FeaturesVertical";

const data = [
  {
    id: 1,
    title: "1. Connect Your Data Instantly",
    content:
      "Pull data directly from Polymarket, Twitter, CoinGecko, and more—no code required. Or upload your own CSV, JSON, or XLSX. Zero setup. Zero headaches. Just data ready to use.",
    image: "/ogImage.png",
    icon: <Upload className="w-6 h-6 text-primary" />,
  },
  {
    id: 2,
    title: "2. Run Reliable Models or Ask AI",
    content:
      "Choose from our most trusted, battle-tested models to uncover deep insights in seconds—or let the AI handle it. No Python, no debugging, just actionable results at the click of a button.",
    image: "/ogImage.png",
    icon: <Zap className="w-6 h-6 text-primary" />,
  },
  {
    id: 3,
    title: "3. Present & Share Like a Pro",
    content:
      "Build live dashboards or hosted reports that update in real-time. Invite your team, share with the world, or keep it private. Say goodbye to PowerPoint and Canva—Lychee makes your analysis look as smart as it actually is.",
    image: "/ogImage.png",
    icon: <Sparkles className="w-6 h-6 text-primary" />,
  },
];

export default function HowItWorks() {
  return (
    <Section title="How it works" subtitle="Absolutely No-brainer No-Code">
      <FeaturesVertical data={data} />
    </Section>
  );
}
