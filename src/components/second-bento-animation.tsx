"use client";

import Image from "next/image";
import { OrbitingCircles } from "@/components/ui/orbiting-circle";
import {
  Figma,
  Gem,
  Ship,
  Cloud,
  Sparkles,
  Layers,
  Rocket,
  Globe,
  Bot,
} from "lucide-react";

function OrbIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex size-14 items-center justify-center rounded-full bg-background border border-border shadow-sm">
      {children}
    </div>
  );
}

export function SecondBentoAnimation() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-full bg-gradient-to-t from-background to-transparent z-20"></div>
      <div className="pointer-events-none absolute top-0 left-0 h-20 w-full bg-gradient-to-b from-background to-transparent z-20"></div>

      <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 size-16 bg-secondary p-2 rounded-full z-30 md:bottom-0 md:top-auto">
        <Image
          src="/logo.png"
          alt="Lychee"
          width={40}
          height={40}
          className="block size-10 rounded-full object-contain grayscale"
        />
      </div>

      <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
        <div className="relative flex h-full w-full items-center justify-center translate-y-0 md:translate-y-32">
          <OrbitingCircles index={0} iconSize={60} radius={100} reverse speed={1}>
            <OrbIcon>
              <Ship className="size-6 text-primary" />
            </OrbIcon>
            <OrbIcon>
              <Cloud className="size-6 text-primary" />
            </OrbIcon>
            <OrbIcon>
              <Figma className="size-6 text-primary" />
            </OrbIcon>
          </OrbitingCircles>

          <OrbitingCircles index={1} iconSize={60} speed={0.5}>
            <OrbIcon>
              <Globe className="size-6 text-primary" />
            </OrbIcon>
            <OrbIcon>
              <Sparkles className="size-6 text-primary" />
            </OrbIcon>
            <OrbIcon>
              <Gem className="size-6 text-primary" />
            </OrbIcon>
          </OrbitingCircles>

          <OrbitingCircles index={2} iconSize={60} radius={230} reverse speed={0.5}>
            <OrbIcon>
              <Rocket className="size-6 text-primary" />
            </OrbIcon>
            <OrbIcon>
              <Layers className="size-6 text-primary" />
            </OrbIcon>
            <OrbIcon>
              <Bot className="size-6 text-primary" />
            </OrbIcon>
          </OrbitingCircles>
        </div>
      </div>
    </div>
  );
}

