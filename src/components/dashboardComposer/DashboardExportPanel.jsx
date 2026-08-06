"use client";

import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { useMyStateV2 } from "@/context/stateContextV2";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { isValidChartEmbedSlug, normalizeChartEmbedSlug } from "@/lib/chartEmbedSlug";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DASHBOARD_TAG_SUGGESTIONS } from "@/lib/content/dashboardTagSuggestions";
import {
  embedSlugStatusMessage,
  useEmbedSlugAvailability,
} from "@/hooks/useEmbedSlugAvailability";

function resolvePublishedSiteOrigin() {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return "http://localhost:3000";
  }
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  return "https://lycheedata.com";
}

export function DashboardExportPanel() {
  const v2 = useMyStateV2();
  const isDemo = !!v2?.isDemo;
  const draft = v2?.chartDashboardDraft;
  const setDraft = v2?.setChartDashboardDraft;
  const userHandle = v2?.userHandle;
  const requestSaveProjectDialog = v2?.requestSaveProjectDialog;

  const [slugInput, setSlugInput] = useState("");
  const [pub, setPub] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [siteOrigin, setSiteOrigin] = useState(() => resolvePublishedSiteOrigin());

  useEffect(() => {
    setSiteOrigin(resolvePublishedSiteOrigin());
  }, []);

  useEffect(() => {
    setSlugInput(draft?.public_slug || "");
    setPub(!!draft?.is_public);
  }, [draft?._id, draft?.public_slug, draft?.is_public]);

  const {
    status: slugStatus,
    isTaken: slugTaken,
    isChecking: slugChecking,
    checkNow: checkSlugNow,
  } = useEmbedSlugAvailability({
    kind: "dashboard",
    slugInput,
    excludeId: draft?._id || null,
    enabled: !!draft?._id && !isDemo && !!slugInput.trim(),
  });

  useEffect(() => {
    if (!draft?._id) return;
    // Ensure arrays exist for the metadata UI.
    setDraft?.((prev) => {
      const p = prev || {};
      const tags = Array.isArray(p.tags) ? p.tags : [];
      const keywords = Array.isArray(p.keywords) ? p.keywords : [];
      if (tags === p.tags && keywords === p.keywords) return prev;
      return { ...p, tags, keywords, seo_title: p.seo_title || "" };
    });
  }, [draft?._id, setDraft]);

  const tags = Array.isArray(draft?.tags) ? draft.tags : [];
  const keywords = Array.isArray(draft?.keywords) ? draft.keywords : [];

  const addChip = (kind, raw) => {
    const v = String(raw || "").trim();
    if (!v) return;
    const max = 30;
    setDraft?.((prev) => {
      const p = prev || {};
      const list = Array.isArray(p[kind]) ? p[kind] : [];
      const exists = new Set(list.map((t) => String(t).toLowerCase()));
      if (exists.has(v.toLowerCase())) return prev;
      return { ...p, [kind]: [...list, v].slice(0, max) };
    });
  };
  const removeChip = (kind, value) =>
    setDraft?.((prev) => {
      const p = prev || {};
      const list = Array.isArray(p[kind]) ? p[kind] : [];
      const next = list.filter((t) => String(t) !== String(value));
      return { ...p, [kind]: next };
    });

  const publishedUrl = useMemo(() => {
    const s = normalizeChartEmbedSlug(slugInput || draft?.public_slug || "");
    if (!userHandle || !isValidChartEmbedSlug(s)) return null;
    return `${String(siteOrigin).replace(/\/$/, "")}/${encodeURIComponent(userHandle)}/dashboards/${encodeURIComponent(s)}`;
  }, [slugInput, draft?.public_slug, userHandle, siteOrigin]);

  const openSaveProject = async () => {
    if (isDemo) {
      toast.error("Demo mode: publishing dashboards is disabled.");
      return;
    }
    if (!draft?._id) {
      toast.error("Load or create a dashboard first.");
      return;
    }
    const raw = normalizeChartEmbedSlug(slugInput || "");
    // Slug is required to publish (private or public). Empty slug unpublishes.
    if (slugInput.trim() && !isValidChartEmbedSlug(raw)) {
      toast.error("Invalid slug (lowercase letters, numbers, hyphens).");
      return;
    }
    if (raw) {
      const slugCheck = await checkSlugNow();
      if (!slugCheck.available) {
        toast.error(
          slugCheck.reason === "taken"
            ? "That slug is already used by another dashboard of yours."
            : embedSlugStatusMessage(slugCheck.reason, "dashboard") || "Slug is not available.",
        );
        return;
      }
    }
    flushSync(() => {
      setDraft?.((prev) => ({
        ...(prev || {}),
        is_public: pub && !!raw,
        public_slug: raw,
      }));
    });
    requestSaveProjectDialog?.();
    toast.info("Use Save Project in the header to save layout, data, charts, and publish settings.");
  };

  const clearPublish = () => {
    setSlugInput("");
    setPub(false);
    flushSync(() => {
      setDraft?.((prev) => ({
        ...(prev || {}),
        is_public: false,
        public_slug: "",
      }));
    });
    toast.message("Publish cleared — Save Project to unpublish this dashboard.");
  };

  if (!draft?._id) {
    const hasUnsavedDashboard =
      !!draft &&
      (Array.isArray(draft.layout?.rows) ||
        !!String(draft.dashboard_name || draft.page_heading || "").trim());
    return (
      <div className="p-2 text-xs text-muted-foreground">
        {hasUnsavedDashboard
          ? "Save project to enable dashboard publishing."
          : "Create or load a dashboard from Your Work, then set a slug here."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-2">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Publish dashboard</p>
        <p className="text-[11px] text-muted-foreground">
          Set a slug to publish. Leave <span className="font-medium">Public</span> unchecked for a
          private link (only you when signed in). Check Public to share with the world. Then use{" "}
          <span className="font-medium">Save Project</span> in the header.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dash-embed-slug" className="text-xs">
          Slug
        </Label>
        <Input
          id="dash-embed-slug"
          className="h-9 text-sm"
          value={slugInput}
          onChange={(e) => setSlugInput(e.target.value)}
          placeholder="my-dashboard"
          aria-invalid={slugTaken || slugStatus === "invalid"}
        />
        {slugInput.trim() && slugStatus !== "idle" && slugStatus !== "empty" ? (
          <p
            className={`text-[10px] ${
              slugTaken || slugStatus === "invalid" || slugStatus === "error"
                ? "text-destructive"
                : slugStatus === "available"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
            }`}
          >
            {embedSlugStatusMessage(slugStatus, "dashboard")}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="dash-pub" checked={pub} onCheckedChange={(c) => setPub(!!c)} disabled={isDemo} />
        <Label htmlFor="dash-pub" className="text-xs font-normal">
          Public
        </Label>
        {isDemo ? (
          <span className="text-[11px] text-muted-foreground">(demo)</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {pub ? "Anyone with the link" : "Owner only (signed in)"}
          </span>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        className="w-full"
        onClick={openSaveProject}
        disabled={
          isDemo ||
          (!!slugInput.trim() && (slugChecking || slugTaken || slugStatus === "invalid"))
        }
      >
        Save project
      </Button>
      {(draft?.public_slug || slugInput.trim()) && !isDemo ? (
        <Button type="button" size="sm" variant="ghost" className="w-full text-xs" onClick={clearPublish}>
          Clear slug (unpublish)
        </Button>
      ) : null}
      {publishedUrl ? (
        <div className="rounded-md border bg-muted/40 p-2 text-xs">
          <div className="mb-1 font-medium">{pub ? "Public URL" : "Private URL (owner only)"}</div>
          <Link
            href={publishedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 break-all text-primary underline underline-offset-2"
          >
            {publishedUrl}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
        </div>
      ) : null}

      <Accordion type="single" collapsible defaultValue="metadata">
        <AccordionItem value="metadata">
          <AccordionTrigger className="py-2 text-xs font-semibold text-muted-foreground hover:no-underline">
            Metadata
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label htmlFor="dash-seo-title" className="text-xs">
                SEO title (optional)
              </Label>
              <Input
                id="dash-seo-title"
                className="h-9 text-sm"
                value={draft?.seo_title || ""}
                onChange={(e) =>
                  setDraft?.((prev) => ({
                    ...(prev || {}),
                    seo_title: e.target.value,
                  }))
                }
                placeholder="Defaults to Page title"
              />
              <p className="text-[11px] text-muted-foreground">
                If blank, Lychee will use your Page title (H1). SEO applies when Public is checked.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tags</Label>
              <Input
                className="h-9 text-sm"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Type a tag and press Enter"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  addChip("tags", tagInput);
                  setTagInput("");
                }}
              />
              {DASHBOARD_TAG_SUGGESTIONS?.length ? (
                <div className="flex flex-wrap gap-1 pt-1">
                  {DASHBOARD_TAG_SUGGESTIONS.slice(0, 18).map((t) => (
                    <button
                      key={`tag-suggest-${t}`}
                      type="button"
                      className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => addChip("tags", t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : null}
              {tags.length ? (
                <div className="flex flex-wrap gap-1 pt-2">
                  {tags.map((t) => (
                    <Badge key={`tag-${t}`} variant="secondary" className="gap-1 text-[11px]">
                      <span>{t}</span>
                      <button
                        type="button"
                        className="rounded px-1 hover:bg-muted-foreground/20"
                        aria-label={`Remove tag ${t}`}
                        onClick={() => removeChip("tags", t)}
                      >
                        x
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Keywords</Label>
              <Input
                className="h-9 text-sm"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Type a keyword and press Enter"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  addChip("keywords", keywordInput);
                  setKeywordInput("");
                }}
              />
              {keywords.length ? (
                <div className="flex flex-wrap gap-1 pt-2">
                  {keywords.map((t) => (
                    <Badge key={`kw-${t}`} variant="outline" className="gap-1 text-[11px]">
                      <span>{t}</span>
                      <button
                        type="button"
                        className="rounded px-1 hover:bg-muted-foreground/20"
                        aria-label={`Remove keyword ${t}`}
                        onClick={() => removeChip("keywords", t)}
                      >
                        x
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
