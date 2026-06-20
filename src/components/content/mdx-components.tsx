import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import { TypographyInlineCode, VideoEmbed, YouTube } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ContentImage } from "./content-image";
import { LYCHEE_CONTENT_TYPE } from "./article-prose";
import { KalshiHistoricalDataQuery } from "./KalshiHistoricalDataQuery";
import { PublicChart } from "./PublicChart";

// MDX may pass legacy `ref` (string refs); use loose props to avoid @types/react version skew (e.g. @hello-pangea/dnd).
function MdxCode({ children, className, ...props }: any) {
  // Fenced blocks get a `language-*` class from the MDX compiler; inline backticks do not.
  if (className) {
    return (
      <code className={cn("font-mono text-sm", className)} {...props}>
        {children}
      </code>
    );
  }
  return <TypographyInlineCode {...props}>{children}</TypographyInlineCode>;
}

function MdxHeading({
  as: Tag,
  className,
  children,
  ...props
}: {
  as: "h1" | "h2" | "h3" | "h4";
  className: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <Tag className={className} {...props}>
      {children}
    </Tag>
  );
}

/**
 * MDX `#` lines render as h2+ so layout `ArticleTitle` is the only page H1.
 */
function MdxH1({ children, id, ...props }: any) {
  return (
    <MdxHeading as="h2" id={id} className={LYCHEE_CONTENT_TYPE.sectionH2} {...props}>
      {children}
    </MdxHeading>
  );
}

/**
 * MDX components for blog/guide content.
 * - img: Standard markdown images get styled and optimized via Next.js Image
 * - ContentImage: For images with captions and explicit control
 * - VideoEmbed: iframe embed with full embed URL (any provider)
 * - YouTube: `<YouTube videoId="..." />` — id or watch/youtu.be URL
 * - Inline code: backticks or `<TypographyInlineCode>` (shadcn-style muted pill)
 * - PublicChart: `<PublicChart username="..." slug="..." />`
 * - KalshiHistoricalDataQuery: `<KalshiHistoricalDataQuery />` — Kalshi markets/trades query builder
 * - GIFs: Use standard markdown ![alt](/path/to.gif) or ContentImage
 */
export function useMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    h1: MdxH1,
    code: MdxCode,
    TypographyInlineCode,
    table: ({ children, ...props }: any) => {
      // MDX may pass legacy `ref` (string refs) which are invalid for <table> in React 19 types.
      const { ref: _ref, ...rest } = props || {};
      return (
        <div className="my-6 overflow-x-auto rounded-lg border border-border">
          <table
            {...rest}
            className="w-full border-collapse text-sm [&_td]:px-4 [&_td]:py-2.5 [&_td]:!text-center [&_th]:px-4 [&_th]:py-2.5 [&_th]:!text-center [&_th]:font-medium"
          >
            {children}
          </table>
        </div>
      );
    },
    img: ({ src, alt }) => {
      if (!src) return null;
      const isExternal = src.startsWith("http");
      return (
        <span className="block my-6 rounded-xl overflow-hidden border border-border bg-muted/30">
          <Image
            src={src}
            alt={alt || ""}
            width={1200}
            height={800}
            className="w-full h-auto object-contain"
            unoptimized={isExternal}
          />
        </span>
      );
    },
    ContentImage,
    VideoEmbed,
    YouTube,
    PublicChart,
    KalshiHistoricalDataQuery,
    ...components,
  };
}
