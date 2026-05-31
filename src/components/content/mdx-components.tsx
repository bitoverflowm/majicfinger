import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import Image from "next/image";
import { TypographyInlineCode, VideoEmbed, YouTube } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ContentImage } from "./content-image";
import { KalshiHistoricalDataQuery } from "./KalshiHistoricalDataQuery";
import { PublicChart } from "./PublicChart";

function MdxCode({ children, className, ...props }: ComponentProps<"code">) {
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
    code: MdxCode,
    TypographyInlineCode,
    table: ({ children, ...props }: any) => {
      // MDX may pass legacy `ref` (string refs) which are invalid for <table> in React 19 types.
      const { ref: _ref, ...rest } = props || {};
      return (
        <div className="my-6 overflow-x-auto rounded-lg border border-border">
          <table {...rest} className="w-full border-collapse text-left text-sm">
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
