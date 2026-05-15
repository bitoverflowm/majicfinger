"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpFromLine,
  Braces,
  Clock,
  ExternalLink,
  FileImage,
  FilePlus2,
  LayoutTemplate,
  Loader2,
  Newspaper,
} from "lucide-react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { API_INTEGRATIONS, integrations_list } from "@/components/integrationsView/integrationsConfig";
import { ConnectProgressWithLabel } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/ConnectProgressWithLabel";
import { useBeckerHistoricalWarmIntegrationsConnect } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/useBeckerHistoricalWarmIntegrationsConnect";
import { loadFullProjectFromApi } from "@/lib/hydrateProjectWorkspace";
import { CONNECT_HOME_GUIDES } from "@/lib/guidesConnectHomeManifest";
import { debounce } from "@/lib/debounce";
import { isReservedUserHandle, reservedUserHandleMessage } from "@/lib/reservedUserHandles";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfilePictureUploader } from "@/components/profile/ProfilePictureUploader";

/** Wireframe order + News API (platform integration roadmap). */
const CONNECT_INTEGRATION_ORDER = [
  "kalshiHistorical",
  "polymarket",
  "polymarketHistorical",
  "binance",
  "chainlink",
  "coinGecko",
  "newsApi",
  "geckoDex",
  "productHunt",
];

const EXAMPLE_DASHBOARD = {
  title: "Kalshi volume dashboard (example)",
  href: "/misterrpink/dashboards/kalshi-volume",
};

const PREDICTION_TEMPLATES = [
  { id: "t1", title: "Template 1" },
  { id: "t2", title: "Template 2" },
  { id: "t3", title: "Template 3" },
];

const rowSurfaceClass =
  "flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/60";

function MenuRow({ icon, label, description, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(rowSurfaceClass, disabled ? "cursor-not-allowed opacity-60 hover:bg-card" : "")}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-snug text-foreground">{label}</div>
        {description ? <div className="mt-0.5 text-xs text-muted-foreground">{description}</div> : null}
      </div>
    </button>
  );
}

function MenuLinkRow({ href, external, icon, label, description }) {
  const inner = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-snug text-foreground">{label}</div>
        {description ? <div className="mt-0.5 text-xs text-muted-foreground">{description}</div> : null}
      </div>
      {external ? <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={rowSurfaceClass}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={rowSurfaceClass}>
      {inner}
    </Link>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{children}</h2>;
}

export default function ConnectDataStep1({ user }) {
  const context = useMyStateV2();
  const setViewing = context?.setViewing;
  const setIntegrationSidebar = context?.setIntegrationSidebar;
  const setConnectedData = context?.setConnectedData;
  const setConnectedCols = context?.setConnectedCols;
  const setRightPanelOpen = context?.setRightPanelOpen;
  const setRightPanelTab = context?.setRightPanelTab;
  const savedDataSets = context?.savedDataSets;
  const userHandle = context?.userHandle;
  const setUserHandle = context?.setUserHandle;
  const profilePic = context?.profilePic;
  const setProfilePic = context?.setProfilePic;
  const setDataSheets = context?.setDataSheets;
  const setActiveSheetId = context?.setActiveSheetId;
  const setLoadedDataMeta = context?.setLoadedDataMeta;
  const setLoadedDataId = context?.setLoadedDataId;
  const setSavedCharts = context?.setSavedCharts;
  const setChartSheets = context?.setChartSheets;
  const setActiveChartSheetId = context?.setActiveChartSheetId;
  const setLoadedChartMeta = context?.setLoadedChartMeta;
  const setLoadedChartBuilderSnapshot = context?.setLoadedChartBuilderSnapshot;
  const setRefetchChartDashboardsTick = context?.setRefetchChartDashboardsTick;

  const hasDbBackedUserId =
    typeof user?.userId === "string" &&
    user.userId !== "dev-bypass-no-db" &&
    /^[a-f0-9]{24}$/i.test(user.userId);

  const needsHandle = !String(userHandle || "").trim();

  const [onboardingHandle, setOnboardingHandle] = useState("");
  const [onboardingHandleTaken, setOnboardingHandleTaken] = useState(false);
  const [onboardingSubmitBusy, setOnboardingSubmitBusy] = useState(false);
  const [onboardingUploadFn, setOnboardingUploadFn] = useState(null);
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [loadProjectBusy, setLoadProjectBusy] = useState(false);

  const navigatePolymarketHistorical = useCallback(() => {
    if (!API_INTEGRATIONS.includes("polymarketHistorical")) return;
    setConnectedData?.([]);
    setConnectedCols?.([]);
    setViewing?.("dataStart");
    setIntegrationSidebar?.("polymarketHistorical");
    setRightPanelTab?.("integrations");
    setRightPanelOpen?.(true);
  }, [
    setConnectedCols,
    setConnectedData,
    setIntegrationSidebar,
    setRightPanelOpen,
    setRightPanelTab,
    setViewing,
  ]);

  const polymarketHistoricalConnect = useBeckerHistoricalWarmIntegrationsConnect(navigatePolymarketHistorical);

  const navigateKalshiHistorical = useCallback(() => {
    if (!API_INTEGRATIONS.includes("kalshiHistorical")) return;
    setConnectedData?.([]);
    setConnectedCols?.([]);
    setViewing?.("dataStart");
    setIntegrationSidebar?.("kalshiHistorical");
    setRightPanelTab?.("integrations");
    setRightPanelOpen?.(true);
  }, [
    setConnectedCols,
    setConnectedData,
    setIntegrationSidebar,
    setRightPanelOpen,
    setRightPanelTab,
    setViewing,
  ]);

  const kalshiHistoricalConnect = useBeckerHistoricalWarmIntegrationsConnect(navigateKalshiHistorical);

  const openIntegrationPlayground = useCallback(
    (clickHandlerId) => {
      if (!API_INTEGRATIONS.includes(clickHandlerId)) {
        toast.info("This integration is not wired up yet.");
        return;
      }
      setConnectedData?.([]);
      setConnectedCols?.([]);
      setViewing?.("dataStart");
      setIntegrationSidebar?.(clickHandlerId);
      setRightPanelTab?.("integrations");
      setRightPanelOpen?.(true);
    },
    [
      setConnectedCols,
      setConnectedData,
      setIntegrationSidebar,
      setRightPanelOpen,
      setRightPanelTab,
      setViewing,
    ],
  );

  const integrationByHandler = useMemo(() => {
    const m = new Map();
    for (const i of integrations_list) {
      if (i?.clickHandler) m.set(i.clickHandler, i);
    }
    return m;
  }, []);

  const connectIntegrationRows = useMemo(() => {
    return CONNECT_INTEGRATION_ORDER.map((id) => {
      if (id === "newsApi") {
        return {
          key: "newsApi",
          name: "News API",
          description: "Headlines and articles for research dashboards.",
          icon: <Newspaper className="h-5 w-5" />,
          live: false,
          warmConnect: null,
          clickHandler: null,
        };
      }
      const row = integrationByHandler.get(id);
      if (!row) return null;
      const warmConnect =
        id === "polymarketHistorical"
          ? polymarketHistoricalConnect
          : id === "kalshiHistorical"
            ? kalshiHistoricalConnect
            : null;
      return {
        key: id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        live: !!row.live && !(row.tags || []).includes("coming soon"),
        warmConnect,
        clickHandler: row.clickHandler,
      };
    }).filter(Boolean);
  }, [integrationByHandler, kalshiHistoricalConnect, polymarketHistoricalConnect]);

  const latestWork = useMemo(() => {
    const list = Array.isArray(savedDataSets) ? savedDataSets : [];
    const sorted = [...list].sort((a, b) => {
      const ta = new Date(a?.last_saved_date || a?.created_date || 0).getTime();
      const tb = new Date(b?.last_saved_date || b?.created_date || 0).getTime();
      return tb - ta;
    });
    return sorted.slice(0, 6);
  }, [savedDataSets]);
  const showLatestWork = hasDbBackedUserId && latestWork.length > 0;

  const checkOnboardingHandle = useMemo(
    () =>
      debounce((value) => {
        const v = String(value || "").trim();
        if (isReservedUserHandle(v)) {
          setOnboardingHandleTaken(true);
          return;
        }
        if (v.length < 3) {
          setOnboardingHandleTaken(false);
          return;
        }
        setIsCheckingHandle(true);
        fetch(`/api/users/checkUserhandle?userHandle=${encodeURIComponent(v)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
          .then((r) => r.json())
          .then((data) => {
            setOnboardingHandleTaken(!!data?.exists);
            setIsCheckingHandle(false);
          })
          .catch(() => {
            setOnboardingHandleTaken(false);
            setIsCheckingHandle(false);
          });
      }, 450),
    [],
  );

  const onboardingHandleChange = (e) => {
    const v = e.target.value;
    setOnboardingHandle(v);
    setOnboardingHandleTaken(false);
    if (String(v || "").trim().length >= 3) {
      checkOnboardingHandle(v);
    }
  };

  const submitOnboardingHandle = async () => {
    if (!hasDbBackedUserId) return;
    const v = String(onboardingHandle || "").trim();
    if (isReservedUserHandle(v)) {
      toast.error(reservedUserHandleMessage(v));
      setOnboardingHandleTaken(true);
      return;
    }
    if (v.length < 3) return;
    if (onboardingHandleTaken || isCheckingHandle) return;
    try {
      setOnboardingSubmitBusy(true);
      if (typeof onboardingUploadFn === "function") {
        await onboardingUploadFn();
      }
      const res = await fetch(`/api/users/${user.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_name: v }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        toast.error(data?.message || "Failed to set handle");
        return;
      }
      setUserHandle(data.data.user_name);
      toast.success("Handle set!");
    } catch {
      toast.error("Failed to set handle");
    } finally {
      setOnboardingSubmitBusy(false);
    }
  };

  const onOpenProject = async (dataSetId) => {
    if (!dataSetId || loadProjectBusy || !hasDbBackedUserId) return;
    setLoadProjectBusy(true);
    try {
      await loadFullProjectFromApi({
        dataSetId,
        userId: user.userId,
        setDataSheets,
        setActiveSheetId,
        setConnectedData,
        setLoadedDataMeta,
        setLoadedDataId,
        setSavedCharts,
        setChartSheets,
        setActiveChartSheetId,
        setLoadedChartMeta,
        setLoadedChartBuilderSnapshot,
        setRefetchChartDashboardsTick,
      });
      toast.success("Project opened");
      setViewing?.("dataStart");
    } catch (e) {
      toast.error(e?.message || "Failed to load project");
    } finally {
      setLoadProjectBusy(false);
    }
  };

  const onIntegrationRowClick = (row) => {
    if (row.warmConnect) {
      if (row.warmConnect.busy) return;
      if (row.warmConnect.error) {
        row.warmConnect.start();
        return;
      }
      row.warmConnect.start();
      return;
    }
    if (!row.live) {
      toast.info("Coming soon");
      return;
    }
    if (row.clickHandler) {
      openIntegrationPlayground(row.clickHandler);
    }
  };

  const gridTemplate = showLatestWork
    ? "grid-cols-1 lg:grid-cols-[minmax(0,7.5rem)_repeat(5,minmax(0,1fr))]"
    : "grid-cols-1 lg:grid-cols-[minmax(0,7.5rem)_repeat(4,minmax(0,1fr))]";

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-muted/30 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1400px]">
        {hasDbBackedUserId && needsHandle ? (
          <Card className="mb-8 border-border bg-card p-5 shadow-sm">
            <p className="mb-4 text-sm text-muted-foreground">
              Welcome to Lychee. Pick a unique handle to get started.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="connect-home-handle">Unique handle</Label>
                  <div className="relative">
                    <Input
                      id="connect-home-handle"
                      placeholder="misterrpink"
                      value={onboardingHandle}
                      onChange={onboardingHandleChange}
                      autoComplete="username"
                    />
                    {isCheckingHandle ? (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : null}
                  </div>
                  {onboardingHandleTaken ? (
                    <div className="text-xs text-destructive">This handle is already taken or reserved.</div>
                  ) : null}
                </div>
                <Button
                  type="button"
                  onClick={submitOnboardingHandle}
                  disabled={
                    onboardingSubmitBusy ||
                    isCheckingHandle ||
                    onboardingHandleTaken ||
                    String(onboardingHandle || "").trim().length < 3
                  }
                >
                  {onboardingSubmitBusy ? "Saving…" : "Save handle"}
                </Button>
              </div>
              <div>
                <div className="text-sm font-medium">Profile picture</div>
                <div className="mt-2">
                  <ProfilePictureUploader
                    userId={user.userId}
                    handle={String(onboardingHandle || "").trim() || userHandle}
                    name={user?.name}
                    currentSrc={profilePic}
                    onUpdated={(nextUrl) => setProfilePic?.(nextUrl)}
                    mode="onboarding"
                    registerUpload={setOnboardingUploadFn}
                  />
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        <h1 className="mb-10 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Hi, what do you want to discover?
        </h1>

        <div className={cn("grid gap-8 lg:gap-6", gridTemplate)}>
          <div className="lg:pt-1">
            <div className="text-sm font-semibold text-foreground">Connect data</div>
            <div className="mt-1 text-xs text-muted-foreground">Step 1</div>
          </div>

          <section className="min-w-0 space-y-2">
            <SectionTitle>Import</SectionTitle>
            <div className="flex flex-col gap-2">
              <MenuRow
                icon={<ArrowUpFromLine className="h-5 w-5" />}
                label="CSV / XLSX"
                description="Upload a spreadsheet to start analyzing."
                onClick={() => setViewing?.("upload")}
              />
              <MenuRow
                icon={<FileImage className="h-5 w-5" />}
                label="PDF & image"
                description="Opens upload — richer parsers are on the way."
                onClick={() => {
                  setViewing?.("upload");
                  toast.message("PDF and image parsing", {
                    description: "Use upload for now; dedicated flows are coming soon.",
                  });
                }}
              />
              <MenuRow
                icon={<Braces className="h-5 w-5" />}
                label="JSON"
                description="Opens upload for structured files."
                onClick={() => {
                  setViewing?.("upload");
                  toast.message("JSON upload", {
                    description: "Use CSV/XLSX today where possible; JSON workflows are expanding.",
                  });
                }}
              />
              <MenuRow
                icon={<FilePlus2 className="h-5 w-5" />}
                label="Start blank"
                description="Empty sheet — build from scratch."
                onClick={() => setViewing?.("newSheet")}
              />
            </div>
          </section>

          <section className="min-w-0 space-y-2">
            <SectionTitle>Integrations</SectionTitle>
            <div className="flex max-h-[min(70vh,520px)] flex-col gap-2 overflow-y-auto pr-1">
              {connectIntegrationRows.map((row) => (
                <div key={row.key}>
                  {row.warmConnect?.busy ? (
                    <div className="rounded-lg border border-border bg-card p-3">
                      <ConnectProgressWithLabel
                        label={row.warmConnect.label}
                        progress={row.warmConnect.progress}
                      />
                    </div>
                  ) : row.warmConnect?.error ? (
                    <div className="space-y-2 rounded-lg border border-destructive/30 bg-card p-3">
                      <p className="text-xs text-destructive">{row.warmConnect.error}</p>
                      <Button type="button" size="sm" variant="outline" onClick={() => row.warmConnect.start()}>
                        Try again
                      </Button>
                    </div>
                  ) : (
                    <MenuRow
                      icon={row.icon}
                      label={row.name}
                      description={row.description}
                      onClick={() => onIntegrationRowClick(row)}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="min-w-0 space-y-2">
            <SectionTitle>Prediction markets</SectionTitle>
            <div className="flex flex-col gap-2">
              {PREDICTION_TEMPLATES.map((t) => (
                <MenuRow
                  key={t.id}
                  icon={<LayoutTemplate className="h-5 w-5" />}
                  label={t.title}
                  description="Placeholder — templates ship later."
                  onClick={() => toast.info("Templates are not available yet.")}
                />
              ))}
            </div>
          </section>

          <section className="min-w-0 space-y-2">
            <SectionTitle>Guides</SectionTitle>
            <div className="flex flex-col gap-2">
              {CONNECT_HOME_GUIDES.map((g) => (
                <MenuLinkRow
                  key={g.slug}
                  href={`/guides/${g.slug}`}
                  icon={<Image src="/logo.png" alt="" width={20} height={20} className="rounded-sm object-cover" />}
                  label={g.title}
                  description={g.publishedAt ? `Published ${g.publishedAt}` : undefined}
                />
              ))}
              <MenuLinkRow
                href={EXAMPLE_DASHBOARD.href}
                external
                icon={<LayoutTemplate className="h-5 w-5" />}
                label={EXAMPLE_DASHBOARD.title}
                description="Public example dashboard"
              />
            </div>
          </section>

          {showLatestWork ? (
            <section className="min-w-0 space-y-2">
              <SectionTitle>Your latest work</SectionTitle>
              <div className="flex flex-col gap-2">
                {latestWork.map((ds) => {
                  const raw = ds?.last_saved_date || ds?.created_date;
                  const d = raw ? new Date(raw) : null;
                  const when =
                    d && !Number.isNaN(d.getTime())
                      ? d.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—";
                  return (
                    <MenuRow
                      key={String(ds._id)}
                      icon={<Clock className="h-5 w-5" />}
                      label={ds.data_set_name || "Untitled project"}
                      description={`Last edited ${when}`}
                      onClick={() => onOpenProject(ds._id)}
                      disabled={loadProjectBusy}
                    />
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
