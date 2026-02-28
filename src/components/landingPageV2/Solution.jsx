"use client";

import Section from "./Section";
import { motion } from "framer-motion";
import { BarChart3, Brain, LineChart, FileText } from "lucide-react";
import Image from "next/image";

const features = [
  {
    title: "Instant Graphs",
    description: "Analyze anything. Let our AI do the heavy lifting. 0 lines of code.",
    icon: BarChart3,
  },
  {
    title: "Direct Data Connections",
    description: "Connect directly to Polymarket, Twitter, CoinGecko, and more. No code required.",
    icon: LineChart,
  },
  {
    title: "Website in 0.37 Seconds",
    description: "Build an entire website from Google Sheets, Excel or .csv. Instantly.",
    icon: Brain,
  },
  {
    title: "Workflow Collapse",
    description: "Raw data to analysis, charts and actionable insights in seconds. Real quantitative edge.",
    icon: FileText,
  },
];

export default function Solution() {
  return (
    <Section
      title="Solution"
      subtitle="Lychee is workflow collapse"
      description="No CSVs, No Python, No copy-pasting. Just raw data to analysis, charts and actionable insights in seconds. Real quantitative edge. 0 lines of code."
      className="bg-muted/50"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            className="group relative overflow-hidden bg-background p-6 rounded-2xl border hover:shadow-lg transition-shadow"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2 text-primary">{feature.title}</h3>
            <p className="text-foreground text-sm">{feature.description}</p>
          </motion.div>
        ))}
      </div>
      <motion.div
        className="mt-12 rounded-xl border overflow-hidden bg-muted"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="relative w-full aspect-video">
          <Image
            src="/chart1.png"
            alt="Chart dashboard preview"
            fill
            className="object-cover"
          />
        </div>
      </motion.div>
    </Section>
  );
}
