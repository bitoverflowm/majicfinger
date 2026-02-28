"use client";

import Section from "./Section";
import { Sparkles, Upload, Zap } from "lucide-react";
import { motion } from "framer-motion";

const data = [
  {
    id: 1,
    title: "1. Connect Your Data",
    content:
      "Connect directly to Polymarket, Twitter, CoinGecko, and more. No code required. Not a single line.",
    icon: <Upload className="w-6 h-6 text-primary" />,
  },
  {
    id: 2,
    title: "2. Let AI Analyze",
    content:
      "Ask in plain English: 'Turn my dataset into an article', 'Identify the main takeaways', 'Create a presentation for me.'",
    icon: <Zap className="w-6 h-6 text-primary" />,
  },
  {
    id: 3,
    title: "3. Get Insights & Charts",
    content:
      "Instant graphs, zero hassle. Raw data to analysis, charts and actionable insights in seconds.",
    icon: <Sparkles className="w-6 h-6 text-primary" />,
  },
];

export default function HowItWorks() {
  return (
    <Section title="How it works" subtitle="0 lines of code. 3 steps.">
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
