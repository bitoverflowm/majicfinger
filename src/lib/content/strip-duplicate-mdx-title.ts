function normalizeTitle(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordSimilarity(a: string, b: string): number {
  const wordsA = normalizeTitle(a)
    .split(" ")
    .filter((w) => w.length > 2);
  const wordsB = normalizeTitle(b)
    .split(" ")
    .filter((w) => w.length > 2);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const setB = new Set(wordsB);
  const intersection = wordsA.filter((w) => setB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

/**
 * True when an MDX `#` line repeats the page title (exact, prefix, or near-duplicate).
 */
export function isDuplicateTitleHeading(
  headingText: string,
  pageTitle: string,
): boolean {
  const heading = normalizeTitle(headingText);
  const title = normalizeTitle(pageTitle);
  if (!heading || !title) return false;

  if (heading === title) return true;

  const shorter = heading.length <= title.length ? heading : title;
  const longer = heading.length <= title.length ? title : heading;
  if (shorter.length >= 25 && longer.startsWith(shorter)) return true;

  const prefixLen = 36;
  if (
    heading.length >= 28 &&
    title.length >= 28 &&
    heading.slice(0, prefixLen) === title.slice(0, prefixLen)
  ) {
    return true;
  }

  if (heading.length >= 20 && title.length >= 20 && wordSimilarity(heading, title) >= 0.62) {
    return true;
  }

  return false;
}

/**
 * Remove the first ATX H1 from MDX body when it duplicates frontmatter `title`.
 * Layout `ArticleTitle` remains the single page H1 for SEO and outline.
 */
export function stripDuplicateMdxTitleHeading(
  source: string,
  pageTitle: string,
): string {
  const lines = source.split("\n");
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^```/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{1})\s+(.+)$/.exec(trimmed);
    if (!match || match[1].length !== 1) continue;

    let text = match[2].trim();
    text = text.replace(/\s+#+\s*$/, "");

    if (!isDuplicateTitleHeading(text, pageTitle)) return source;

    const next = [...lines];
    next.splice(i, 1);
    if (next[i]?.trim() === "") next.splice(i, 1);
    return next.join("\n");
  }

  return source;
}
