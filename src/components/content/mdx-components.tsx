import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import { VideoEmbed } from "@/components/ui";
import { ContentImage } from "./content-image";

/**
 * MDX components for blog/guide content.
 * - img: Standard markdown images get styled and optimized via Next.js Image
 * - ContentImage: For images with captions and explicit control
 * - VideoEmbed: For embedded videos (YouTube, Vimeo, etc.)
 * - GIFs: Use standard markdown ![alt](/path/to.gif) or ContentImage
 */
export function useMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    table: ({ children, ...props }) => (
      <div className="my-6 overflow-x-auto rounded-lg border border-border">
        <table
          {...props}
          className="w-full border-collapse text-left text-sm"
        >
          {children}
        </table>
      </div>
    ),
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
    ...components,
  };
}
