"use client";

import Marquee from "@/components/magicui/marquee";
import Section from "./Section";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Image from "next/image";

const Highlight = ({ children, className }) => (
  <span
    className={cn(
      "bg-primary/20 p-1 py-0.5 font-bold text-primary dark:bg-primary/20 dark:text-primary",
      className
    )}
  >
    {children}
  </span>
);

const testimonials = [
  {
    name: "Alex Rivera",
    role: "CTO at InnovateTech",
    img: "https://randomuser.me/api/portraits/men/91.jpg",
    description: (
      <p>
        The chart tools from Easy Charts have revolutionized our data presentation.{" "}
        <Highlight>Insights are now more accurate and faster than ever.</Highlight> A game-changer.
      </p>
    ),
  },
  {
    name: "Samantha Lee",
    role: "Marketing Director",
    img: "https://randomuser.me/api/portraits/women/12.jpg",
    description: (
      <p>
        Implementing Easy Charts has drastically improved our reporting.{" "}
        <Highlight>Seeing a 50% increase in engagement!</Highlight> Highly recommend.
      </p>
    ),
  },
  {
    name: "Raj Patel",
    role: "Founder & CEO",
    img: "https://randomuser.me/api/portraits/men/45.jpg",
    description: (
      <p>
        As a startup, we need to move fast. Easy Charts helps us do just that.{" "}
        <Highlight>Our presentation speed has doubled.</Highlight> Essential tool.
      </p>
    ),
  },
];

const TestimonialCard = ({ description, name, img, role, className, ...props }) => (
  <div
    className={cn(
      "mb-4 flex w-full cursor-pointer break-inside-avoid flex-col items-center justify-between gap-6 rounded-xl p-4",
      "border border-border bg-card",
      "dark:bg-card dark:border-border",
      className
    )}
    {...props}
  >
    <div className="select-none text-sm font-normal text-muted-foreground">
      {description}
      <div className="flex flex-row py-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="size-4 text-yellow-500 fill-yellow-500" />
        ))}
      </div>
    </div>
    <div className="flex w-full select-none items-center justify-start gap-5">
      <Image
        width={40}
        height={40}
        src={img || ""}
        alt={name}
        className="h-10 w-10 rounded-full ring-1 ring-border ring-offset-4"
      />
      <div>
        <p className="font-medium text-muted-foreground">{name}</p>
        <p className="text-xs font-normal text-muted-foreground">{role}</p>
      </div>
    </div>
  </div>
);

export default function Testimonials() {
  return (
    <Section
      title="Testimonials"
      subtitle="What our customers are saying"
      className="max-w-8xl"
    >
      <div className="relative mt-6 max-h-[600px] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {testimonials.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <TestimonialCard {...card} />
            </motion.div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 w-full bg-gradient-to-t from-background from-20%"></div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 w-full bg-gradient-to-b from-background from-20%"></div>
      </div>
    </Section>
  );
}
