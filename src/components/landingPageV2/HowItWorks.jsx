"use client";

import Section from "./Section";
import { Sparkles, Upload, Zap } from "lucide-react";
import { motion } from "framer-motion";

const data = [
  {
    id: 1,
    title: "1. Add Your Data",
    content:
      "Simply add your data to our platform. We support various formats to ensure a seamless integration with your workflow.",
    icon: <Upload className="w-6 h-6 text-primary" />,
  },
  {
    id: 2,
    title: "2. Choose Chart Type",
    content:
      "Select from bar, line, pie, area charts and more. Our intuitive interface makes it easy to pick the right visualization.",
    icon: <Zap className="w-6 h-6 text-primary" />,
  },
  {
    id: 3,
    title: "3. Export & Share",
    content:
      "Export your charts in PNG, SVG, or other formats. Share with your team or embed in presentations and reports.",
    icon: <Sparkles className="w-6 h-6 text-primary" />,
  },
];

export default function HowItWorks() {
  return (
    <Section title="How it works" subtitle="Just 3 steps to get started">
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
