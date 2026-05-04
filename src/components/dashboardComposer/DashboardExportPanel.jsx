"use client";

import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { useMyStateV2 } from "@/context/stateContextV2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { isValidChartEmbedSlug, normalizeChartEmbedSlug } from "@/lib/chartEmbedSlug";

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

  useEffect(() => {
    setSlugInput(draft?.public_slug || "");
    setPub(!!draft?.is_public);
  }, [draft?._id, draft?.public_slug, draft?.is_public]);

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
    </div>
  );
}
