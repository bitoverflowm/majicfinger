"use client";

import Marquee from "@/components/magicui/marquee";
import Section from "./Section";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
    name: "Bernard",
    role: "There's An AI For That",
    img: "https://media.theresanaiforthat.com/u/bearnard.png?width=52",
    src: "https://theresanaiforthat.com/ai/lychee?comment_id=10781",
    description: (
      <p>
        It's like <Highlight>the chart editor i wish i had for the last 10 years</Highlight> . Love it...
      </p>
    ),
  },
  {
    name: "Amal Khan",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/6832524/original.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=40&h=40&fit=crop&dpr=1",
    src: "https://www.producthunt.com/products/lychee-3/reviews?review=744208",
    description: (
      <p>
        I really can't express in words how much I needed this.
        <Highlight>Changed my whole working game. My peers looked at this thing jaws dropped haha.</Highlight>
        Looking forward to the future of Lychee!
      </p>
    ),
  },
  {
    name: "Charles Teh",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/6514580/7e558077-c3ef-4d78-8f48-c3e02e01ffe5.webp?auto=compress&codec=mozjpeg&cs=strip&fm=webp&w=36&h=36&fit=max&frame=1&dpr=2",
    src: "https://www.producthunt.com/products/lychee-3?comment=3321659#lychee-3",
    description: (
      <p>
        Data scientists, marketers & managers would love this {":)"}
        <Highlight>Instant hands-free graph generation!</Highlight>
        Congrats on the launch!
      </p>
    ),
  },
  {
    name: "Mar",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/6852998/e7fbb0c4-97a3-4ad5-9919-cd7b20e164d4.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/products/lychee-3?comment=3320264#lychee-3",
    description: (
      <p>
        OMG finally a reasonable tool
        <Highlight>to get my charting done fast!</Highlight> Do you think you will add more capabilities like Numpy Pandas library integrations @misterrpink
      </p>
    ),
  },
  {
    name: "Henry Habib",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/6203476/947f99ac-c697-4e66-8200-7b3cf40a3979.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/products/lychee-3?comment=3320062#lychee-3",
    description: (
      <p>
        Nice!
        <Highlight>Visualizing data made simple.</Highlight> Great help for anyone in the data landscape. Good luck!
      </p>
    ),
  },
  {
    name: "Yu",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/6835962/224dc544-7618-43f7-8a0d-bfacd75315f7.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/products/lychee-3?comment=3320062#lychee-3",
    description: (
      <p>
        love this project.
        <Highlight>I'll actually use this every day</Highlight>
        god I hate excel also why am I downloading a new software every few months?
        Microsoft is unhinged at this point
      </p>
    ),
  },
  {
    name: "Nikita",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/4884364/90068181-d49d-4f6e-9d4e-69c4043fa07b.jpeg?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/posts/katsu?comment=3446689",
    description: (
      <p>
        The design of this thing is
        <Highlight>out of this world.</Highlight>
        I can imagine this totally blowing up on places like Instagram and X.
      </p>
    ),
  },
  {
    name: "Nico",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/4654354/d1f41fbe-051a-4dfd-a9f5-700040e61c59.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/posts/katsu?comment=3446565",
    description: (
      <p>
        Congrats on the launch!
        <Highlight>Looks sick for product updates!</Highlight>
      </p>
    ),
  },
  {
    name: "Jean-Pierre",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/6441220/82124fa0-ef46-4289-8a39-5bacbea90f44.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/posts/katsu?comment=3448801",
    description: (
      <p>
        Very nice project @misterrpink 👍
        <Highlight>love the concept.</Highlight>
        Btw, love the launch video👌
      </p>
    ),
  },
];

const TestimonialCard = ({ description, name, img, role, src, className, ...props }) => (
  <Link
    href={src}
    className={cn(
      "mb-4 flex w-full max-w-[280px] cursor-pointer break-inside-avoid flex-col items-start justify-between gap-6 rounded-xl p-4 shrink-0",
      "border border-neutral-200 bg-white",
      "dark:bg-black dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
      className
    )}
    rel="noopener noreferrer"
    target="_blank"
    {...props}
  >
    <div className="select-none text-sm font-normal text-neutral-700 dark:text-neutral-400 text-left">
      {description}
      <div className="flex flex-row py-1">
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
      </div>
    </div>
    <div className="flex w-full select-none items-center justify-start gap-5">
      <Image
        width={40}
        height={40}
        src={img || ""}
        alt={name}
        className="h-10 w-10 rounded-full ring-1 ring-border ring-offset-4 shrink-0"
      />
      <div className="min-w-0">
        <p className="font-medium text-neutral-500 truncate">{name}</p>
        <p className="text-xs font-normal text-neutral-400 truncate">{role}</p>
      </div>
    </div>
  </Link>
);

export default function Testimonials() {
  return (
    <Section
      title="Testimonials"
      subtitle="What our legendary users have to say"
    >
      <div className="relative mt-6 max-h-screen overflow-hidden">
        <div className="gap-4 md:columns-2 xl:columns-3 2xl:columns-4">
          {Array(Math.ceil(testimonials.length / 3))
            .fill(0)
            .map((_, i) => (
              <Marquee
                vertical
                key={i}
                className={cn({
                  "[--duration:60s]": i === 1,
                  "[--duration:30s]": i === 2,
                  "[--duration:70s]": i === 3,
                })}
              >
                {testimonials.slice(i * 3, (i + 1) * 3).map((card, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: Math.random() * 0.8,
                      duration: 1.2,
                    }}
                    className="flex justify-center"
                  >
                    <TestimonialCard {...card} />
                  </motion.div>
                ))}
              </Marquee>
            ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 w-full bg-gradient-to-t from-background from-20%" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 w-full bg-gradient-to-b from-background from-20%" />
      </div>
    </Section>
  );
}
