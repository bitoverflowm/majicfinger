"use client";

import BlurFade from "./BlurFade";
import Section from "./Section";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Shield, Zap } from "lucide-react";

const problems = [
  {
    title: "CSVs, Python, Copy-Pasting",
    description:
      "The old workflow: export data, write Python scripts, copy-paste between tools. Hours wasted on plumbing instead of insights.",
    icon: Brain,
  },
  {
    title: "Slow Data to Insights",
    description:
      "Traditional data pipelines are too slow. By the time you've analyzed the data, the opportunity has passed.",
    icon: Zap,
  },
  {
    title: "Scattered Data Sources",
    description:
      "Polymarket, Twitter, CoinGecko—each has its own API, its own format. Connecting them used to require code.",
    icon: Shield,
  },
];

export default function Problem() {
  return (
    <Section title="Problem" subtitle="The old way of working with data is a hassle.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        {problems.map((problem, index) => (
          <BlurFade key={index} delay={0.2 + index * 0.2} inView>
            <Card className="bg-background border-none shadow-none">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <problem.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{problem.title}</h3>
                <p className="text-muted-foreground">{problem.description}</p>
              </CardContent>
            </Card>
          </BlurFade>
        ))}
      </div>
    </Section>
  );
}
