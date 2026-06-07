import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getPublishedDashboardsForSearch } from "@/lib/landing/allPublishedDashboards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300;

type SearchIndexItem = {
  slug: string;
  contentType: string;
  title: string;
  description: string;
  excerpt?: string;
  integration: string[];
  topics: string[];
  tags: string[];
  username?: string;
};

function loadStaticSearchIndex(): SearchIndexItem[] {
  try {
    const filePath = path.join(process.cwd(), "public", "search-index.json");
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const staticIndex = loadStaticSearchIndex();
  let dashboardIndex: SearchIndexItem[] = [];
  try {
    dashboardIndex = await getPublishedDashboardsForSearch();
  } catch {
    dashboardIndex = [];
  }

  const merged = [...staticIndex, ...dashboardIndex];
  const seen = new Set<string>();
  const deduped = merged.filter((item) => {
    const key = `${item.contentType}:${item.slug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json(deduped, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
