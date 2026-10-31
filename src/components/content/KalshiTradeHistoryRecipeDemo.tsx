import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { DemoRecipeLink } from "@/components/sections/features/demo-recipe-link";
import { FEATURE_KEYFRAMES } from "@/components/sections/features/feature-keyframes";
import { TradeHistoryDemo } from "@/components/sections/features/trade-history-demo";
import exploreBackdrop from "../../../public/landing/feature-explore-lake.jpg";
import { ARTICLE_PAGE_BREAK_INNER_CLASS, markArticlePageBreakComponent } from "./article-page-break";

export type KalshiTradeHistoryRecipeDemoProps = {
  title?: string;
  description?: string;
  id?: string;
};

/**
 * MDX: the homepage "Download Kalshi Trade History" demo, with a link that opens the real
 * recipe in the live demo.
 *
 * @example
 * ```mdx
 * <KalshiTradeHistoryRecipeDemo />
 * ```
 */
export function KalshiTradeHistoryRecipeDemo({
  title = "Try the Download Kalshi Trade History recipe",
  description = "Click around the preview below, then open the real recipe in the live demo. Searching and loading trades are free; exporting needs a paid plan.",
  id = "kalshi-trade-history-recipe-demo",
}: KalshiTradeHistoryRecipeDemoProps) {
  return (
    <section id={id} data-article-page-break className="guide-animation not-prose scroll-mt-28 font-sans antialiased">
      <style dangerouslySetInnerHTML={{ __html: FEATURE_KEYFRAMES }} />
      <div className={ARTICLE_PAGE_BREAK_INNER_CLASS}>
        <div className="mx-auto w-full max-w-3xl space-y-3 text-center">
          <p className="font-mono text-xs font-medium uppercase tracking-wider text-[#2f6fed]">Recipe demo</p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h2>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">{description}</p>
        </div>

        <div className="relative mx-auto mt-8 w-full max-w-5xl px-2 sm:px-4">
          <div className="relative h-[26rem] overflow-hidden rounded-xl sm:h-[30rem] lg:h-[34rem]">
            <Image
              src={exploreBackdrop}
              alt=""
              fill
              placeholder="blur"
              sizes="(min-width: 1024px) 960px, 100vw"
              className="pointer-events-none select-none object-cover"
            />
            <div className="absolute inset-3 sm:inset-8 lg:inset-10">
              <TradeHistoryDemo />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <DemoRecipeLink
            recipeId="kalshiTradeHistory"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2f6fed] px-4 text-sm font-medium text-white transition-colors hover:bg-[#2a63d4]"
          >
            Open the recipe in the live demo
            <ArrowRight className="size-4" aria-hidden />
          </DemoRecipeLink>
          <p className="text-xs text-muted-foreground">No account needed to search a market and load its trades.</p>
        </div>
      </div>
    </section>
  );
}

markArticlePageBreakComponent(KalshiTradeHistoryRecipeDemo);
