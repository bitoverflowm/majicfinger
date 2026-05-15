"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowUpFromLine,
  Braces,
  Clock,
  ExternalLink,
  FileImage,
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

/** Lucide stroke — lighter, wireframe-like. */
const iconStroke = 1.75;

const iconSlotClass =
  "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted/70 text-muted-foreground [&_svg]:shrink-0";

const pillClass = cn(
  "flex w-full min-h-[2.625rem] items-center gap-2.5 rounded-full border border-border/80 bg-card px-4 py-2.5 text-left",
  "text-sm font-medium leading-none text-foreground shadow-sm transition-all duration-200",
  "hover:border-border hover:bg-muted/25 hover:shadow-md",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:pointer-events-none disabled:opacity-45",
);

const pillLabelClass = "min-w-0 flex-1 truncate";

function IntegrationIconWrap({ children }) {
  return (
    <span className="flex h-full w-full items-center justify-center overflow-hidden [&_.integration-logo-avatar]:!h-7 [&_.integration-logo-avatar]:!w-7 [&_.integration-logo-avatar]:shadow-none">
      {children}
    </span>
  );
}

function PillButton({ icon, label, title, onClick, disabled }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} title={title || label} className={pillClass}>
      <span className={iconSlotClass}>{icon}</span>
      <span className={pillLabelClass}>{label}</span>
    </button>
  );
}

function PillLink({ href, external, icon, label, title }) {
  const body = (
    <>
      <span className={iconSlotClass}>{icon}</span>
      <span className={pillLabelClass}>{label}</span>
      {external ? (
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={iconStroke} aria-hidden />
      ) : null}
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" title={title || label} className={pillClass}>
        {body}
      </a>
    );
  }
  return (
    <Link href={href} title={title || label} className={pillClass}>
      {body}
    </Link>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:mb-4">{children}</h2>
  );
}

export default function ConnectDataStep1({ user, userProfileFetchOk = false }) {
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
  const showHandleSetup = hasDbBackedUserId && userProfileFetchOk && needsHandle;

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
          icon: <Newspaper className="h-3.5 w-3.5" strokeWidth={iconStroke} />,
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

  const columnGridClass = cn(
    "grid gap-y-3",
    showLatestWork
      ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 xl:gap-x-12 2xl:gap-x-16"
      : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 xl:gap-x-12 2xl:gap-x-16",
  );

  const scrollColClass =
    "flex max-h-[min(52vh,26rem)] flex-col gap-3 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground)/0.35)_transparent]";

  return (
    <div
      data-test="onboarding-container"
      className="min-h-0 flex-1 overflow-auto bg-gradient-to-b from-muted/20 via-background to-background"
    >
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-12 sm:px-10 sm:pb-24 sm:pt-16 md:px-12 md:pt-20 lg:max-w-7xl">
        {showHandleSetup ? (
          <Card className="mx-auto mb-14 max-w-2xl rounded-2xl border-border/60 bg-card/95 p-6 shadow-sm sm:mb-16 sm:p-8 md:mb-20">
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              Welcome to Lychee. Pick a unique handle to get started.
            </p>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="connect-home-handle" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Unique handle
                  </Label>
                  <div className="relative">
                    <Input
                      id="connect-home-handle"
                      placeholder="misterrpink"
                      value={onboardingHandle}
                      onChange={onboardingHandleChange}
                      autoComplete="username"
                      className="h-11 rounded-xl border-border/80 bg-background"
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
                  className="rounded-full px-6"
                >
                  {onboardingSubmitBusy ? "Saving…" : "Save handle"}
                </Button>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Profile picture</div>
                <div className="mt-3">
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

        <div className="mx-auto max-w-3xl">
          <h1 className="pt-12 text-balance text-xl font-semibold tracking-tight text-foreground text-xl">
            Hi, what do you want to discover?
          </h1>
        </div>

        <div className={cn("mx-auto mt-12 max-w-6xl sm:mt-14 md:mt-16 lg:max-w-7xl", columnGridClass)}>
          <section className="min-w-0">
            <SectionTitle>Import</SectionTitle>
            <div className="flex flex-col gap-3">
              <PillButton
                icon={<ArrowUpFromLine className="h-3.5 w-3.5" strokeWidth={iconStroke} />}
                label="CSV / XLSX"
                title="Upload a spreadsheet to start analyzing."
                onClick={() => setViewing?.("upload")}
              />
              <PillButton
                icon={<FileImage className="h-3.5 w-3.5" strokeWidth={iconStroke} />}
                label="PDF & image"
                title="Opens upload — richer parsers are on the way."
                onClick={() => {
                  setViewing?.("upload");
                  toast.message("PDF and image parsing", {
                    description: "Use upload for now; dedicated flows are coming soon.",
                  });
                }}
              />
              <PillButton
                icon={<Braces className="h-3.5 w-3.5" strokeWidth={iconStroke} />}
                label="JSON"
                title="Opens upload for structured files."
                onClick={() => {
                  setViewing?.("upload");
                  toast.message("JSON upload", {
                    description: "Use CSV/XLSX today where possible; JSON workflows are expanding.",
                  });
                }}
              />
              <PillButton
                icon={<LayoutTemplate className="h-3.5 w-3.5" strokeWidth={iconStroke} />}
                label="Integrations"
                title="Browse the full integrations library."
                onClick={() => setViewing?.("integrations")}
              />
            </div>
          </section>

          <section className="min-w-0">
            <SectionTitle>Integrations</SectionTitle>
            <div className={scrollColClass}>
              {connectIntegrationRows.map((row) => (
                <div key={row.key}>
                  {row.warmConnect?.busy ? (
                    <div className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
                      <ConnectProgressWithLabel
                        label={row.warmConnect.label}
                        progress={row.warmConnect.progress}
                      />
                    </div>
                  ) : row.warmConnect?.error ? (
                    <div className="space-y-3 rounded-2xl border border-destructive/25 bg-card/90 p-4 shadow-sm">
                      <p className="text-xs leading-relaxed text-destructive">{row.warmConnect.error}</p>
                      <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => row.warmConnect.start()}>
                        Try again
                      </Button>
                    </div>
                  ) : (
                    <PillButton
                      icon={
                        row.key === "newsApi" ? (
                          row.icon
                        ) : (
                          <IntegrationIconWrap>{row.icon}</IntegrationIconWrap>
                        )
                      }
                      label={row.name}
                      title={row.description}
                      onClick={() => onIntegrationRowClick(row)}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="min-w-0">
            <SectionTitle>Prediction markets</SectionTitle>
            <div className="flex flex-col gap-3">
              {PREDICTION_TEMPLATES.map((t) => (
                <PillButton
                  key={t.id}
                  icon={<LayoutTemplate className="h-3.5 w-3.5" strokeWidth={iconStroke} />}
                  label={t.title}
                  title="Placeholder — templates ship later."
                  onClick={() => toast.info("Templates are not available yet.")}
                />
              ))}
            </div>
          </section>

          <section className="min-w-0">
            <SectionTitle>Guides</SectionTitle>
            <div className={scrollColClass}>
              {CONNECT_HOME_GUIDES.map((g) => (
                <PillLink
                  key={g.slug}
                  href={`/guides/${g.slug}`}
                  icon={<Image src="/logo.png" alt="" width={14} height={14} className="rounded-sm object-cover opacity-90" />}
                  label={g.title}
                  title={g.publishedAt ? `${g.title} — published ${g.publishedAt}` : g.title}
                />
              ))}
              <PillLink
                href={EXAMPLE_DASHBOARD.href}
                external
                icon={<LayoutTemplate className="h-3.5 w-3.5" strokeWidth={iconStroke} />}
                label={EXAMPLE_DASHBOARD.title}
                title="Public example dashboard"
              />
            </div>
          </section>

          {showLatestWork ? (
            <section className="min-w-0">
              <SectionTitle>Your latest work</SectionTitle>
              <div className="flex flex-col gap-3">
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
                    <PillButton
                      key={String(ds._id)}
                      icon={<Clock className="h-3.5 w-3.5" strokeWidth={iconStroke} />}
                      label={ds.data_set_name || "Untitled project"}
                      title={`Last edited ${when}`}
                      onClick={() => onOpenProject(ds._id)}
                      disabled={loadProjectBusy}
                    />
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        <div className="mx-auto mt-12 flex max-w-3xl justify-center sm:mt-14 md:mt-16">
          <button
            type="button"
            onClick={() => setViewing?.("newSheet")}
            className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>Start from blank</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={iconStroke} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
