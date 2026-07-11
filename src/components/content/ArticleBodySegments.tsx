import { cn } from "@/lib/utils";
import { buildMdxArticleSegments } from "@/lib/content/split-mdx-page-breaks";
import { ARTICLE_SURFACE_CLASS } from "./article-prose";
import { ArticleProse } from "./article-prose";
import { ARTICLE_PAGE_BREAK_SHELL_CLASS } from "./article-page-break";

const ARTICLE_SURFACE_PADDING_CLASS = "p-5 sm:p-6 md:p-8 lg:p-10 xl:p-12";

const ARTICLE_SURFACE_SHADOW_CLASS =
  "md:shadow-[0px_1px_4px_1px_rgba(0,0,0,0.05),0px_1px_1px_0px_rgba(0,0,0,0.5),0px_-1px_1px_1px_#FFF_inset] dark:md:shadow-none";

function articleSurfaceSegmentClass({
  roundedTop,
  roundedBottom,
}: {
  roundedTop: boolean;
  roundedBottom: boolean;
}) {
  return cn(
    "relative w-full overflow-x-clip bg-white transition-all duration-150",
    "dark:bg-card dark:border dark:border-border",
    ARTICLE_SURFACE_PADDING_CLASS,
    ARTICLE_SURFACE_SHADOW_CLASS,
    roundedTop && "rounded-t-sm",
    roundedBottom && "rounded-b-sm",
    !roundedTop && "rounded-t-none",
    !roundedBottom && "rounded-b-none",
  );
}

type ArticleBodySegmentsProps = {
  mdxSource: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
};

/**
 * Renders MDX in white article surfaces, splitting at page-break demo components
 * so grey page background shows through between segments.
 */
export async function ArticleBodySegments({ mdxSource, header, footer }: ArticleBodySegmentsProps) {
  const segments = await buildMdxArticleSegments(mdxSource);
  const hasPageBreak = segments.some((segment) => segment.kind === "page-break");

  if (segments.length === 0) {
    return (
      <div className={ARTICLE_SURFACE_CLASS}>
        {header}
        {footer}
      </div>
    );
  }

  if (!hasPageBreak) {
    const proseNodes = segments.flatMap((segment) =>
      segment.kind === "prose" ? segment.nodes : [],
    );
    return (
      <div className={ARTICLE_SURFACE_CLASS}>
        {header}
        <ArticleProse>{proseNodes}</ArticleProse>
        {footer}
      </div>
    );
  }

  const proseIndices = segments
    .map((segment, index) => (segment.kind === "prose" ? index : -1))
    .filter((index) => index >= 0);
  const lastProseIndex = proseIndices[proseIndices.length - 1] ?? -1;
  const lastSegment = segments[segments.length - 1];
  const footerFollowsPageBreak = Boolean(footer) && lastSegment?.kind === "page-break";

  let proseOrdinal = 0;

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind === "page-break") {
          return (
            <div key={`page-break-${index}`} className={ARTICLE_PAGE_BREAK_SHELL_CLASS}>
              {segment.node}
            </div>
          );
        }

        const isFirstProse = proseOrdinal === 0;
        const isLastProse = index === lastProseIndex;
        const showFooter = isLastProse && !footerFollowsPageBreak;
        const prevIsPageBreak = index > 0 && segments[index - 1]?.kind === "page-break";
        const nextIsPageBreak =
          index < segments.length - 1 && segments[index + 1]?.kind === "page-break";

        proseOrdinal += 1;

        return (
          <div
            key={`prose-${index}`}
            id={prevIsPageBreak ? "article-after-demo" : undefined}
            className={cn(
              articleSurfaceSegmentClass({
                roundedTop: isFirstProse,
                roundedBottom: isLastProse && !footerFollowsPageBreak && !nextIsPageBreak,
              }),
              prevIsPageBreak && "scroll-mt-28",
            )}
          >
            {isFirstProse ? header : null}
            <ArticleProse className={prevIsPageBreak ? "pt-0" : undefined}>
              {segment.nodes}
            </ArticleProse>
            {showFooter ? footer : null}
          </div>
        );
      })}

      {footerFollowsPageBreak ? (
        <div
          className={articleSurfaceSegmentClass({
            roundedTop: false,
            roundedBottom: true,
          })}
        >
          {footer}
        </div>
      ) : null}
    </>
  );
}
