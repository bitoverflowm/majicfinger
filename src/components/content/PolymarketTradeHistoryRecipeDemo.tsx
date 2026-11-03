import { ArrowRight } from "lucide-react";

import { DemoRecipeLink } from "@/components/sections/features/demo-recipe-link";
import { ARTICLE_PAGE_BREAK_INNER_CLASS, markArticlePageBreakComponent } from "./article-page-break";
import { RecipeWalkthroughAnimation } from "./guide-animations/kalshi-trade-history-recipe-steps";

export type PolymarketTradeHistoryRecipeDemoProps = {
  title?: string;
  description?: string;
  id?: string;
};

/**
 * MDX: the Download Polymarket Trade History recipe start to finish on a real market, with a
 * link that opens the real recipe in the live demo.
 *
 * @example
 * ```mdx
 * <PolymarketTradeHistoryRecipeDemo />
 * ```
 */
export function PolymarketTradeHistoryRecipeDemo({
  title = "Try the Download Polymarket Trade History recipe",
  description = "Here is the recipe on a real market: the Georgia governor race, 2,304 trades from Polymarket Live and Historical. Open it in the live demo and try any market. Searching and loading trades are free; exporting needs a paid plan.",
  id = "polymarket-trade-history-recipe-demo",
}: PolymarketTradeHistoryRecipeDemoProps) {
  return (
    <section id={id} data-article-page-break className="guide-animation not-prose scroll-mt-28 font-sans antialiased">
      <div className={ARTICLE_PAGE_BREAK_INNER_CLASS}>
        <div className="mx-auto w-full max-w-3xl space-y-3 text-center">
          <p className="font-mono text-xs font-medium uppercase tracking-wider text-[#2f6fed]">Recipe demo</p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h2>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">{description}</p>
        </div>

        <div className="relative mx-auto mt-2 w-full max-w-5xl px-2 sm:px-4">
          <RecipeWalkthroughAnimation venue="polymarket" className="max-w-5xl" />
        </div>

        <div className="mt-2 flex flex-col items-center gap-2">
          <DemoRecipeLink
            recipeId="polymarketTradeHistory"
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

markArticlePageBreakComponent(PolymarketTradeHistoryRecipeDemo);
