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

const SITE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "https://lycheedata.com";

export function DashboardExportPanel() {
  const v2 = useMyStateV2();
  const draft = v2?.chartDashboardDraft;
  const setDraft = v2?.setChartDashboardDraft;
  const userHandle = v2?.userHandle;
  const requestSaveProjectDialog = v2?.requestSaveProjectDialog;

  const [slugInput, setSlugInput] = useState("");
  const [pub, setPub] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    setSlugInput(draft?.public_slug || "");
    setPub(!!draft?.is_public);
  }, [draft?._id, draft?.public_slug, draft?.is_public]);

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

  const publicUrl = useMemo(() => {
    const s = normalizeChartEmbedSlug(slugInput || draft?.public_slug || "");
    if (!userHandle || !isValidChartEmbedSlug(s)) return null;
    return `${String(SITE).replace(/\/$/, "")}/${encodeURIComponent(userHandle)}/dashboards/${encodeURIComponent(s)}`;
  }, [slugInput, draft?.public_slug, userHandle]);

  const openSaveProject = () => {
    if (!draft?._id) {
      toast.error("Load or create a dashboard first.");
      return;
    }
    const raw = normalizeChartEmbedSlug(slugInput || draft?.dashboard_name || "");
    if (pub && !isValidChartEmbedSlug(raw)) {
      toast.error("Invalid slug (lowercase letters, numbers, hyphens).");
      return;
    }
    flushSync(() => {
      setDraft?.((prev) => ({
        ...(prev || {}),
        is_public: pub,
        public_slug: pub ? raw : "",
      }));
    });
    requestSaveProjectDialog?.();
    toast.info("Use Save Project in the header to save layout, data, charts, and publish settings.");
  };

  if (!draft?._id) {
    return (
      <div className="p-2 text-xs text-muted-foreground">
        Create or load a dashboard from Your Work, then set a public slug here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-2">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Publish dashboard</p>
        <p className="text-[11px] text-muted-foreground">
          Set your slug and public toggle here, then use <span className="font-medium">Save Project</span> in the header to
          persist the dashboard with your workbook and charts.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dash-embed-slug" className="text-xs">
          Public slug
        </Label>
        <Input
          id="dash-embed-slug"
          className="h-9 text-sm"
          value={slugInput}
          onChange={(e) => setSlugInput(e.target.value)}
          placeholder="my-dashboard"
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="dash-pub" checked={pub} onCheckedChange={(c) => setPub(!!c)} />
        <Label htmlFor="dash-pub" className="text-xs font-normal">
          Public
        </Label>
      </div>
      <Button type="button" size="sm" className="w-full" onClick={openSaveProject}>
        Save project
      </Button>
      {publicUrl && pub ? (
        <div className="rounded-md border bg-muted/40 p-2 text-xs">
          <div className="mb-1 font-medium">Live URL</div>
          <Link
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 break-all text-primary underline underline-offset-2"
          >
            {publicUrl}
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
                If blank, Lychee will use your Page title (H1).
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
