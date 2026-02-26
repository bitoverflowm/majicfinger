import type { MDXComponents } from "mdx/types";
import { VideoEmbed } from "@/components/ui";

export function useMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    VideoEmbed,
    ...components,
  };
}
