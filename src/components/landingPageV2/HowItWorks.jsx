"use client";

import Section from "./Section";
import { Sparkles, Upload, Zap } from "lucide-react";
import { motion } from "framer-motion";

const data = [
  {
    id: 1,
    title: "1. Connect Your Data Instantly",
    content:
      "Pull data directly from Polymarket, Twitter, CoinGecko, and more—no code required. Or upload your own CSV, JSON, or XLSX. Zero setup. Zero headaches. Just data ready to use.",
    icon: <Upload className="w-6 h-6 text-primary" />,
  },
  {
    id: 2,
    title: "2. Run Reliable Models or Ask AI",
    content:
      "Choose from our most trusted, battle-tested models to uncover deep insights in seconds—or let the AI handle it. No Python, no debugging, just actionable results at the click of a button.",
    icon: <Zap className="w-6 h-6 text-primary" />,
  },
  {
    id: 3,
    title: "3. Present & Share Like a Pro",
    content:
      "Build live dashboards or hosted reports that update in real-time. Invite your team, share with the world, or keep it private. Say goodbye to PowerPoint and Canva—Lychee makes your analysis look as smart as it actually is.",
    icon: <Sparkles className="w-6 h-6 text-primary" />,
  },
];

export default function HowItWorks() {
  return (
    <Section title="How it works" subtitle="Absolutely No-brainer No-Code">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        {data.map((item, index) => (
          <motion.div
            key={item.id}
            className="text-center p-6 rounded-xl border bg-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              {item.icon}
            </div>
            <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
            <p className="text-muted-foreground">{item.content}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
