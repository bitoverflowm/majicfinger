import { cn } from "@/lib/utils";
import Marquee from "@/components/magicui/marquee";
import { StarFilledIcon } from "@radix-ui/react-icons";
import Link from "next/link";

export const Highlight = ({
  children,
  className,
}) => {
  return (
    <span
      className={cn(
        "bg-cyan-600/20 p-1 py-0.5 font-bold text-cyan-600 dark:bg-cyan-600/20 dark:text-cyan-600",
        className,
      )}
    >
      {children}
    </span>
  );
};

export const TestimonialCard = ({
  description,
  name,
  img,
  role,
  src,
  className,
  ...props // Capture the rest of the props
}) => (
  <Link
    href={src}
    className={cn(
      "mb-4 flex w-full cursor-pointer break-inside-avoid flex-col items-center justify-between gap-6 rounded-xl p-4",
      // light styles
      " border border-neutral-200 bg-white",
      // dark styles
      "dark:bg-black dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
      className,
    )}
    {...props} // Spread the rest of the props here
  >
    <div className="select-none text-sm font-normal text-neutral-700 dark:text-neutral-400">
      {description}
      <div className="flex flex-row py-1 place-items-center place-content-center">
        <StarFilledIcon className="size-4 text-yellow-500" />
        <StarFilledIcon className="size-4 text-yellow-500" />
        <StarFilledIcon className="size-4 text-yellow-500" />
        <StarFilledIcon className="size-4 text-yellow-500" />
        <StarFilledIcon className="size-4 text-yellow-500" />
      </div>
    </div>

    <div className="flex w-full select-none items-center justify-center gap-5">
      <img
        src={img}
        className="h-10 w-10 rounded-full  ring-1 ring-border ring-offset-4"
      />

      <div>
        <p className="font-medium text-neutral-500">{name}</p>
        <p className="text-xs font-normal text-neutral-400">{role}</p>
      </div>
    </div>
  </Link>
);

const testimonials = [
  {
    name: "Bernard",
    role: "There's An AI For That",
    img: "https://randomuser.me/api/portraits/men/91.jpg",
    src: "https://theresanaiforthat.com/ai/lychee?comment_id=10781",
    description: (
      <p>
        It's like <Highlight> the chart editor i wish i had for the last 10 years</Highlight>{" "} . Love it...
      </p>
    ),
  },
  {
    name: "Amal Khan",
    role: "Product Hunt",
    img: "https://randomuser.me/api/portraits/women/12.jpg",
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
    img: "https://randomuser.me/api/portraits/men/45.jpg",
    src: "https://www.producthunt.com/products/lychee-3?comment=3321659#lychee-3",
    description: (
      <p>
        Data scientists, marketers & managers would love this {':)'}
        <Highlight>Instant hands-free graph generation!</Highlight>
        Congrats on the launch!
      </p>
    ),
  },
  {
    name: "Mar",
    role: "Product Hunt",
    img: "https://randomuser.me/api/portraits/women/83.jpg",
    src: "https://www.producthunt.com/products/lychee-3?comment=3320264#lychee-3",
    description: (
      <p>
        OMG finally a reasonable tool
        <Highlight>to get my charting done fast! </Highlight> Do you think you will add more capabilities like Numpy Pandas library integrations @misterrpink
      </p>
    ),
  },
  {
    name: "Henry Habib",
    role: "Product Hunt",
    img: "https://randomuser.me/api/portraits/men/1.jpg",
    src: "https://www.producthunt.com/products/lychee-3?comment=3320062#lychee-3",
    description: (
      <p>
        Nice! 
        <Highlight>
        Visualizing data made simple.
        </Highlight>{" "}
        Great help for anyone in the data landscape. Good luck!
      </p>
    ),
  },
  {
    name: "Yu",
    role: "Product Hunt",
    img: "https://randomuser.me/api/portraits/women/5.jpg",
    src: "https://www.producthunt.com/products/lychee-3?comment=3320062#lychee-3",
    description: (
      <p>
        love this project. 
        <Highlight> I'll actually use this every day </Highlight> 
        god I hate excel also why am I downloading a new software every few months?
        Microsoft is unhinged at this point {" "}
      </p>
    ),
  },
];

export function SocialProofTestimonials() {
  return (
    <section id="testimonials">
      <div className="py-14">
        <div className="container mx-auto px-4 md:px-8">
          <h3 className="text-center text-sm font-semibold text-gray-500">
            What Our Legendary Users Have to Say
          </h3>
          <div className="relative mt-6 max-h-[650px] overflow-hidden">
            <div className="gap-4 md:columns-2 xl:columns-2 2xl:columns-2 w-3/5 mx-auto">
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
                      <TestimonialCard {...card} key={idx} />
                    ))}
                  </Marquee>
                ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 w-full bg-gradient-to-t from-white from-20% dark:from-black"></div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 w-full bg-gradient-to-b from-white from-20% dark:from-black"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
