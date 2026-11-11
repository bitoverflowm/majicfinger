import dbConnect from "@/lib/dbConnect";
import { loadSessionMember, requirePaidMember } from "@/lib/requirePaidMember";
import WorkspaceDashboard from "@/models/WorkspaceDashboards";
import WorkspacePublication from "@/models/WorkspacePublications";
import { sessionUserId, validProjectId } from "@/lib/server/workspaceProjects";
import { hashPublishPassword, publishedContent } from "@/lib/server/workspacePublication";
import {
  PUBLISH_CATEGORIES,
  PUBLISH_IMAGE_DATA_URL,
  PUBLISH_LIMITS,
  PUBLISH_MODES,
  PUBLISH_VISIBILITY,
  cleanPublishList,
  normalizePublishSlug,
  publishSlugProblem,
  publishedProjectPath,
  userCanPasswordProtect,
} from "@/lib/workspacePublish";

export const config = {
  api: { bodyParser: { sizeLimit: "8mb" } },
};

function text(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function longText(value, max) {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}

/** `undefined` keeps the stored image, "" or null clears it, a data URL replaces it. */
function imageField(value) {
  if (value === undefined) return { keep: true };
  if (!value) return { value: "" };
  const image = String(value);
  if (image.length > PUBLISH_LIMITS.image || !PUBLISH_IMAGE_DATA_URL.test(image)) return { error: "Images must be a PNG, JPEG or WebP under 1.5 MB." };
  return { value: image };
}

function settingsOut(row, { handle, canPassword }) {
  return {
    handle,
    canPassword,
    publication: row
      ? {
          slug: row.slug,
          published: !!row.published,
          publishedAt: row.published_at,
          firstPublishedAt: row.first_published_at,
          mode: row.mode,
          visibility: row.visibility,
          tabs: row.tabs || [],
          title: row.title,
          description: row.description,
          seoTitle: row.seo_title,
          seoDescription: row.seo_description,
          keywords: row.keywords || [],
          labels: row.labels || [],
          category: row.category,
          passwordOn: !!row.password_on,
          hasOgImage: !!row.og_image,
          hasOgAuto: !!row.og_auto,
          hasHeader: !!row.header_image,
          ogAt: row.og_at,
          headerAt: row.header_at,
          snapshotAt: row.snapshot_at,
          path: handle && row.slug ? publishedProjectPath(handle, row.slug) : "",
        }
      : null,
  };
}

/** Publish settings for one of the signed-in user's projects: read, publish (PUT), unpublish (DELETE). */
export default async function handler(req, res) {
  if (!["GET", "PUT", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const userId = await sessionUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
  if (req.method !== "GET" && !(await requirePaidMember(req, res, { allowFreeRun: true }))) return;

  const id = validProjectId(req.query.id);
  if (!id) return res.status(400).json({ success: false, message: "Invalid project id" });

  let member;
  try {
    await dbConnect();
    member = await loadSessionMember(req);
  } catch {
    return res.status(503).json({ success: false, message: "Publishing is unavailable right now." });
  }
  const handle = String(member?.user?.user_name || "").trim();
  const canPassword = userCanPasswordProtect(member?.user);

  const project = await WorkspaceDashboard.findOne({ _id: id, user_id: userId }).select("name tabs blocks tables active_tab_id").lean();
  if (!project) return res.status(404).json({ success: false, message: "Project not found" });

  const fields = "+og_image +og_auto +header_image";
  const existing = await WorkspacePublication.findOne({ project_id: id, user_id: userId }).select(fields).lean();

  if (req.method === "GET") {
    return res.status(200).json({ success: true, data: settingsOut(existing, { handle, canPassword }) });
  }

  if (req.method === "DELETE") {
    if (existing) await WorkspacePublication.updateOne({ _id: existing._id }, { $set: { published: false } });
    await WorkspaceDashboard.updateOne({ _id: id }, { $set: { published_at: null } }, { timestamps: false });
    const row = existing ? { ...existing, published: false } : null;
    return res.status(200).json({ success: true, data: settingsOut(row, { handle, canPassword }) });
  }

  if (!handle) {
    return res.status(409).json({ success: false, code: "HANDLE_REQUIRED", message: "Pick a handle first. It's the first part of the page's address." });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const slug = normalizePublishSlug(body.slug);
  const slugProblem = publishSlugProblem(slug);
  if (slugProblem) return res.status(400).json({ success: false, code: "SLUG_INVALID", message: slugProblem });
  const clash = await WorkspacePublication.findOne({ user_id: userId, slug, project_id: { $ne: id } }).select("_id").lean();
  if (clash) return res.status(409).json({ success: false, code: "SLUG_TAKEN", message: "Another of your projects uses that address." });

  const projectTabs = Array.isArray(project.tabs) ? project.tabs : [];
  const known = new Set(projectTabs.map((tab) => String(tab?.id)));
  const tabs = (Array.isArray(body.tabs) ? body.tabs : []).map(String).filter((tabId) => known.has(tabId));
  if (!tabs.length) return res.status(400).json({ success: false, code: "NO_TABS", message: "Pick at least one tab to show." });

  const mode = PUBLISH_MODES.includes(body.mode) ? body.mode : "live";
  const visibility = PUBLISH_VISIBILITY.includes(body.visibility) ? body.visibility : "public";
  const category = PUBLISH_CATEGORIES.includes(body.category) ? body.category : "";

  const passwordOn = !!body.passwordOn;
  let passwordHash;
  if (passwordOn) {
    if (!canPassword) return res.status(402).json({ success: false, code: "QUANT_REQUIRED", message: "Password-protected pages come with the Max plan." });
    const password = typeof body.password === "string" ? body.password : "";
    if (password) {
      if (password.length < PUBLISH_LIMITS.passwordMin || password.length > PUBLISH_LIMITS.passwordMax) {
        return res.status(400).json({ success: false, code: "PASSWORD_INVALID", message: `Use a password of at least ${PUBLISH_LIMITS.passwordMin} characters.` });
      }
      passwordHash = hashPublishPassword(password);
    } else if (!existing?.password_on) {
      const stored = existing ? await WorkspacePublication.findById(existing._id).select("+password_hash").lean() : null;
      if (!stored?.password_hash) return res.status(400).json({ success: false, code: "PASSWORD_INVALID", message: "Set a password for the page." });
    }
  }

  const images = { og_image: imageField(body.ogImage), og_auto: imageField(body.ogAuto), header_image: imageField(body.headerImage) };
  const imageError = Object.values(images).find((item) => item.error)?.error;
  if (imageError) return res.status(400).json({ success: false, code: "IMAGE_INVALID", message: imageError });

  const now = new Date();
  const set = {
    user_id: userId,
    slug,
    published: true,
    published_at: now,
    mode,
    visibility,
    tabs,
    title: text(body.title, PUBLISH_LIMITS.title) || text(project.name, PUBLISH_LIMITS.title) || "Untitled",
    description: longText(body.description, PUBLISH_LIMITS.description),
    seo_title: text(body.seoTitle, PUBLISH_LIMITS.seoTitle),
    seo_description: text(body.seoDescription, PUBLISH_LIMITS.seoDescription),
    keywords: cleanPublishList(body.keywords, { max: PUBLISH_LIMITS.keywords, each: PUBLISH_LIMITS.keyword }),
    labels: cleanPublishList(body.labels, { max: PUBLISH_LIMITS.labels, each: PUBLISH_LIMITS.label }),
    category,
    password_on: passwordOn,
    ...(passwordHash ? { password_hash: passwordHash } : {}),
    ...(passwordOn ? {} : { password_hash: "" }),
    snapshot: mode === "snapshot" ? publishedContent(project, tabs) : null,
    snapshot_at: mode === "snapshot" ? now : null,
  };
  for (const [key, item] of Object.entries(images)) {
    if (item.keep) continue;
    set[key] = item.value;
  }
  if (!images.og_image.keep || !images.og_auto.keep) set.og_at = now;
  if (!images.header_image.keep) set.header_at = images.header_image.value ? now : null;

  await WorkspacePublication.updateOne(
    { project_id: id },
    { $set: set, $setOnInsert: { project_id: id, first_published_at: now } },
    { upsert: true },
  );
  await WorkspaceDashboard.updateOne({ _id: id }, { $set: { published_at: now } }, { timestamps: false });
  const row = await WorkspacePublication.findOne({ project_id: id }).select(fields).lean();
  return res.status(200).json({ success: true, data: settingsOut(row, { handle, canPassword }) });
}
