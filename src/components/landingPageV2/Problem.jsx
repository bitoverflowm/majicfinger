"use client";

import BlurFade from "./BlurFade";
import Section from "./Section";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Shield, Zap } from "lucide-react";

const problems = [
  {
    title: "Data is everywhere—and it’s a mess",
    description:
      "Polymarket, Twitter, CoinGecko… each source speaks a different language. Piecing it together manually costs hours, sanity, and missed opportunities.",
    icon: Shield,
  },
  {
    title: "Your edge is lost in the workflow",
    description:
      "Downloading CSVs, cleaning data, plotting charts, copy-pasting into slides… by the time you’re done, the opportunity has passed. Most traders never act fast enough. Don’t be most traders.",
    icon: Zap,
  },
  {
    title: "Excel won’t make you a quant",
    description:
      "Rows and columns can’t predict markets, they can’t automate insights, and they certainly can’t let one person beat a whole team of quants. Lychee can.",
    icon: Brain,
  },
];

export default function Problem() {
  return (
    <Section title="Problem" subtitle="You have no idea what's going on.">
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
