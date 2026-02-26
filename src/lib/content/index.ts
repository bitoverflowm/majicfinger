import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { BaseContent, ContentType, ContentItem } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content");
const CONTENT_TYPES: ContentType[] = ["guides", "integrations", "concepts", "playbooks"];

function normalizeFrontmatter(data: Record<string, unknown>): BaseContent {
  const d = data as Record<string, unknown>;
  return {
    ...d,
    publishedAt: (d.publishedAt as string) || (d.date as string) || "",
    integration: (d.integration as string[]) || [],
    topics: (d.topics as string[]) || (d.tags as string[]) || [],
    tags: (d.tags as string[]) || [],
  } as BaseContent;
}

function getContentDir(contentType: ContentType): string {
  return path.join(CONTENT_DIR, contentType);
}

export function getAllContent(contentType: ContentType): ContentItem[] {
  const dir = getContentDir(contentType);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir);
  const items: ContentItem[] = [];

  for (const file of files) {
    if (!file.endsWith(".mdx")) continue;

    const slug = file.replace(/\.mdx$/, "");
    const filePath = path.join(dir, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content, excerpt } = matter(fileContent, {
      excerpt: true,
      excerpt_separator: "\n\n",
    });

    const frontmatter = normalizeFrontmatter(data);
    items.push({
      slug,
      contentType,
      frontmatter,
      excerpt: excerpt?.trim(),
    });
  }

  return items;
}

export function getContentBySlug(
  contentType: ContentType,
  slug: string
): { frontmatter: BaseContent; content: string } | null {
  const filePath = path.join(getContentDir(contentType), `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContent);
  return { frontmatter: normalizeFrontmatter(data), content };
}

export function getAllSlugs(contentType: ContentType): string[] {
  const items = getAllContent(contentType);
  return items.map((item) => item.slug);
}

export function getAllContentForSearch(): ContentItem[] {
  const allItems: ContentItem[] = [];
  for (const contentType of CONTENT_TYPES) {
    const items = getAllContent(contentType);
    allItems.push(...items);
  }
  return allItems;
}
