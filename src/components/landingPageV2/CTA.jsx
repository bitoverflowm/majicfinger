"use client";

import { Icons } from "./Icons";
import Section from "./Section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function CTA() {
  return (
    <Section
      id="cta"
      title="Ready to get started?"
      subtitle="Start your free trial today."
      className="bg-primary/10 rounded-xl py-16"
    >
      <div className="flex flex-col w-full sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
        <Link
          href="/landingpage_v2#pricing"
          className={cn(
            buttonVariants({ variant: "default" }),
            "w-full sm:w-auto text-primary-foreground flex gap-2"
          )}
        >
          Get started for free
        </Link>
      </div>
    </Section>
  );
}
