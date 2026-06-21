import { canonicalUrl } from "@/lib/site";

export const metadata = {
  title: "Search | Lychee",
  description:
    "Search guides, blog posts, integrations, concepts, playbooks, and published dashboards on Lychee.",
  alternates: {
    canonical: canonicalUrl("/search"),
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
