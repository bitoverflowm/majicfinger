import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ChartDashboard from "@/models/ChartDashboards";
import Chart from "@/models/Charts";
import User from "@/models/Users";
import WorkspacePublication from "@/models/WorkspacePublications";
import { getAllContent } from "@/lib/content";
import { isFeatureReleaseContent } from "@/lib/content/featureReleaseMatchers";
import type { ContentItem, ContentType } from "@/lib/content/types";
import { getAllHubs } from "@/config/hubs";
import { getSiteUrl } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300;

const SITE = getSiteUrl();

/** Paths that redirect or must never appear as canonical sitemap locs. */
const EXCLUDED_PATHS = new Set([
  "/tools",
  "/polymarket-live",
  "/polymarket-live/",
  "/login",
  "/logout",
  "/signup",
  "/dashboard",
  "/admin",
  "/account",
  "/settings",
  "/auth",
]);

function xmlEscape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type UrlEntry = { loc: string; lastmod?: string; changefreq?: string; priority?: string };

/**
 * Sitemap lastmod: prefer YYYY-MM-DD when only a date is known;
 * otherwise full W3C datetime (ISO-8601).
 */
function toSitemapLastmod(d: unknown): string | undefined {
  if (!d) return undefined;
  if (typeof d === "string") {
    const trimmed = d.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  const date = d instanceof Date ? d : new Date(String(d));
  if (Number.isNaN(date.getTime())) return undefined;
  const iso = date.toISOString();
  // Midnight UTC from a date-only source → keep date precision.
  if (iso.endsWith("T00:00:00.000Z")) return iso.slice(0, 10);
  return iso;
}

/** Absolute HTTPS loc with no query/hash and no trailing slash (except `/`). */
function canonicalLoc(path: string): string | null {
  const raw = path.trim();
  if (!raw.startsWith("/")) return null;
  if (raw.includes("?") || raw.includes("#")) return null;

  let normalized = raw.replace(/\/{2,}/g, "/");
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  if (EXCLUDED_PATHS.has(normalized) || EXCLUDED_PATHS.has(`${normalized}/`)) {
    return null;
  }

  return `${SITE}${normalized === "/" ? "/" : normalized}`;
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
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`
  );
}

function pushUrl(
  urls: UrlEntry[],
  path: string,
  opts?: { lastmod?: unknown; changefreq?: string; priority?: string },
) {
  const loc = canonicalLoc(path);
  if (!loc) return;
  const lastmod = toSitemapLastmod(opts?.lastmod);
  urls.push({
    loc,
    ...(lastmod ? { lastmod } : {}),
    ...(opts?.changefreq ? { changefreq: opts.changefreq } : {}),
    ...(opts?.priority ? { priority: opts.priority } : {}),
  });
}

function newestDate(dates: unknown[]): string | undefined {
  let newest: Date | undefined;
  for (const d of dates) {
    if (!d) continue;
    const date = d instanceof Date ? d : new Date(String(d));
    if (Number.isNaN(date.getTime())) continue;
    if (!newest || date > newest) newest = date;
  }
  return newest?.toISOString();
}

function safeGetAllContent(contentType: ContentType): ContentItem[] {
  try {
    return getAllContent(contentType);
  } catch {
    return [];
  }
}

const contentLastmod = (item: ContentItem) =>
  item.frontmatter.updatedAt || item.frontmatter.publishedAt;

export async function GET() {
  const urls: UrlEntry[] = [];

  // MDX content (guides/blog share /guides/[slug]).
  const contentSections: Array<{
    contentType: ContentType;
    prefix: string;
    priority: string;
    items: ContentItem[];
  }> = [
    { contentType: "guides", prefix: "/guides", priority: "0.8", items: [] },
    // Only MDX-backed integration docs (none today); catalog shells are placeholders.
    { contentType: "integrations", prefix: "/integrations", priority: "0.6", items: [] },
    { contentType: "concepts", prefix: "/concepts", priority: "0.6", items: [] },
    { contentType: "playbooks", prefix: "/playbooks", priority: "0.6", items: [] },
    // Blog posts are served by /guides/[slug] (guide route falls back to blog MDX).
    { contentType: "blog", prefix: "/guides", priority: "0.7", items: [] },
    { contentType: "university", prefix: "/university", priority: "0.8", items: [] },
  ];
  for (const section of contentSections) {
    section.items = safeGetAllContent(section.contentType);
  }

  const articleItems = contentSections
    .filter((s) => s.prefix === "/guides")
    .flatMap((s) => s.items);
  const universityItems = contentSections
    .filter((s) => s.prefix === "/university")
    .flatMap((s) => s.items);
  const allContentItems = contentSections.flatMap((s) => s.items);

  // Public dashboards and charts (DB-backed).
  const dashboardEntries: Array<{ path: string; lastmod: unknown }> = [];
  const chartEntries: Array<{ path: string; lastmod: unknown }> = [];
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

    const projects = (await WorkspacePublication.find({
      published: true,
      visibility: "public",
      password_on: { $ne: true },
    })
      .select("user_id slug published_at")
      .lean()) as any[];

    const userIds = new Set<string>();
    for (const d of dashboards) if (d?.user_id) userIds.add(String(d.user_id));
    for (const c of charts) if (c?.user_id) userIds.add(String(c.user_id));
    for (const p of projects) if (p?.user_id) userIds.add(String(p.user_id));

    const users = userIds.size
      ? ((await User.find({ _id: { $in: Array.from(userIds) } })
          .select("_id user_name")
          .lean()) as any[])
      : [];
    const usernameById = new Map(
      users.map((u) => [String(u._id), String(u.user_name || "")]),
    );

    for (const d of dashboards) {
      const username = usernameById.get(String(d.user_id)) || "";
      const slug = String(d.public_slug || "").trim();
      const h1 = String(d.page_heading || "").trim();
      const sub = String(d.page_subheading || "").trim();
      // Only include complete, SEO-ready public dashboards.
      if (!username || !slug || !h1 || !sub) continue;
      dashboardEntries.push({
        path: `/${encodeURIComponent(username)}/dashboards/${encodeURIComponent(slug)}`,
        lastmod: d.last_edited_date || d.published_at,
      });
    }

    for (const p of projects) {
      const username = usernameById.get(String(p.user_id)) || "";
      const slug = String(p.slug || "").trim();
      if (!username || !slug) continue;
      dashboardEntries.push({
        path: `/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
        lastmod: p.published_at,
      });
    }

    for (const c of charts) {
      const username = usernameById.get(String(c.user_id)) || "";
      const slug = String(c.public_slug || "").trim();
      if (!username || !slug) continue;
      chartEntries.push({
        path: `/${encodeURIComponent(username)}/charts/${encodeURIComponent(slug)}`,
        lastmod: c.last_saved_date,
      });
    }
  } catch {
    // If DB is unavailable, still return static + MDX + hub URLs.
  }

  const articlesLastmod = newestDate(articleItems.map(contentLastmod));
  const universityLastmod = newestDate(universityItems.map(contentLastmod));
  const changelogLastmod = newestDate(
    articleItems.filter(isFeatureReleaseContent).map(contentLastmod),
  );
  const chartsLastmod = newestDate(chartEntries.map((c) => c.lastmod));
  const dashboardsLastmod = newestDate(dashboardEntries.map((d) => d.lastmod));

  // Core marketing + legal pages (indexable, no auth). Listing pages take the
  // newest date of what they list; fixed dates must be bumped when that page's
  // content changes, since Google discounts lastmod values that drift.
  const staticPaths: Array<{
    path: string;
    priority?: string;
    changefreq?: string;
    lastmod?: string;
  }> = [
    { path: "/", priority: "1.0", changefreq: "weekly", lastmod: "2026-10-28" },
    { path: "/guides", priority: "0.9", changefreq: "weekly", lastmod: articlesLastmod },
    { path: "/university", priority: "0.9", changefreq: "weekly", lastmod: universityLastmod },
    { path: "/changelog", priority: "0.85", changefreq: "weekly", lastmod: changelogLastmod },
    { path: "/charts", priority: "0.7", changefreq: "weekly", lastmod: chartsLastmod },
    {
      path: "/dashboards-gallery",
      priority: "0.85",
      changefreq: "weekly",
      lastmod: dashboardsLastmod,
    },
    {
      path: "/search",
      priority: "0.5",
      changefreq: "weekly",
      lastmod: newestDate(allContentItems.map(contentLastmod)),
    },
    {
      path: "/polymarket-metadata",
      priority: "0.7",
      changefreq: "monthly",
      lastmod: "2026-09-17",
    },
    {
      path: "/kalshi-vs-polymarket-odds",
      priority: "0.9",
      changefreq: "weekly",
      lastmod: "2026-09-17",
    },
    { path: "/polymarket-holder-terminal", priority: "0.9", changefreq: "weekly", lastmod: "2026-11-10" },
    { path: "/polymarket-market-holders", priority: "0.85", changefreq: "weekly", lastmod: "2026-11-10" },
    { path: "/polymarket-wallet-tracker", priority: "0.85", changefreq: "weekly", lastmod: "2026-11-10" },
    // /data-sheet, /csv-exports, /quant-analysis, and catalog /integrations/*
    // use ProductLandingShell placeholders — excluded until substantive.
    { path: "/help", priority: "0.4", changefreq: "yearly", lastmod: "2026-07-04" },
    { path: "/affiliates", priority: "0.4", changefreq: "yearly", lastmod: "2026-06-21" },
    { path: "/try", priority: "0.5", changefreq: "monthly", lastmod: "2026-07-01" },
    { path: "/dataUse", priority: "0.2", changefreq: "yearly", lastmod: "2026-06-21" },
    { path: "/terms", priority: "0.2", changefreq: "yearly", lastmod: "2026-06-21" },
    { path: "/privacy", priority: "0.2", changefreq: "yearly", lastmod: "2026-06-21" },
  ];

  for (const p of staticPaths) {
    pushUrl(urls, p.path, {
      priority: p.priority,
      changefreq: p.changefreq,
      lastmod: p.lastmod,
    });
  }

  // Hub landings (canonical product pages).
  for (const hub of getAllHubs()) {
    pushUrl(urls, `/${hub.slug}`, {
      priority: "0.95",
      changefreq: "weekly",
      lastmod: hub.updatedAt || hub.publishedAt,
    });
  }

  for (const section of contentSections) {
    for (const item of section.items) {
      pushUrl(urls, `${section.prefix}/${item.slug}`, {
        lastmod: contentLastmod(item),
        priority: section.priority,
        changefreq: "monthly",
      });
    }
  }

  for (const d of dashboardEntries) {
    pushUrl(urls, d.path, { lastmod: d.lastmod, changefreq: "weekly", priority: "0.6" });
  }
  for (const c of chartEntries) {
    pushUrl(urls, c.path, { lastmod: c.lastmod, changefreq: "weekly", priority: "0.5" });
  }

  // De-dupe by loc (first wins — static/hubs before content/DB).
  const seen = new Set<string>();
  const deduped = urls.filter((u) => {
    if (seen.has(u.loc)) return false;
    seen.add(u.loc);
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
