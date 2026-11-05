import "katex/dist/katex.min.css";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { MDXRemote } from "next-mdx-remote/rsc";
import { useMDXComponents } from "@/components/content/mdx-components";

/** Resolved MDX tree — pass directly to GuideLayout for article body segmentation. */
export async function renderMDXBody(source: string) {
  const components = useMDXComponents({});
  return MDXRemote({
    source,
    components,
    options: {
      mdxOptions: {
        // Math needs `$$…$$` (inline or on its own lines) so prices like "$0.45" stay plain text.
        remarkPlugins: [remarkGfm, [remarkMath, { singleDollarTextMath: false }]],
        rehypePlugins: [rehypeSlug, [rehypeKatex, { strict: false }]],
      },
    },
  });
}

export async function MDXContent({ source }: { source: string }) {
  return renderMDXBody(source);
}
