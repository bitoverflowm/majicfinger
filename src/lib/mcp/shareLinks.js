/**
 * Make share/open links impossible for the agent to bury.
 * ChatGPT/Claude usually render markdown links (and images) from tool text.
 */

const DEFAULT_OG_PATH = "/og/lychee-research-terminal.png";
const FALLBACK_SITE = "https://lycheedata.com";

function siteOriginFrom(url) {
  try {
    return new URL(url).origin;
  } catch {
    return FALLBACK_SITE;
  }
}

export function buildOpenNowMarkdown({
  dashboard_url = "",
  publish_url = "",
  og_image_url = "",
  title = "Lychee research",
} = {}) {
  const lines = [];
  if (dashboard_url) {
    lines.push(`**Open charts now:** [${title} · workspace](${dashboard_url})`);
  }
  if (publish_url) {
    lines.push(`**Shareable publish:** [${title} · public](${publish_url})`);
  }
  if (og_image_url) {
    lines.push(`![${title} preview](${og_image_url})`);
  }
  return lines.join("\n");
}

function ogFromPublishUrl(publish_url) {
  if (!publish_url) return "";
  try {
    const u = new URL(publish_url, FALLBACK_SITE);
    const parts = u.pathname.split("/").filter(Boolean);
    // /{handle}/{slug} published research pages
    if (parts.length >= 2) {
      const handle = parts[0];
      const slug = parts[1];
      if (handle && slug && handle !== "dashboard" && handle !== "api") {
        return `${u.origin}/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}/image?kind=og`;
      }
    }
  } catch {
    /* ignore */
  }
  return "";
}

export function sharePayloadFromResult(result = {}) {
  const dashboard_url =
    result.dashboard_url ||
    result.composed?.dashboard_url ||
    result.project?.dashboard_url ||
    result.result?.dashboard_url ||
    result.publication?.dashboard_url ||
    "";
  const publish_url = result.publication?.url || result.publish_url || result.share_url || "";
  const title =
    result.market?.title ||
    result.composed?.title ||
    result.project?.name ||
    result.publication?.title ||
    "Lychee research";
  const site = siteOriginFrom(publish_url || dashboard_url || FALLBACK_SITE);
  const og_image_url =
    result.publication?.og_image_url ||
    result.og_image_url ||
    result.share_image_url ||
    ogFromPublishUrl(publish_url) ||
    (dashboard_url || publish_url ? `${site}${DEFAULT_OG_PATH}` : "");
  const open_now_markdown = buildOpenNowMarkdown({
    dashboard_url,
    publish_url,
    og_image_url,
    title,
  });
  return {
    dashboard_url: dashboard_url || null,
    publish_url: publish_url || null,
    og_image_url: og_image_url || null,
    open_now_markdown: open_now_markdown || null,
    user_visible_links: [
      ...(dashboard_url ? [{ label: "workspace", url: dashboard_url, must_paste_as_markdown: true }] : []),
      ...(publish_url ? [{ label: "publish", url: publish_url, must_paste_as_markdown: true }] : []),
      ...(og_image_url
        ? [{ label: "preview_image", url: og_image_url, must_paste_as_markdown_image: true }]
        : []),
    ],
  };
}

/** Prefixed human text so hosts surface links even if JSON is collapsed. */
export function linkLeadText(share) {
  if (!share?.open_now_markdown) return "";
  return [
    share.open_now_markdown,
    "",
    "_Paste the markdown link(s) / image above into your reply so the user can click or see them._",
    "",
  ].join("\n");
}
