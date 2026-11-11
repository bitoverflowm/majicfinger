import Image from "next/image";
import Link from "next/link";
import { BellRing, Fingerprint, Layers, Newspaper, Trophy, Wallet, type LucideIcon } from "lucide-react";

import { HOLDER_PATHS, holderTerminalHref } from "@/lib/holderLanding/pages";
import holderBackdrop from "../../../../public/landing/holder-hero-backdrop.jpg";

type Action = { icon: LucideIcon; title: string; body: string; signal: string; href: string };

const ACTIONS: Action[] = [
  {
    icon: Trophy,
    title: "Check if smart money agrees",
    body: "Score every large holder by Lychee Skill Score and see whether YES or NO is carried by proven traders.",
    signal: "Holder scores · YES vs NO",
    href: HOLDER_PATHS.market,
  },
  {
    icon: Fingerprint,
    title: "Catch fresh wallets loading up",
    body: "Flag brand-new wallets, first-ever trades, and wallets quietly holding both sides of the market.",
    signal: "New wallet · First trade here",
    href: HOLDER_PATHS.market,
  },
  {
    icon: Layers,
    title: "See who's underwater",
    body: "Find the prices where current holders bought in, and which side is sitting on gains or losses.",
    signal: "Entry prices · Profit & loss",
    href: HOLDER_PATHS.market,
  },
  {
    icon: Newspaper,
    title: "Find the story behind a move",
    body: "Headlines sit on the price chart, so a jump in the odds lines up with the news that drove it.",
    signal: "Price & news",
    href: HOLDER_PATHS.flagship,
  },
  {
    icon: Wallet,
    title: "Size up any trader",
    body: "Open a wallet to see its profit over time, which markets made the money, and every open bet.",
    signal: "Skill Score · Realized P&L",
    href: HOLDER_PATHS.wallet,
  },
  {
    icon: BellRing,
    title: "Get alerted when they trade",
    body: "Keep a wallet open and its new trades slide in with an alert, checked every 10 seconds.",
    signal: "Live · New trade",
    href: HOLDER_PATHS.wallet,
  },
];

const PRIMARY_BUTTON =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-white/[0.12] bg-secondary px-5 text-sm font-medium text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-95 dark:text-secondary-foreground";

export function HolderTerminalShowcase() {
  return (
    <article
      id="holder-terminal"
      className="grid scroll-mt-28 overflow-hidden rounded-xl bg-muted ring-1 ring-secondary/20 lg:grid-cols-3"
    >
      <div className="flex flex-col justify-center gap-5 p-6 sm:p-8 lg:px-10">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <span className="rounded-full bg-gradient-to-r from-secondary to-[#7c5cff] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-white">
            New
          </span>
          Polymarket Holder Terminal
        </span>
        <div className="max-w-md text-xl leading-snug tracking-tight sm:text-[1.3rem]">
          <h3 className="font-normal text-primary">See who&apos;s really moving every Polymarket market.</h3>
          <p className="text-muted-foreground">
            The price only tells you what the market thinks. The Holder Terminal shows you who&apos;s behind it: the
            wallets on each side, what they paid, how good they are, and what they&apos;re trading right now.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href={holderTerminalHref()} className={PRIMARY_BUTTON}>
            Open the terminal →
          </Link>
          <Link
            href={HOLDER_PATHS.flagship}
            className="text-sm text-secondary transition-colors hover:text-primary"
          >
            See how it works →
          </Link>
        </div>
      </div>

      <div className="p-2 sm:p-3 lg:col-span-2">
        <div className="relative overflow-hidden rounded-lg">
          <Image
            src={holderBackdrop}
            alt=""
            fill
            placeholder="blur"
            sizes="(min-width: 1344px) 860px, (min-width: 1024px) 64vw, 100vw"
            className="pointer-events-none select-none object-cover"
          />
          <ol className="relative grid gap-3 p-3 sm:grid-cols-2 sm:p-8 lg:p-10 xl:grid-cols-3">
            {ACTIONS.map(({ icon: Icon, title, body, signal, href }, index) => (
              <li key={title}>
                <Link
                  href={href}
                  className="group flex h-full flex-col gap-2 rounded-xl border border-white/70 bg-white/95 p-4 dark:border-white/10 dark:bg-neutral-900/95 shadow-[0_10px_30px_-14px_rgba(16,24,40,0.35)] backdrop-blur-sm transition-transform duration-200 ease-out hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="text-[15px] font-medium leading-snug text-primary">{title}</p>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">{body}</p>
                  <span className="mt-auto w-fit rounded-md bg-muted px-2 py-1 font-mono text-[10.5px] text-muted-foreground transition-colors group-hover:text-secondary">
                    {signal}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </article>
  );
}
