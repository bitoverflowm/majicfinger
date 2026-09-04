import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ChartDashboard from "@/models/ChartDashboards";
import Chart from "@/models/Charts";
import User from "@/models/Users";
import { getAllContent } from "@/lib/content";
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

export async function GET() {
  const urls: UrlEntry[] = [];

  // Core marketing + legal pages (indexable, no auth).
  const staticPaths: Array<{
    path: string;
    priority?: string;
    changefreq?: string;
    lastmod?: string;
  }> = [
    { path: "/", priority: "1.0", changefreq: "weekly" },
    { path: "/guides", priority: "0.9", changefreq: "weekly" },
    { path: "/changelog", priority: "0.85", changefreq: "weekly" },
    { path: "/charts", priority: "0.7", changefreq: "weekly" },
    { path: "/dashboards-gallery", priority: "0.85", changefreq: "weekly" },
    { path: "/search", priority: "0.5", changefreq: "weekly" },
    { path: "/polymarket-metadata", priority: "0.7", changefreq: "monthly" },
    // /data-sheet, /csv-exports, /quant-analysis, and catalog /integrations/*
    // use ProductLandingShell placeholders — excluded until substantive.
    { path: "/help", priority: "0.4", changefreq: "yearly" },
    { path: "/affiliates", priority: "0.4", changefreq: "yearly" },
    { path: "/try", priority: "0.5", changefreq: "monthly" },
    { path: "/dataUse", priority: "0.2", changefreq: "yearly" },
    { path: "/terms", priority: "0.2", changefreq: "yearly" },
    { path: "/privacy", priority: "0.2", changefreq: "yearly" },
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

  // MDX content (guides/blog share /guides/[slug]).
  const addContentType = (
    contentType: Parameters<typeof getAllContent>[0],
    prefix: string,
    opts?: { priority?: string; changefreq?: string },
  ) => {
    try {
      const items = getAllContent(contentType);
      for (const item of items) {
        pushUrl(urls, `${prefix}/${item.slug}`, {
          lastmod: item.frontmatter.updatedAt || item.frontmatter.publishedAt,
          priority: opts?.priority,
          changefreq: opts?.changefreq,
        });
      }
    } catch {
      // ignore missing content dirs
    }
  };
  addContentType("guides", "/guides", { priority: "0.8", changefreq: "monthly" });
  // Only MDX-backed integration docs (none today); catalog shells are placeholders.
  addContentType("integrations", "/integrations", { priority: "0.6", changefreq: "monthly" });
  addContentType("concepts", "/concepts", { priority: "0.6", changefreq: "monthly" });
  addContentType("playbooks", "/playbooks", { priority: "0.6", changefreq: "monthly" });
  // Blog posts are served by /guides/[slug] (guide route falls back to blog MDX).
  addContentType("blog", "/guides", { priority: "0.7", changefreq: "monthly" });

  // Public dashboards and charts (DB-backed).
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
      pushUrl(
        urls,
        `/${encodeURIComponent(username)}/dashboards/${encodeURIComponent(slug)}`,
        {
          lastmod: d.last_edited_date || d.published_at,
          changefreq: "weekly",
          priority: "0.6",
        },
      );
    }

    for (const c of charts) {
      const username = usernameById.get(String(c.user_id)) || "";
      const slug = String(c.public_slug || "").trim();
      if (!username || !slug) continue;
      pushUrl(
        urls,
        `/${encodeURIComponent(username)}/charts/${encodeURIComponent(slug)}`,
        {
          lastmod: c.last_saved_date,
          changefreq: "weekly",
          priority: "0.5",
        },
      );
    }
  } catch {
    // If DB is unavailable, still return static + MDX + hub URLs.
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
