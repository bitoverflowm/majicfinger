import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ChartDashboard from "@/models/ChartDashboards";
import Chart from "@/models/Charts";
import User from "@/models/Users";
import { getAllSlugs } from "@/lib/content";
import { getAllHubSlugs } from "@/config/hubs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

function xmlEscape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type UrlEntry = { loc: string; lastmod?: string; changefreq?: string; priority?: string };

function toIsoDate(d: unknown): string | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(String(d));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function buildSitemapXml(urls: UrlEntry[]) {
  const body = urls
    .map((u) => {
      const parts = [
        `<loc>${xmlEscape(u.loc)}</loc>`,
        u.lastmod ? `<lastmod>${xmlEscape(u.lastmod)}</lastmod>` : "",
        u.changefreq ? `<changefreq>${xmlEscape(u.changefreq)}</changefreq>` : "",
        u.priority ? `<priority>${xmlEscape(u.priority)}</priority>` : "",
      ].filter(Boolean);
      return `<url>${parts.join("")}</url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export async function GET() {
  const urls: UrlEntry[] = [];

  // Core static pages (high priority, stable).
  const staticPaths: Array<{ path: string; priority?: string; changefreq?: string }> = [
    { path: "/", priority: "1.0", changefreq: "weekly" },
    { path: "/guides", priority: "0.9", changefreq: "weekly" },
    { path: "/charts", priority: "0.7", changefreq: "weekly" },
    { path: "/dashboards-gallery", priority: "0.85", changefreq: "weekly" },
    { path: "/search", priority: "0.6", changefreq: "weekly" },
    { path: "/polymarket-metadata", priority: "0.7", changefreq: "monthly" },
    ...getAllHubSlugs().map((slug) => ({
      path: `/${slug}`,
      priority: "0.85",
      changefreq: "weekly" as const,
    })),
    { path: "/terms", priority: "0.2", changefreq: "yearly" },
    { path: "/privacy", priority: "0.2", changefreq: "yearly" },
  ];
  for (const p of staticPaths) {
    urls.push({
      loc: `${SITE}${p.path}`,
      priority: p.priority,
      changefreq: p.changefreq,
    });
  }

  // Content-driven pages (auto-updates when new MDX is added).
  const addContentType = (contentType: Parameters<typeof getAllSlugs>[0], prefix: string, opts?: { priority?: string; changefreq?: string }) => {
    try {
      const slugs = getAllSlugs(contentType);
      for (const slug of slugs) {
        urls.push({
          loc: `${SITE}${prefix}/${encodeURIComponent(slug)}`,
          priority: opts?.priority,
          changefreq: opts?.changefreq,
        });
      }
    } catch {
      // ignore
    }
  };
  addContentType("guides", "/guides", { priority: "0.8", changefreq: "monthly" });
  addContentType("integrations", "/integrations", { priority: "0.6", changefreq: "monthly" });
  addContentType("concepts", "/concepts", { priority: "0.6", changefreq: "monthly" });
  addContentType("playbooks", "/playbooks", { priority: "0.6", changefreq: "monthly" });
  // Blog posts are served by the /guides/[slug] route (it falls back to blog
  // content when no guide slug matches), so we list them under /guides.
  addContentType("blog", "/guides", { priority: "0.7", changefreq: "monthly" });

  // Public dashboards and charts (DB-backed; auto-updates as users publish).
  try {
    await dbConnect();

    const dashboards = (await ChartDashboard.find({
      is_public: true,
      public_slug: { $type: "string", $gt: "" },
    })
      .select("user_id public_slug page_heading page_subheading published_at last_edited_date")
      .lean()) as any[];

    const charts = (await Chart.find({
      is_public: true,
      public_slug: { $type: "string", $gt: "" },
    })
      .select("user_id public_slug chart_name last_saved_date")
      .lean()) as any[];

    const userIds = new Set<string>();
    for (const d of dashboards) if (d?.user_id) userIds.add(String(d.user_id));
    for (const c of charts) if (c?.user_id) userIds.add(String(c.user_id));

    const users = userIds.size
      ? ((await User.find({ _id: { $in: Array.from(userIds) } }).select("_id user_name").lean()) as any[])
      : [];
    const usernameById = new Map(users.map((u) => [String(u._id), String(u.user_name || "")]));

    for (const d of dashboards) {
      const username = usernameById.get(String(d.user_id)) || "";
      const slug = String(d.public_slug || "").trim();
      const h1 = String(d.page_heading || "").trim();
      const sub = String(d.page_subheading || "").trim();
      // Only include "complete enough" dashboards for SEO.
      if (!username || !slug || !h1 || !sub) continue;
      const lastmod = toIsoDate(d.published_at || d.last_edited_date);
      urls.push({
        loc: `${SITE}/${encodeURIComponent(username)}/dashboards/${encodeURIComponent(slug)}`,
        lastmod: lastmod || undefined,
        changefreq: "weekly",
        priority: "0.6",
      });
    }

    for (const c of charts) {
      const username = usernameById.get(String(c.user_id)) || "";
      const slug = String(c.public_slug || "").trim();
      if (!username || !slug) continue;
      const lastmod = toIsoDate(c.last_saved_date);
      urls.push({
        loc: `${SITE}/${encodeURIComponent(username)}/charts/${encodeURIComponent(slug)}`,
        lastmod: lastmod || undefined,
        changefreq: "weekly",
        priority: "0.5",
      });
    }
  } catch {
    // If DB is unavailable at build/runtime, still return static + MDX content URLs.
  }

  // De-dupe locs.
  const seen = new Set<string>();
  const deduped = urls.filter((u) => {
    const key = u.loc;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const xml = buildSitemapXml(deduped);
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}

