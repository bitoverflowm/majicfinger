import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Template-style highlight span for testimonial copy. */
export const TestimonialHighlight = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "p-1 py-0.5 font-medium dark:font-semibold text-secondary",
      className,
    )}
  >
    {children}
  </span>
);

export { TestimonialHighlight as Highlight };

const H = TestimonialHighlight;

export type SocialProofTestimonial = {
  id: string;
  name: string;
  role: string;
  img: string;
  src: string;
  description: ReactNode;
};

/** Same reviews as `landingPageV2/Testimonials.jsx` (Product Hunt / TAAFT / etc.). */
export const socialProofTestimonials: SocialProofTestimonial[] = [
  {
    id: "1",
    name: "Bernard",
    role: "There's An AI For That",
    img: "https://media.theresanaiforthat.com/u/bearnard.png?width=52",
    src: "https://theresanaiforthat.com/ai/lychee?comment_id=10781",
    description: (
      <p>
        It&apos;s like{" "}
        <H>the chart editor i wish i had for the last 10 years</H> . Love it...
      </p>
    ),
  },
  {
    id: "2",
    name: "Amal Khan",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/6832524/original.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=40&h=40&fit=crop&dpr=1",
    src: "https://www.producthunt.com/products/lychee-3/reviews?review=744208",
    description: (
      <p>
        I really can&apos;t express in words how much I needed this.
        <H>
          Changed my whole working game. My peers looked at this thing jaws
          dropped haha.
        </H>
        Looking forward to the future of Lychee!
      </p>
    ),
  },
  {
    id: "3",
    name: "Charles Teh",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/6514580/7e558077-c3ef-4d78-8f48-c3e02e01ffe5.webp?auto=compress&codec=mozjpeg&cs=strip&fm=webp&w=36&h=36&fit=max&frame=1&dpr=2",
    src: "https://www.producthunt.com/products/lychee-3?comment=3321659#lychee-3",
    description: (
      <p>
        Data scientists, marketers & managers would love this {":)"}
        <H>Instant hands-free graph generation!</H>
        Congrats on the launch!
      </p>
    ),
  },
  {
    id: "4",
    name: "Mar",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/6852998/e7fbb0c4-97a3-4ad5-9919-cd7b20e164d4.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/products/lychee-3?comment=3320264#lychee-3",
    description: (
      <p>
        OMG finally a reasonable tool
        <H>to get my charting done fast!</H> Do you think you will add more
        capabilities like Numpy Pandas library integrations @misterrpink
      </p>
    ),
  },
  {
    id: "5",
    name: "Henry Habib",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/6203476/947f99ac-c697-4e66-8200-7b3cf40a3979.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/products/lychee-3?comment=3320062#lychee-3",
    description: (
      <p>
        Nice!
        <H>Visualizing data made simple.</H> Great help for anyone in the data
        landscape. Good luck!
      </p>
    ),
  },
  {
    id: "6",
    name: "Yu",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/6835962/224dc544-7618-43f7-8a0d-bfacd75315f7.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/products/lychee-3?comment=3320062#lychee-3",
    description: (
      <p>
        love this project.
        <H>I&apos;ll actually use this every day</H>
        god I hate excel also why am I downloading a new software every few
        months? Microsoft is unhinged at this point
      </p>
    ),
  },
  {
    id: "7",
    name: "Nikita",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/4884364/90068181-d49d-4f6e-9d4e-69c4043fa07b.jpeg?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/posts/katsu?comment=3446689",
    description: (
      <p>
        The design of this thing is
        <H>out of this world.</H>I can imagine this totally blowing up on places
        like Instagram and X.
      </p>
    ),
  },
  {
    id: "8",
    name: "Nico",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/4654354/d1f41fbe-051a-4dfd-a9f5-700040e61c59.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/posts/katsu?comment=3446565",
    description: (
      <p>
        Congrats on the launch!
        <H>Looks sick for product updates!</H>
      </p>
    ),
  },
  {
    id: "9",
    name: "Jean-Pierre",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/6441220/82124fa0-ef46-4289-8a39-5bacbea90f44.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/posts/katsu?comment=3448801",
    description: (
      <p>
        Very nice project @misterrpink 👍
        <H>love the concept.</H>
        Btw, love the launch video👌
      </p>
    ),
  },
];
