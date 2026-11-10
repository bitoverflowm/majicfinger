"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, ExternalLink, Globe, ImagePlus, Loader2, Lock, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { captureNodeThumbnail } from "@/components/dashboardComposer/blockExport";
import { mutateUser } from "@/lib/hooks";
import { PROJECT_THUMBNAIL_ROOT } from "@/lib/projectThumbnail";
import { cn } from "@/lib/utils";
import {
  PUBLISH_CATEGORIES,
  PUBLISH_LIMITS,
  cleanPublishList,
  fallbackPublishDescription,
  normalizePublishSlug,
  publishSlugProblem,
} from "@/lib/workspacePublish";
import { checkPublishSlug, loadProjectPublish, publishProject, publishedImageUrl, saveUserHandle, unpublishProject, } from "@/lib/workspacePublishClient";

const SITE = "lycheedata.com";

function Section({ title, description, badge, children }) {
  return (
    <section className="space-y-3 border-b border-border/70 pb-5 last:border-b-0">
      <div>
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          {title}
          {badge}
        </h3>
        {description ? <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Counter({ value, max }) {
  const over = value.length > max;
  return <span className={cn("text-[11px] tabular-nums", over ? "text-rose-600" : "text-muted-foreground")}>{value.length}/{max}</span>;
}

function ChipsInput({ id, value, onChange, max, each, placeholder }) {
  const [draft, setDraft] = useState("");
  const add = (text) => {
    const next = cleanPublishList([...value, ...String(text).split(",")], { max, each });
    onChange(next);
    setDraft("");
  };
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1 focus-within:ring-2 focus-within:ring-[#0d99ff]/30">
      {value.map((item) => (
        <span key={item} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[12px] text-foreground">
          {item}
          <button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(value.filter((entry) => entry !== item))} className="text-muted-foreground hover:text-foreground">
            <X className="size-3" />
          </button>
        </span>
      ))}
      {value.length < max ? (
        <input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === ",") && draft.trim()) {
              event.preventDefault();
              add(draft);
            } else if (event.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={value.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent py-0.5 text-[13px] outline-none"
        />
      ) : null}
    </div>
  );
}

/** Reads an image file and crops it to `width` × `height` as a JPEG data URL. */
function fileToCover(file, width, height) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
      reject(new Error("Use a PNG, JPEG or WebP image."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that image."));
    reader.onload = () => {
      const image = new window.Image();
      image.onerror = () => reject(new Error("Couldn't read that image."));
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(width / image.width, height / image.height);
        const w = image.width * scale;
        const h = image.height * scale;
        ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function ImageField({ label, hint, preview, onFile, onClear, aspect, extra }) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  return (
    <div className="space-y-1.5">
      <p className="text-[12px] font-medium text-foreground">{label}</p>
      <div className={cn("relative overflow-hidden rounded-lg border border-border bg-muted/40", aspect)}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-[12px] text-muted-foreground">No image yet</div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="button" size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => inputRef.current?.click()}>
          <ImagePlus className="size-3.5" />
          Upload
        </Button>
        {extra}
        {onClear ? (
          <Button type="button" size="sm" variant="ghost" className="h-7 text-[12px]" onClick={onClear}>
            Remove
          </Button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setError("");
            try {
              await onFile(file);
            } catch (err) {
              setError(err?.message || "Couldn't use that image.");
            }
          }}
        />
      </div>
      <p className={cn("text-[11px]", error ? "text-rose-600" : "text-muted-foreground")}>{error || hint}</p>
    </div>
  );
}

/** The social card we make when the user doesn't upload one: their dashboard, framed and titled. */
async function generateSocialImage({ title, handle, path }) {
  const node = document.querySelector(`[${PROJECT_THUMBNAIL_ROOT}]`);
  const box = node?.getBoundingClientRect();
  const aspect = box?.width ? Math.min(1, node.clientHeight / box.width) : 0.56;
  const shot = await captureNodeThumbnail(node, { maxWidth: 1600, aspect, quality: 0.9, background: getComputedStyle(document.body).backgroundColor || "#ffffff" });
  // Crop to the blocks on screen so the canvas margins don't shrink the dashboard to a sliver.
  let crop = null;
  if (box?.width) {
    const blocks = [...node.querySelectorAll("[data-block-id]")]
      .map((el) => el.getBoundingClientRect())
      .filter((rect) => rect.width > 40 && rect.bottom > box.top && rect.top < box.top + node.clientHeight);
    if (blocks.length) {
      const left = Math.max(0, Math.min(...blocks.map((rect) => rect.left)) - box.left - 16);
      const right = Math.min(box.width, Math.max(...blocks.map((rect) => rect.right)) - box.left + 16);
      const top = Math.max(0, Math.min(...blocks.map((rect) => rect.top)) - box.top - 16);
      crop = { x: left / box.width, y: top / box.width, w: (right - left) / box.width };
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  const bg = ctx.createLinearGradient(0, 0, 1200, 630);
  bg.addColorStop(0, "#0b0d12");
  bg.addColorStop(1, "#111a2b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 630);
  const glow = ctx.createRadialGradient(1000, 80, 0, 1000, 80, 700);
  glow.addColorStop(0, "#0d99ff55");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1200, 630);
  const load = (src) =>
    new Promise((resolve) => {
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = src;
    });
  const [logo, screen] = await Promise.all([load("/logo.png"), shot ? load(shot) : null]);
  if (screen) {
    const scale = screen.width;
    const sx = crop ? crop.x * scale : 0;
    const sy = crop ? crop.y * scale : 0;
    const sw = crop ? crop.w * scale : screen.width;
    const w = 700;
    const h = 560;
    const sh = Math.min(screen.height - sy, (sw * h) / w);
    const x = 1200 - w - 40;
    const y = 110;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.clip();
    ctx.drawImage(screen, sx, sy, sw, sh, x, y, w, (sh * w) / sw);
    ctx.restore();
  }
  if (logo) ctx.drawImage(logo, 56, 52, 44, 44);
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 26px ui-sans-serif, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("Lychee", 112, 75);
  ctx.textBaseline = "top";
  ctx.font = "700 46px ui-sans-serif, system-ui, sans-serif";
  const words = String(title || "Dashboard").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > (screen ? 380 : 1080) && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  lines.slice(0, 5).forEach((text, index) => ctx.fillText(index === 4 && lines.length > 5 ? `${text}…` : text, 56, 150 + index * 56));
  ctx.font = "500 22px ui-monospace, Menlo, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(`@${handle}`, 56, 520);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "18px ui-monospace, Menlo, monospace";
  let link = `${SITE}${path}`;
  const room = screen ? 380 : 1080;
  while (link.length > 4 && ctx.measureText(link).width > room) link = `${link.slice(0, -2)}…`;
  ctx.fillText(link, 56, 556);
  const bar = ctx.createLinearGradient(0, 0, 1200, 0);
  bar.addColorStop(0, "#0d99ff");
  bar.addColorStop(1, "#28cc95");
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, 1200, 8);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function HandleSetup({ user, onSaved }) {
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
      <p className="text-[13px] font-medium text-foreground">Pick your handle first</p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">Every page you publish lives under it, like {SITE}/yourname/project.</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex h-8 flex-1 items-center rounded-md border border-input bg-background px-2 text-[13px]">
          <span className="text-muted-foreground">{SITE}/</span>
          <input
            aria-label="Handle"
            value={handle}
            onChange={(event) => setHandle(event.target.value.replace(/[^A-Za-z0-9_]/g, "").slice(0, 30))}
            className="min-w-0 flex-1 bg-transparent outline-none"
            placeholder="yourname"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="h-8"
          disabled={busy || handle.length < 2}
          onClick={async () => {
            setBusy(true);
            setError("");
            const result = await saveUserHandle(user.userId, handle);
            setBusy(false);
            if (!result.ok) {
              setError(result.message);
              return;
            }
            await mutateUser();
            onSaved(handle);
          }}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Save
        </Button>
      </div>
      {error ? <p className="mt-1.5 text-[12px] text-rose-600">{error}</p> : null}
    </div>
  );
}

function SearchPreview({ title, description, url }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">In search results</p>
      <p className="mt-2 truncate text-[12px] text-muted-foreground">{url}</p>
      <p className="truncate text-[16px] text-[#1a0dab] dark:text-[#8ab4f8]">{title} - Lychee</p>
      <p className="line-clamp-2 text-[12.5px] text-muted-foreground">{description}</p>
    </div>
  );
}

const EMPTY = {
  slug: "",
  title: "",
  description: "",
  seoTitle: "",
  seoDescription: "",
  keywords: [],
  labels: [],
  category: "",
  mode: "live",
  visibility: "public",
  tabs: [],
  passwordOn: false,
};

/**
 * The Publish tab: puts this project on its own page at lycheedata.com/<handle>/<slug>, with the
 * tabs, data mode, words and pictures that page should have.
 */
export function PublishPanel({ projectId, user, tabs, filledTabIds, dashboardName, onPublication }) {
  const [loaded, setLoaded] = useState(null);
  const [handle, setHandle] = useState(String(user?.user_name || ""));
  const [form, setForm] = useState(EMPTY);
  const [password, setPassword] = useState("");
  const [slugState, setSlugState] = useState({ status: "idle", message: "" });
  const [ogImage, setOgImage] = useState(undefined);
  const [ogAuto, setOgAuto] = useState(undefined);
  const [headerImage, setHeaderImage] = useState(undefined);
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const shownTabs = useMemo(() => (tabs || []).filter((tab) => tab?.id), [tabs]);

  useEffect(() => {
    if (!projectId) return undefined;
    let alive = true;
    loadProjectPublish(projectId).then((result) => {
      if (!alive) return;
      if (!result.ok) {
        setLoaded({ error: result.message });
        return;
      }
      const pub = result.data?.publication;
      if (result.data?.handle) setHandle(result.data.handle);
      setLoaded({ canPassword: !!result.data?.canPassword, publication: pub });
      onPublication?.(pub || null);
      setForm({
        ...EMPTY,
        ...(pub
          ? {
              slug: pub.slug,
              title: pub.title,
              description: pub.description,
              seoTitle: pub.seoTitle,
              seoDescription: pub.seoDescription,
              keywords: pub.keywords,
              labels: pub.labels,
              category: pub.category,
              mode: pub.mode,
              visibility: pub.visibility,
              tabs: pub.tabs,
              passwordOn: pub.passwordOn,
            }
          : {
              slug: normalizePublishSlug(dashboardName),
              title: dashboardName === "Untitled" ? "" : dashboardName,
              tabs: shownTabs.filter((tab) => !filledTabIds?.length || filledTabIds.includes(tab.id)).map((tab) => tab.id),
            }),
      });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const pub = loaded?.publication || null;
  const path = handle && form.slug ? `/${handle}/${form.slug}` : "";
  const fullUrl = path ? `https://${SITE}${path}` : "";
  const title = form.title.trim() || dashboardName || "Untitled";
  const pickedTabs = shownTabs.filter((tab) => form.tabs.includes(tab.id));
  const description = form.description.trim() || fallbackPublishDescription({ title, tabs: pickedTabs });

  useEffect(() => {
    const slug = form.slug;
    const problem = publishSlugProblem(slug);
    if (problem) {
      setSlugState({ status: "invalid", message: problem });
      return undefined;
    }
    if (pub?.slug === slug) {
      setSlugState({ status: "available", message: "" });
      return undefined;
    }
    setSlugState({ status: "checking", message: "" });
    const timer = window.setTimeout(async () => {
      const result = await checkPublishSlug(slug, projectId);
      if (!result.ok) setSlugState({ status: "error", message: result.message });
      else setSlugState({ status: result.data.available ? "available" : "taken", message: result.data.message });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [form.slug, projectId, pub?.slug]);

  const ogPreview =
    ogImage ||
    (ogImage === undefined && pub?.hasOgImage ? publishedImageUrl(handle, pub.slug, "og", pub.ogAt) : "") ||
    ogAuto ||
    (ogAuto === undefined && pub?.hasOgAuto && pub?.published ? publishedImageUrl(handle, pub.slug, "og", pub.ogAt) : "");
  const headerPreview = headerImage || (headerImage === undefined && pub?.hasHeader && pub?.published ? publishedImageUrl(handle, pub.slug, "header", pub.headerAt) : "");

  const generate = async () => {
    setGenerating(true);
    try {
      setOgAuto(await generateSocialImage({ title, handle: handle || "you", path }));
    } finally {
      setGenerating(false);
    }
  };

  const problems = [];
  if (!handle) problems.push("Pick a handle.");
  if (slugState.status === "invalid" || slugState.status === "taken") problems.push(slugState.message);
  if (!form.tabs.length) problems.push("Pick at least one tab to show.");
  if (form.seoTitle.length > PUBLISH_LIMITS.seoTitle) problems.push("The search title is too long.");
  if (form.seoDescription.length > PUBLISH_LIMITS.seoDescription) problems.push("The search description is too long.");
  if (form.passwordOn && !pub?.passwordOn && password.length < PUBLISH_LIMITS.passwordMin) problems.push(`Set a password of at least ${PUBLISH_LIMITS.passwordMin} characters.`);

  const publish = async () => {
    setBusy("publish");
    setError("");
    let auto = ogAuto;
    if (!ogImage && !(ogImage === undefined && pub?.hasOgImage) && auto === undefined) {
      auto = await generateSocialImage({ title, handle, path }).catch(() => undefined);
    }
    const result = await publishProject(projectId, {
      ...form,
      title,
      ...(form.passwordOn && password ? { password } : {}),
      ...(ogImage !== undefined ? { ogImage } : {}),
      ...(auto !== undefined ? { ogAuto: auto } : {}),
      ...(headerImage !== undefined ? { headerImage } : {}),
    });
    setBusy("");
    setConfirming(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setLoaded((prev) => ({ ...prev, publication: result.data.publication }));
    setOgImage(undefined);
    setOgAuto(undefined);
    setHeaderImage(undefined);
    setPassword("");
    onPublication?.(result.data.publication);
  };

  const unpublish = async () => {
    setBusy("unpublish");
    setError("");
    const result = await unpublishProject(projectId);
    setBusy("");
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setLoaded((prev) => ({ ...prev, publication: result.data.publication }));
    onPublication?.(result.data.publication);
  };

  if (!projectId) return <p className="p-6 text-[13px] text-muted-foreground">Save this dashboard as a project to publish it.</p>;
  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-[13px] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading publish settings
      </div>
    );
  }
  if (loaded.error) return <p className="p-6 text-[13px] text-muted-foreground">{loaded.error}</p>;

  const live = !!pub?.published;

  return (
    <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-h-0 space-y-5 overflow-y-auto pr-2">
        {live ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2.5">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
            <p className="min-w-0 flex-1 truncate text-[13px] text-foreground">
              Published at <span className="font-mono">{SITE}{pub.path}</span>
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7"
              onClick={async () => {
                await navigator.clipboard?.writeText(`https://${SITE}${pub.path}`).catch(() => undefined);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              }}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => window.open(pub.path, "_blank", "noopener")}>
              <ExternalLink className="size-3.5" />
              Open
            </Button>
          </div>
        ) : null}

        <Section title="Address" description="Where the page lives. Short and descriptive reads best in search results and links.">
          {handle ? null : <HandleSetup user={user} onSaved={setHandle} />}
          <div className="flex h-9 items-center rounded-md border border-input bg-background px-2.5 text-[13px] focus-within:ring-2 focus-within:ring-[#0d99ff]/30">
            <Globe className="mr-2 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="shrink-0 text-muted-foreground">
              {SITE}/{handle || "you"}/
            </span>
            <input
              aria-label="Page address"
              value={form.slug}
              onChange={(event) => set({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-").slice(0, PUBLISH_LIMITS.slug) })}
              onBlur={() => set({ slug: normalizePublishSlug(form.slug) })}
              className="min-w-0 flex-1 bg-transparent outline-none"
              placeholder="project-title"
            />
            {slugState.status === "checking" ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden /> : null}
            {slugState.status === "available" ? <Check className="size-3.5 text-emerald-600" aria-label="Available" /> : null}
          </div>
          {slugState.message ? <p className="text-[12px] text-rose-600">{slugState.message}</p> : null}
        </Section>

        <Section title="Tabs on the page" description="Visitors see these tabs, in this order. The rest stay private.">
          <div className="grid gap-1.5 sm:grid-cols-2">
            {shownTabs.map((tab) => {
              const on = form.tabs.includes(tab.id);
              return (
                <label key={tab.id} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2", on ? "border-[#0d99ff]/50 bg-[#0d99ff]/[0.04]" : "border-border")}>
                  <Checkbox
                    checked={on}
                    onCheckedChange={(checked) => set({ tabs: checked ? shownTabs.filter((item) => item.id === tab.id || form.tabs.includes(item.id)).map((item) => item.id) : form.tabs.filter((id) => id !== tab.id) })}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{tab.name || "Tab"}</span>
                  {tab.terminal ? <span className="shrink-0 text-[11px] text-muted-foreground">Terminal</span> : null}
                </label>
              );
            })}
          </div>
        </Section>

        <Section title="Data" description="Choose whether the page keeps moving or stays as it is now.">
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Data">
            {[
              { id: "live", title: "Live", body: "Shows your latest saved dashboard. Edits appear on the page, and markets keep updating." },
              { id: "snapshot", title: "Snapshot", body: "Freezes your tabs, sheets and charts as they are when you publish. Publish again to refresh it." },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={form.mode === option.id}
                onClick={() => set({ mode: option.id })}
                className={cn("rounded-xl border p-3 text-left", form.mode === option.id ? "border-[#0d99ff] bg-[#0d99ff]/[0.05]" : "border-border hover:border-foreground/20")}
              >
                <p className="text-[13px] font-semibold text-foreground">{option.title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{option.body}</p>
              </button>
            ))}
          </div>
          {form.mode === "snapshot" && pickedTabs.some((tab) => tab.terminal) ? (
            <p className="flex gap-1.5 text-[12px] text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" aria-hidden />
              Terminal panels read Polymarket when someone opens the page, so their numbers stay current even in a snapshot.
            </p>
          ) : null}
        </Section>

        <Section title="About this dashboard" description="Say what someone learns here and why it matters. This is the page's intro and what search and AI answers quote.">
          <div className="space-y-1.5">
            <Label htmlFor="publish-title" className="text-[12px]">
              Title
            </Label>
            <Input id="publish-title" value={form.title} maxLength={PUBLISH_LIMITS.title} placeholder={dashboardName} onChange={(event) => set({ title: event.target.value })} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="publish-description" className="text-[12px]">
                Description
              </Label>
              <Counter value={form.description} max={PUBLISH_LIMITS.description} />
            </div>
            <Textarea
              id="publish-description"
              value={form.description}
              maxLength={PUBLISH_LIMITS.description}
              onChange={(event) => set({ description: event.target.value })}
              placeholder="What this dashboard tracks, what to look for, and what you found."
              className="min-h-[7rem] text-[13px]"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="publish-category" className="text-[12px]">
                Category
              </Label>
              <select
                id="publish-category"
                value={form.category}
                onChange={(event) => set({ category: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-[13px]"
              >
                <option value="">None</option>
                {PUBLISH_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="publish-labels" className="text-[12px]">
                Labels
              </Label>
              <ChipsInput id="publish-labels" value={form.labels} onChange={(labels) => set({ labels })} max={PUBLISH_LIMITS.labels} each={PUBLISH_LIMITS.label} placeholder="NFL, odds, whales" />
            </div>
          </div>
        </Section>

        <Section title="Search and AI answers" description="How the page shows up on Google and in answers from ChatGPT, Perplexity and others. Left blank, we use the title and description.">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="publish-seo-title" className="text-[12px]">
                Search title
              </Label>
              <Counter value={form.seoTitle} max={PUBLISH_LIMITS.seoTitle} />
            </div>
            <Input id="publish-seo-title" value={form.seoTitle} placeholder={title} onChange={(event) => set({ seoTitle: event.target.value })} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="publish-seo-description" className="text-[12px]">
                Search description
              </Label>
              <Counter value={form.seoDescription} max={PUBLISH_LIMITS.seoDescription} />
            </div>
            <Textarea
              id="publish-seo-description"
              value={form.seoDescription}
              placeholder={description.slice(0, 160)}
              onChange={(event) => set({ seoDescription: event.target.value })}
              className="min-h-[4rem] text-[13px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publish-keywords" className="text-[12px]">
              Keywords
            </Label>
            <ChipsInput id="publish-keywords" value={form.keywords} onChange={(keywords) => set({ keywords })} max={PUBLISH_LIMITS.keywords} each={PUBLISH_LIMITS.keyword} placeholder="Type a keyword, then Enter" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Visibility">
            {[
              { id: "public", title: "Public", body: "Listed in search engines and our sitemap." },
              { id: "unlisted", title: "Unlisted", body: "Anyone with the link can open it. Search engines skip it." },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={form.visibility === option.id}
                onClick={() => set({ visibility: option.id })}
                className={cn("rounded-xl border p-3 text-left", form.visibility === option.id ? "border-[#0d99ff] bg-[#0d99ff]/[0.05]" : "border-border hover:border-foreground/20")}
              >
                <p className="text-[13px] font-semibold text-foreground">{option.title}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{option.body}</p>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Pictures" description="The social image shows when the link is posted on X, LinkedIn, Slack or iMessage. We make one from your dashboard; upload your own to replace it.">
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageField
              label="Social image"
              hint="1200 × 630. Uploads are cropped to fit."
              aspect="aspect-[1200/630]"
              preview={ogPreview}
              onFile={async (file) => setOgImage(await fileToCover(file, 1200, 630))}
              onClear={ogImage || (ogImage === undefined && pub?.hasOgImage) ? () => setOgImage("") : null}
              extra={
                <Button type="button" size="sm" variant="ghost" className="h-7 text-[12px]" onClick={generate} disabled={generating}>
                  {generating ? <Loader2 className="size-3.5 animate-spin" /> : ogAuto ? <RefreshCw className="size-3.5" /> : <Sparkles className="size-3.5" />}
                  {ogAuto ? "Remake" : "Make from dashboard"}
                </Button>
              }
            />
            <ImageField
              label="Header image"
              hint="A banner across the top of the page, 1600 × 400."
              aspect="aspect-[4/1]"
              preview={headerPreview}
              onFile={async (file) => setHeaderImage(await fileToCover(file, 1600, 400))}
              onClear={headerPreview ? () => setHeaderImage("") : null}
            />
          </div>
        </Section>

        <Section title="Access">
          <div className={cn("rounded-xl border p-3", loaded.canPassword ? "border-border" : "border-dashed border-border")}>
            <div className="flex items-center gap-3">
              <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                  Password protect
                  <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-violet-600 dark:text-violet-300">Quant</span>
                </p>
                <p className="text-[12px] text-muted-foreground">Only people with the password can open it. Search engines skip it.</p>
              </div>
              <Switch checked={form.passwordOn} disabled={!loaded.canPassword} onCheckedChange={(on) => set({ passwordOn: on })} aria-label="Password protect" />
            </div>
            {!loaded.canPassword ? (
              <p className="mt-2 text-[12px] text-muted-foreground">
                Comes with the Quant plan.{" "}
                <a href="/pricing" className="font-medium text-foreground underline-offset-2 hover:underline">
                  See plans
                </a>
              </p>
            ) : form.passwordOn ? (
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={pub?.passwordOn ? "Leave blank to keep the current password" : "Password"}
                aria-label="Page password"
                className="mt-2 h-8"
              />
            ) : null}
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-3 opacity-80">
            <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                Custom domain
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground">Coming soon</span>
              </p>
              <p className="text-[12px] text-muted-foreground">Serve this page from your own domain, like data.yoursite.com.</p>
            </div>
          </div>
        </Section>
      </div>

      <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
        <SearchPreview title={form.seoTitle.trim() || title} description={(form.seoDescription.trim() || description).slice(0, 170)} url={fullUrl || `${SITE}/you/project`} />
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          {ogPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ogPreview} alt="" className="aspect-[1200/630] w-full object-cover" />
          ) : (
            <div className="flex aspect-[1200/630] items-center justify-center bg-muted/40 text-[12px] text-muted-foreground">Social image is made when you publish</div>
          )}
          <div className="p-3">
            <p className="text-[11px] text-muted-foreground">{SITE}</p>
            <p className="truncate text-[13px] font-semibold text-foreground">{form.seoTitle.trim() || title}</p>
          </div>
        </div>
        <div className="mt-auto space-y-2 rounded-xl border border-border bg-background p-3">
          {confirming ? (
            <>
              <p className="text-[13px] font-semibold text-foreground">{live ? "Update the published page?" : "Publish this dashboard?"}</p>
              <ul className="space-y-1 text-[12px] text-muted-foreground">
                <li className="truncate">
                  At <span className="font-mono text-foreground">{SITE}{path}</span>
                </li>
                <li>
                  {pickedTabs.length} {pickedTabs.length === 1 ? "tab" : "tabs"}: {pickedTabs.map((tab) => tab.name).join(", ")}
                </li>
                <li>{form.mode === "live" ? "Live: follows your edits and the markets" : "Snapshot: frozen as it is now"}</li>
                <li>
                  {form.passwordOn ? "Password protected" : form.visibility === "public" ? "Public, listed in search" : "Unlisted: only people with the link"}
                </li>
              </ul>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => setConfirming(false)} disabled={busy === "publish"}>
                  Back
                </Button>
                <Button type="button" size="sm" className="flex-1" onClick={publish} disabled={busy === "publish"}>
                  {busy === "publish" ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {live ? "Update page" : "Publish now"}
                </Button>
              </div>
            </>
          ) : (
            <>
              {problems.length ? <p className="text-[12px] text-muted-foreground">{problems[0]}</p> : null}
              <Button type="button" className="w-full" onClick={() => setConfirming(true)} disabled={!!problems.length || slugState.status === "checking" || !!busy}>
                {live ? "Update published page" : "Publish"}
              </Button>
              {live ? (
                <Button type="button" variant="ghost" size="sm" className="w-full text-[12px] text-muted-foreground" onClick={unpublish} disabled={!!busy}>
                  {busy === "unpublish" ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Unpublish
                </Button>
              ) : null}
            </>
          )}
          {error ? <p className="text-[12px] text-rose-600">{error}</p> : null}
        </div>
      </aside>
    </div>
  );
}
