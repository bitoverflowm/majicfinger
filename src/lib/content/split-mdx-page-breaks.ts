import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { renderMDXBody } from "@/lib/content/mdx";

/** MDX component tags that interrupt the white article surface. */
export const MDX_PAGE_BREAK_TAG_NAMES = ["KalshiHistoricalDataQuery"] as const;

export type MdxSourceSegment =
  | { kind: "prose"; source: string }
  | { kind: "page-break"; source: string };

export type MdxArticleSegment =
  | { kind: "prose"; nodes: ReactNode[] }
  | { kind: "page-break"; node: ReactNode };

function flattenRenderedNodes(content: ReactNode): ReactNode[] {
  const nodes: ReactNode[] = [];
  Children.forEach(content, (child) => {
    if (isValidElement(child) && child.type === Fragment) {
      nodes.push(...flattenRenderedNodes((child.props as { children?: ReactNode }).children));
      return;
    }
    nodes.push(child);
  });
  return nodes;
}

/** Split MDX source around self-closing page-break demo components. */
export function splitMdxSourceAtPageBreaks(source: string): MdxSourceSegment[] {
  const tagPattern = MDX_PAGE_BREAK_TAG_NAMES.join("|");
  const regex = new RegExp(`<(?:${tagPattern})[\\s\\S]*?\\/>`, "g");
  const segments: MdxSourceSegment[] = [];
  let lastIndex = 0;

  for (const match of source.matchAll(regex)) {
    const index = match.index ?? 0;
    const proseBefore = source.slice(lastIndex, index).trim();
    if (proseBefore) {
      segments.push({ kind: "prose", source: proseBefore });
    }
    segments.push({ kind: "page-break", source: match[0].trim() });
    lastIndex = index + match[0].length;
  }

  const proseAfter = source.slice(lastIndex).trim();
  if (proseAfter) {
    segments.push({ kind: "prose", source: proseAfter });
  }

  return segments;
}

export async function buildMdxArticleSegments(source: string): Promise<MdxArticleSegment[]> {
  const sourceSegments = splitMdxSourceAtPageBreaks(source);

  if (sourceSegments.length === 0) {
    const rendered = await renderMDXBody(source);
    const nodes = flattenRenderedNodes(rendered);
    return nodes.length ? [{ kind: "prose", nodes }] : [];
  }

  const hasPageBreak = sourceSegments.some((segment) => segment.kind === "page-break");
  if (!hasPageBreak) {
    const rendered = await renderMDXBody(source);
    const nodes = flattenRenderedNodes(rendered);
    return nodes.length ? [{ kind: "prose", nodes }] : [];
  }

  const articleSegments: MdxArticleSegment[] = [];

  for (const segment of sourceSegments) {
    const rendered = await renderMDXBody(segment.source);
    const nodes = flattenRenderedNodes(rendered);

    if (segment.kind === "page-break") {
      for (const node of nodes) {
        articleSegments.push({ kind: "page-break", node });
      }
      continue;
    }

    if (nodes.length > 0) {
      articleSegments.push({ kind: "prose", nodes });
    }
  }

  return articleSegments;
}
