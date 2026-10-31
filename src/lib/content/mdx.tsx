import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
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
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeSlug],
      },
    },
  });
}

export async function MDXContent({ source }: { source: string }) {
  return renderMDXBody(source);
}
