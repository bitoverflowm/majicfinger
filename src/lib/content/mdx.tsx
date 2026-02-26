import { MDXRemote } from "next-mdx-remote/rsc";
import { useMDXComponents } from "@/components/content/mdx-components";

export async function MDXContent({ source }: { source: string }) {
  const components = useMDXComponents({});
  const content = await MDXRemote({
    source,
    components,
  });
  return <>{content}</>;
}
