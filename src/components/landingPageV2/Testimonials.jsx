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
      "mb-4 flex w-full cursor-pointer break-inside-avoid flex-col items-center justify-between gap-6 rounded-xl p-4",
      "border border-border bg-card hover:border-primary/30 transition-colors",
      "dark:bg-card dark:border-border",
      className
    )}
    rel="noopener noreferrer"
    target="_blank"
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
  </Link>
);

export default function Testimonials() {
  const firstRow = testimonials.slice(0, Math.ceil(testimonials.length / 2));
  const secondRow = testimonials.slice(Math.ceil(testimonials.length / 2));

  return (
    <Section
      title="What our legendary users have to say"
      subtitle="Don't just take our word for it. See what our awesome users are saying:"
      className="max-w-8xl"
    >
      <p className="text-sm text-muted-foreground pb-4 text-center">All testimonials are clickable.</p>
      <div className="relative mt-6 max-h-[650px] overflow-hidden">
        <Marquee pauseOnHover className="[--duration:20s]">
          {firstRow.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mx-2"
            >
              <TestimonialCard {...card} />
            </motion.div>
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover className="[--duration:20s]">
          {secondRow.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mx-2"
            >
              <TestimonialCard {...card} />
            </motion.div>
          ))}
        </Marquee>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 w-full bg-gradient-to-t from-background from-20%"></div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 w-full bg-gradient-to-b from-background from-20%"></div>
      </div>
    </Section>
  );
}
