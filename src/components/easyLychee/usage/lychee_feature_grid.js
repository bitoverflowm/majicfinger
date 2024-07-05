"use client";

  
import { KatsuCard, KatsuGrid } from "@/components/easyLychee/katsu-grid";
import { Boxes, BrainCircuit, BrainCog, BrickWall, Carrot, Cherry, Clapperboard, Gem, HandMetal, IceCreamCone, TreePalm } from "lucide-react";
  
  const features = [
    {
      Icon: <Carrot className="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />,
      name: "Scraper",
      description: "Scrape ANY URL.",
      href: "#getIt",
      cta: "I want it.",
      background: <img className="absolute -right-20 -top-20 opacity-60" />,
      className: "col-span-1",
    },
    {
      Icon: <BrickWall className="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />,
      name: "PDFs Parsing",
      description: "Extract Structured Data from PDF.",
      href: "#getIt",
      cta: "I want it.",
      background: <img className="absolute -right-20 -top-20 opacity-60" />,
      className: "col-span-1",
    },
    {
      Icon: <Boxes className="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />,
      name: "Data Generation",
      description: "Generate INSANE amounts of fake (realistic) Data for analysis and testing.",
      href: "#getIt",
      cta: "I want it.",
      background: <img className="absolute -right-20 -top-20 opacity-60" />,
      className: "col-span-1",
    },
    {
      Icon: <BrainCircuit className="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />,
      name: "Powerful Spreadsheet",
      description: "A Powerful Spreadsheet.",
      href: "#getIt",
      cta: "I want it.",
      background: <img className="absolute -right-20 -top-20 opacity-60" />,
      className: "col-span-1",
    },
    {
      Icon: <BrainCog className="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />,
      name: "Rich Text Editor",
      description: "A Rich Text Editor.",
      href: "#getIt",
      cta: "I want it.",
      background: <img className="absolute -right-20 -top-20 opacity-60" />,
      className: "col-span-1",
    },
    {
      Icon: <Cherry className="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />,
      name: "Presentations",
      description: "Generate Stunning presentations.",
      href: "#getIt",
      cta: "I want it.",
      background: <img className="absolute -right-20 -top-20 opacity-60" />,
      className: "col-span-1",
    },
    {
      Icon: <Clapperboard className="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />,
      name: "Website Deployment",
      description: "Deploy an entire website right here.",
      href: "#getIt",
      cta: "I want it.",
      background: <img className="absolute -right-20 -top-20 opacity-60" />,
      className: "col-span-1",
    },
    {
      Icon: <Gem className="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />,
      name: "Publishing",
      description: "Publish Your Findings.",
      href: "#getIt",
      cta: "I want it.",
      background: <img className="absolute -right-20 -top-20 opacity-60" />,
      className: "col-span-1",
    },
    {
      Icon: <IceCreamCone className="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />,
      name: "Social Media Sharing",
      description: "Share Your Discoveries on Social Media.",
      href: "#getIt",
      cta: "I want it.",
      background: <img className="absolute -right-20 -top-20 opacity-60" />,
      className: "col-span-1",
    },
    {
      Icon: <HandMetal className="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />,
      name: "Team Collaboration",
      description: "Invite Your Team.",
      href: "#getIt",
      cta: "I want it.",
      background: <img className="absolute -right-20 -top-20 opacity-60" />,
      className: "col-span-1",
    },
    {
      Icon: <TreePalm className="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />,
      name: "Audience Building",
      description: "Build an Audience Right Here.",
      href: "#getIt",
      cta: "I want it.",
      background: <img className="absolute -right-20 -top-20 opacity-60" />,
      className: "col-span-1",
    },
  ];
  
  
  const LycheeFeatureGrid = ()=> {
    return (
      <KatsuGrid className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:grid-rows-4">
        {features && features.map((feature) => (
          <KatsuCard key={feature.name} {...feature} />
        ))}
      </KatsuGrid>
    );
  }

  export default LycheeFeatureGrid
  