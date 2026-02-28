"use client";

import { useState } from "react";
import Section from "./Section";
import { BarChart3, Brain, FileText, LineChart } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

const data = [
  {
    id: 1,
    title: "AI-Powered Dashboard",
    content: "Visualize trends and gain insights at a glance.",
    image: "/chart1.png",
    icon: <BarChart3 className="h-6 w-6 text-primary" />,
  },
  {
    id: 2,
    title: "Multiple Chart Types",
    content: "Bar, line, pie, area charts and more.",
    image: "/chart0.png",
    icon: <Brain className="h-6 w-6 text-primary" />,
  },
  {
    id: 3,
    title: "Predictive Analytics",
    content: "Forecast trends and make data-driven decisions.",
    image: "/chart1.png",
    icon: <LineChart className="h-6 w-6 text-primary" />,
  },
  {
    id: 4,
    title: "Export & Share",
    content: "Export to PNG, SVG and share with your team.",
    image: "/chart0.png",
    icon: <FileText className="h-6 w-6 text-primary" />,
  },
];

export default function Features() {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <Section
      id="features"
      title="Features"
      subtitle="Everything you need for data visualization"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        <div className="space-y-4">
          {data.map((item, index) => (
            <motion.div
              key={item.id}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                currentIndex === index ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => setCurrentIndex(index)}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.content}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <motion.div
          key={currentIndex}
          className="rounded-xl border overflow-hidden bg-muted"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative w-full aspect-video">
            <Image
              src={data[currentIndex]?.image || "/chart1.png"}
              alt={data[currentIndex]?.title}
              fill
              className="object-cover"
            />
          </div>
        </motion.div>
      </div>
    </Section>
  );
}
