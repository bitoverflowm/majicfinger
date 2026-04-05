import GitHubSlugger from "github-slugger";

export type TocItem = {
  depth: number;
  text: string;
  id: string;
};

/**
 * Extract ATX headings from MDX/Markdown body and slugify with github-slugger
 * (same algorithm as rehype-slug) so TOC hrefs match rendered heading ids.
 */
export function extractMdxHeadingsForToc(source: string): TocItem[] {
  const slugger = new GitHubSlugger();
  const lines = source.split("\n");
  const items: TocItem[] = [];
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = /^(#{1,6})\s+(.+)$/.exec(line.trimEnd());
    if (!m) continue;

    const depth = m[1].length;
    let text = m[2].trim();
    text = text.replace(/\s+#+\s*$/, "");
    const id = slugger.slug(text);
    items.push({ depth, text, id });
  }

  return items;
}
