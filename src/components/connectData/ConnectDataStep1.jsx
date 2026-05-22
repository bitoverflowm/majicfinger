"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpFromLine,
  Braces,
  BookOpen,
  ExternalLink,
  FileImage,
  FilePlus2,
  LayoutDashboard,
  LayoutTemplate,
  Loader2,
  Newspaper,
} from "lucide-react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { API_INTEGRATIONS, integrations_list } from "@/components/integrationsView/integrationsConfig";
import { ConnectProgressWithLabel } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/ConnectProgressWithLabel";
import { useBeckerHistoricalWarmIntegrationsConnect } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/useBeckerHistoricalWarmIntegrationsConnect";
import { runConnectProjectLoad } from "@/lib/connectProjectLoad";
import { CONNECT_HOME_GUIDES } from "@/lib/guidesConnectHomeManifest";
import {
  CONNECT_WORKSPACE,
  isConnectHubIntegrationAvailable,
} from "@/lib/connectHomeWorkspace";
import { deriveConnectFlowStep } from "@/lib/connectHomeFlow";
import {
  connectHubDemoColumnGridClass,
  connectHubLayoutClass,
  connectHubMainClass,
  connectHubPageClass,
} from "@/lib/connectHubLayout";
import { ConnectHomeFlowSteps } from "@/components/connectData/ConnectHomeFlowSteps";
import { debounce } from "@/lib/debounce";
import { isReservedUserHandle, reservedUserHandleMessage } from "@/lib/reservedUserHandles";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProfilePictureUploader } from "@/components/profile/ProfilePictureUploader";
import { useDemoProGate } from "@/hooks/useDemoProGate";

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

const PREDICTION_TEMPLATE_LABEL = "Fork Templates Coming Soon";

const PREDICTION_TEMPLATES = [{ id: "fork-templates" }];

/** Solid icon-tile backgrounds on Connect home (match Kalshi / Chainlink pill style). */
const CONNECT_INTEGRATION_ICON_BG = {
  kalshiHistorical: "bg-[#28CC95]",
  polymarket: "bg-[#2E5CFF]",
  polymarketHistorical: "bg-[#2E5CFF]",
  binance: "bg-black",
  chainlink: "bg-[#375BD2]",
  coinGecko: "bg-black",
  geckoDex: "bg-black",
  newsApi: "bg-zinc-800",
  productHunt: "bg-[#DA552F]",
};

function connectIntegrationIconClass(key) {
  const bg = CONNECT_INTEGRATION_ICON_BG[key];
  if (!bg) return undefined;
  return cn(bg, "text-white [&_svg]:text-white");
}

/** Lucide stroke — lighter, wireframe-like. */
const iconStroke = 1.75;

const iconSlotClass =
  "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/70 text-muted-foreground [&_svg]:shrink-0";

const pillClass = cn(
  "flex w-full min-h-[2.625rem] items-center gap-1 rounded-md border border-border/40 bg-card px-1 py-0.5 text-left",
  "text-xs font-light leading-none text-foreground transition-all duration-200",
  "hover:border-border hover:bg-muted/25 hover:shadow-md",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:pointer-events-none disabled:opacity-45",
);

const pillLabelClass = "min-w-0 flex-1 truncate";

const integrationsPillClass = cn(pillClass, "gap-2.5 pl-2 pr-2");

const demoPillClass = cn(
  pillClass,
  "min-h-[1.375rem] gap-0.5 px-0.5 py-0 text-[9px] leading-tight",
);
const demoIconSlotClass =
  "flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-muted/70 text-muted-foreground [&_svg]:shrink-0 [&_svg]:!h-2.5 [&_svg]:!w-2.5";
const demoIntegrationsPillClass = cn(demoPillClass, "gap-1 pl-0.5 pr-0.5");
const demoTemplatesPillClass = cn(demoPillClass, "min-h-[1.75rem] gap-1 px-1.5 py-1");
const demoTemplatesPillLabelClass =
  "min-w-0 flex-1 text-left text-[9px] font-light leading-snug line-clamp-2 whitespace-normal";
const demoPillLabelClass = "min-w-0 flex-1 truncate text-[9px] leading-tight";
const demoIconSizeClass = "h-2.5 w-2.5";

const latestWorkPillClass = cn(integrationsPillClass, "w-auto max-w-[20rem] shrink-0");

const latestWorkWhenClass =
  "shrink-0 whitespace-nowrap px-1 text-[10px] font-light tabular-nums leading-none text-muted-foreground";

function formatLatestWorkWhen(raw) {
  const d = raw ? new Date(raw) : null;
  if (!d || Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function ConnectPillTooltip({ content, side = "right", fullWidth = true, children }) {
  const text = typeof content === "string" ? content.trim() : "";
  if (!text) return children;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(fullWidth ? "inline-flex w-full min-w-0" : "inline-flex max-w-full")}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-pretty">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function LatestWorkPill({ label, when, title, onClick, disabled }) {
  return (
    <ConnectPillTooltip content={title || label} fullWidth={false}>
      <button type="button" disabled={disabled} onClick={onClick} className={latestWorkPillClass}>
        <span className={latestWorkWhenClass}>{when}</span>
        <span className={pillLabelClass}>{label}</span>
      </button>
    </ConnectPillTooltip>
  );
}

function LatestWorkSkeleton() {
  return <Skeleton className="h-[2.625rem] w-[12rem] shrink-0 rounded-md sm:w-[14rem]" />;
}

const templatesPillClass = cn(
  pillClass,
  "min-h-[2.75rem] gap-2.5 px-3 py-2",
);

const templatesPillLabelClass = "min-w-0 flex-1 text-left text-xs font-light leading-snug line-clamp-2 whitespace-normal";

/** Connect hub (non-demo): scale pills/icons down so three columns stay one row; widen again on 2xl. */
const connectHubIconSlotResponsive = cn(
  iconSlotClass,
  "h-5 w-5 md:h-6 md:w-6 lg:h-6 lg:w-6 xl:h-7 xl:w-7",
);
const connectHubPillScaleExtra = cn(
  "min-h-[2rem] gap-0.5 px-0.5 py-0 text-[10px] leading-tight sm:min-h-[2.125rem] sm:text-[10.5px] md:min-h-[2.25rem] md:text-[11px] lg:min-h-[2.375rem] lg:text-xs xl:min-h-[2.5rem] xl:px-1 2xl:min-h-[2.625rem]",
);
const connectHubIntegrationPillScaleExtra = cn(
  "min-h-[2rem] gap-1.5 px-1 py-0 text-[10px] leading-tight sm:min-h-[2.125rem] sm:gap-2 sm:px-1.5 sm:text-[10.5px] md:min-h-[2.25rem] md:text-[11px] lg:min-h-[2.375rem] lg:text-[11px] xl:min-h-[2.5rem] xl:gap-2.5 xl:px-2 xl:text-xs 2xl:min-h-[2.625rem]",
);
const connectHubPillLabelScale = cn(
  pillLabelClass,
  "text-[10px] leading-tight sm:text-[10.5px] md:text-[11px] lg:text-xs lg:leading-none",
);
const connectHubIntegrationLogoClass =
  "[&_.integration-logo-avatar]:!h-5 [&_.integration-logo-avatar]:!w-5 md:[&_.integration-logo-avatar]:!h-6 md:[&_.integration-logo-avatar]:!w-6 xl:[&_.integration-logo-avatar]:!h-7 xl:[&_.integration-logo-avatar]:!w-7";
const connectHubWideTemplatesScaleExtra = cn(
  "min-h-[2.25rem] gap-2 px-2 py-1.5 sm:min-h-[2.375rem] lg:min-h-[2.5rem] xl:min-h-[2.75rem] xl:px-3 xl:py-2",
);
const connectHubWideLabelScaleExtra = cn(
  "text-[10px] leading-snug sm:text-[10.5px] md:text-[11px] lg:text-xs",
);
const connectHubSectionTitleClass =
  "mb-2 text-[9px] tracking-[0.12em] sm:mb-2.5 sm:text-[9.5px] md:mb-3 md:text-[10px] lg:mb-3 lg:text-[10.5px] xl:mb-4 xl:text-[11px]";
const connectHubIconGlyphClass = "h-3 w-3 shrink-0 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 lg:h-3.5 lg:w-3.5";
const connectHubColGapClass = "gap-5 sm:gap-6 lg:gap-6 xl:gap-8";

function IntegrationIconWrap({ children, compact = false, className }) {
  return (
    <span
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden",
        compact
          ? "[&_.integration-logo-avatar]:!h-4 [&_.integration-logo-avatar]:!w-4 [&_.integration-logo-avatar]:!rounded-[4px] [&_.integration-logo-avatar]:!bg-transparent [&_.integration-logo-avatar]:shadow-none"
          : "[&_.integration-logo-avatar]:!h-7 [&_.integration-logo-avatar]:!w-7 [&_.integration-logo-avatar]:!rounded-md [&_.integration-logo-avatar]:!bg-transparent [&_.integration-logo-avatar]:shadow-none",
        className,
      )}
    >
      {children}
    </span>
  );
}

function PillButton({
  icon,
  label,
  title,
  onClick,
  disabled,
  iconClassName,
  iconSlotClassName,
  labelClassName,
  className,
  tooltipSide,
  compact = false,
}) {
  const surface = compact ? cn(demoPillClass, className) : cn(pillClass, className);
  const iconBox = compact
    ? cn(demoIconSlotClass, iconClassName)
    : cn(iconSlotClassName || iconSlotClass, iconClassName);
  const labelCls = compact ? demoPillLabelClass : cn(pillLabelClass, labelClassName);
  return (
    <ConnectPillTooltip content={title || label} side={tooltipSide}>
      <button type="button" disabled={disabled} onClick={onClick} className={surface}>
        <span className={iconBox}>{icon}</span>
        <span className={labelCls}>{label}</span>
      </button>
    </ConnectPillTooltip>
  );
}

function DemoTierBadges() {
  return (
    <span className="ml-auto flex shrink-0 flex-col items-end gap-0.5 leading-none">
      <span className="rounded border border-primary/35 bg-primary/10 px-1 py-px text-[7px] font-semibold uppercase tracking-wider text-primary">
        Pro
      </span>
      <span className="rounded border border-border/60 bg-muted/70 px-1 py-px text-[7px] font-medium uppercase tracking-wide text-muted-foreground">
        Lifetime
      </span>
      <span className="rounded border border-border/50 px-1 py-px text-[7px] font-medium uppercase tracking-wide text-muted-foreground/90">
        Coming soon
      </span>
    </span>
  );
}

function PillButtonSoon({
  icon,
  label,
  className,
  iconClassName,
  iconSlotClassName,
  labelClassName,
  tooltip = "Pro & Lifetime — coming soon",
  compact = false,
  showDemoTierBadges = false,
}) {
  const surface = compact
    ? cn(demoPillClass, className, "cursor-not-allowed opacity-45", showDemoTierBadges && "justify-between gap-1 pr-1")
    : cn(pillClass, className, "cursor-not-allowed opacity-45", showDemoTierBadges && "justify-between gap-2 pr-1.5");
  const iconBox = compact
    ? cn(demoIconSlotClass, iconClassName)
    : cn(iconSlotClassName || iconSlotClass, iconClassName);
  const labelCls = compact
    ? cn(demoPillLabelClass, showDemoTierBadges && "min-w-0 flex-1")
    : cn(pillLabelClass, labelClassName, showDemoTierBadges && "min-w-0 flex-1");
  return (
    <ConnectPillTooltip content={tooltip}>
      <button type="button" disabled className={surface} aria-disabled>
        <span className={iconBox}>{icon}</span>
        <span className={labelCls}>{label}</span>
        {showDemoTierBadges ? <DemoTierBadges /> : null}
      </button>
    </ConnectPillTooltip>
  );
}

function PillLink({
  href,
  external,
  icon,
  label,
  title,
  iconClassName,
  iconSlotClassName,
  labelClassName,
  externalIconClassName,
  wide = false,
  tooltipSide,
  compact = false,
  className,
}) {
  const surfaceClass = wide
    ? compact
      ? demoTemplatesPillClass
      : cn(templatesPillClass, className)
    : compact
      ? cn(demoPillClass, className)
      : cn(pillClass, className);
  const labelClass = wide
    ? compact
      ? demoTemplatesPillLabelClass
      : cn(templatesPillLabelClass, labelClassName)
    : compact
      ? demoPillLabelClass
      : cn(pillLabelClass, labelClassName);
  const iconBox = compact ? cn(demoIconSlotClass, iconClassName) : cn(iconSlotClassName || iconSlotClass, iconClassName);
  const body = (
    <>
      <span className={iconBox}>{icon}</span>
      <span className={labelClass}>{label}</span>
      {external ? (
        <ExternalLink
          className={cn(
            "shrink-0 text-muted-foreground",
            externalIconClassName || (compact ? "h-3 w-3" : "h-3.5 w-3.5"),
          )}
          strokeWidth={iconStroke}
          aria-hidden
        />
      ) : null}
    </>
  );
  const link = external ? (
    <a href={href} target="_blank" rel="noreferrer" className={surfaceClass}>
      {body}
    </a>
  ) : (
    <Link href={href} className={surfaceClass}>
      {body}
    </Link>
  );

  return (
    <ConnectPillTooltip content={title || label} side={tooltipSide}>
      {link}
    </ConnectPillTooltip>
  );
}

function PillButtonWide({ icon, label, title, onClick, disabled, iconClassName, iconSlotClassName, labelClassName, tooltipSide, compact = false, className }) {
  const surface = compact ? demoTemplatesPillClass : cn(templatesPillClass, className);
  const iconBox = compact ? cn(demoIconSlotClass, iconClassName) : cn(iconSlotClassName || iconSlotClass, iconClassName);
  const labelClass = compact ? demoTemplatesPillLabelClass : cn(templatesPillLabelClass, labelClassName);
  return (
    <ConnectPillTooltip content={title || label} side={tooltipSide}>
      <button type="button" disabled={disabled} onClick={onClick} className={surface}>
        <span className={iconBox}>{icon}</span>
        <span className={labelClass}>{label}</span>
      </button>
    </ConnectPillTooltip>
  );
}

function SectionTitle({ children, compact = false, className }) {
  return (
    <h2
      className={cn(
        "font-medium uppercase tracking-[0.14em] text-muted-foreground",
        compact ? "mb-1 text-[8px] tracking-[0.12em]" : "mb-3 text-[11px] md:mb-4",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export default function ConnectDataStep1({
  user,
  userProfileFetchOk = false,
  onActivateWorkspace,
  embeddedInShell = false,
  embeddedDemo = false,
}) {
  const context = useMyStateV2();
  const viewing = context?.viewing;
  const dataConnected = context?.dataConnected;
  const connectedData = context?.connectedData;
  const dataSheets = context?.dataSheets;
  const rightPanelTab = context?.rightPanelTab;
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
  const loadedDataMeta = context?.loadedDataMeta;
  const setLoadedDataMeta = context?.setLoadedDataMeta;
  const setLoadedDataId = context?.setLoadedDataId;
  const setConnectProjectLoadState = context?.setConnectProjectLoadState;
  const connectProjectLoadState = context?.connectProjectLoadState ?? {};
  const setSavedCharts = context?.setSavedCharts;
  const setChartSheets = context?.setChartSheets;
  const setActiveChartSheetId = context?.setActiveChartSheetId;
  const setLoadedChartMeta = context?.setLoadedChartMeta;
  const setLoadedChartBuilderSnapshot = context?.setLoadedChartBuilderSnapshot;
  const setRefetchChartDashboardsTick = context?.setRefetchChartDashboardsTick;
  const requestConnectWorkspace = context?.requestConnectWorkspace;
  const setConnectHomeAnalyzeActive = context?.setConnectHomeAnalyzeActive;
  const requestConnectAnalyzeScroll = context?.requestConnectAnalyzeScroll;

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
  const loadProjectBusy = !!connectProjectLoadState.loading;
  const { dialog: demoProDialog } = useDemoProGate();

  const openConnectIntegration = useCallback(
    (integrationId) => {
      if (!API_INTEGRATIONS.includes(integrationId)) return;
      setConnectedData?.([]);
      setConnectedCols?.([]);
      setIntegrationSidebar?.(integrationId);
      setRightPanelTab?.("integrations");
      if (onActivateWorkspace) {
        // Connect home shell: mount workspace, then scroll to integration query builder.
        setRightPanelOpen?.(false);
        onActivateWorkspace(integrationId);
      } else {
        setRightPanelOpen?.(true);
        requestConnectWorkspace?.(integrationId);
        setViewing?.("dataStart");
      }
    },
    [
      onActivateWorkspace,
      requestConnectWorkspace,
      setConnectedCols,
      setConnectedData,
      setIntegrationSidebar,
      setRightPanelOpen,
      setRightPanelTab,
      setViewing,
    ],
  );

  const navigatePolymarketHistorical = useCallback(() => {
    openConnectIntegration("polymarketHistorical");
  }, [openConnectIntegration]);

  const polymarketHistoricalConnect = useBeckerHistoricalWarmIntegrationsConnect(navigatePolymarketHistorical);

  const navigateKalshiHistorical = useCallback(() => {
    openConnectIntegration("kalshiHistorical");
  }, [openConnectIntegration]);

  const kalshiHistoricalConnect = useBeckerHistoricalWarmIntegrationsConnect(navigateKalshiHistorical);

  const openIntegrationPlayground = useCallback(
    (clickHandlerId) => {
      if (!API_INTEGRATIONS.includes(clickHandlerId)) {
        toast.info("This integration is not wired up yet.");
        return;
      }
      openConnectIntegration(clickHandlerId);
    },
    [openConnectIntegration],
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

  const latestWorkLoading = hasDbBackedUserId && savedDataSets === undefined;

  const latestWork = useMemo(() => {
    const list = Array.isArray(savedDataSets) ? savedDataSets : [];
    const sorted = [...list].sort((a, b) => {
      const ta = new Date(a?.last_saved_date || a?.created_date || 0).getTime();
      const tb = new Date(b?.last_saved_date || b?.created_date || 0).getTime();
      return tb - ta;
    });
    return sorted.slice(0, 3);
  }, [savedDataSets]);

  const showLatestWork = hasDbBackedUserId && (latestWorkLoading || latestWork.length > 0);

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
    if (!dataSetId || loadProjectBusy || !hasDbBackedUserId || !setConnectProjectLoadState) return;
    const ds = (Array.isArray(savedDataSets) ? savedDataSets : []).find(
      (row) => String(row?._id) === String(dataSetId),
    );
    try {
      await runConnectProjectLoad({
        dataSetId,
        userId: user.userId,
        projectName: ds?.data_set_name || "",
        loadedDataMeta,
        setConnectProjectLoadState,
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
        setViewing,
        requestConnectWorkspace,
        setConnectHomeAnalyzeActive,
        requestConnectAnalyzeScroll,
        setRightPanelTab,
        setRightPanelOpen,
      });
      toast.success("Project opened");
    } catch (e) {
      toast.error(e?.message || "Failed to load project");
    }
  };

  const onIntegrationRowClick = (row) => {
    if (!isConnectHubIntegrationAvailable(row)) return;
    if (row.warmConnect) {
      if (row.warmConnect.busy) return;
      row.warmConnect.start();
      return;
    }
    if (row.clickHandler) {
      openIntegrationPlayground(row.clickHandler);
    }
  };

  const columnGridClass = embeddedDemo
    ? connectHubDemoColumnGridClass
    : cn(
        "grid w-full min-w-0 grid-cols-1 gap-y-4",
        "max-sm:gap-y-4 sm:grid-cols-2 sm:gap-x-2 sm:gap-y-2 lg:grid-cols-3 lg:gap-x-2 lg:gap-y-1 xl:gap-x-4 2xl:gap-x-8",
      );

  const hubPageClass = connectHubPageClass(embeddedInShell);
  const hubLayoutClass = embeddedDemo
    ? "w-full min-w-0"
    : connectHubLayoutClass({ includeStepRail: !embeddedInShell });

  const integrationsColClass = embeddedDemo ? "flex flex-col gap-3" : "flex flex-col gap-2 sm:gap-2.5 lg:gap-3";

  const activate = onActivateWorkspace || requestConnectWorkspace;

  const connectFlowStep = useMemo(
    () =>
      deriveConnectFlowStep({
        viewing,
        dataConnected,
        connectedData,
        dataSheets,
        rightPanelTab,
        connectHomeCenterView: context?.connectHomeCenterView,
      }),
    [viewing, dataConnected, connectedData, dataSheets, rightPanelTab, context?.connectHomeCenterView],
  );

  const hubGlyphClass = embeddedDemo ? "h-3.5 w-3.5" : connectHubIconGlyphClass;
  const hubIntegrationSurfaceClass = embeddedDemo
    ? integrationsPillClass
    : cn(integrationsPillClass, connectHubIntegrationPillScaleExtra);

  return (
    <TooltipProvider delayDuration={200}>
    <div
      data-test="onboarding-container"
      className={cn(
        embeddedInShell
          ? "bg-transparent"
          : "min-h-0 flex-1 overflow-auto bg-gradient-to-b from-muted/20 via-background to-background pt-16",
      )}
    >
      <div className={embeddedInShell ? "w-full min-w-0" : hubPageClass}>
        {showHandleSetup ? (
          <Card className="mb-14 w-full max-w-2xl rounded-2xl border-border/60 bg-card/95 p-6 shadow-sm sm:mb-16 sm:p-8 md:mb-20">
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

        <div className={hubLayoutClass}>
          {showLatestWork ? (
            <section
              className={cn(
                "mb-8 w-full sm:mb-10",
                embeddedInShell ? "min-w-0" : connectHubMainClass,
              )}
            >
              <SectionTitle>Your latest work</SectionTitle>
              <div className="flex flex-wrap gap-3">
                  {latestWorkLoading
                    ? Array.from({ length: 3 }, (_, i) => <LatestWorkSkeleton key={i} />)
                    : latestWork.map((ds) => {
                        const when = formatLatestWorkWhen(ds?.last_saved_date || ds?.created_date);
                        return (
                          <LatestWorkPill
                            key={String(ds._id)}
                            when={when}
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

          {!embeddedInShell ? (
            <ConnectHomeFlowSteps
              currentStep={connectFlowStep}
              sticky
              className={cn(
                "hidden shrink-0 self-start md:-ml-0.5 md:block",
                showLatestWork ? "md:row-start-2" : "md:row-start-1",
              )}
            />
          ) : null}

          <div
            className={cn(
              embeddedInShell ? "min-w-0 w-full max-w-none" : connectHubMainClass,
              showLatestWork && !embeddedInShell ? "md:row-start-2" : !embeddedInShell ? "md:row-start-1" : null,
            )}
          >
            <h1
              className={cn(
                "text-balance text-left font-semibold tracking-tight text-foreground",
                embeddedDemo ? "text-xl" : "text-base sm:text-lg md:text-xl xl:text-2xl",
              )}
            >
              Hi, what do you want to discover?
            </h1>

            <div className={cn("mt-12 w-full sm:mt-14 md:mt-16", columnGridClass)}>
          <section className="min-w-0 overflow-hidden">
            <SectionTitle className={embeddedDemo ? undefined : connectHubSectionTitleClass}>Import</SectionTitle>
            <div className={integrationsColClass}>
              <PillButton
                icon={<ArrowUpFromLine className={hubGlyphClass} strokeWidth={iconStroke} />}
                label="CSV / XLSX"
                title="Upload a spreadsheet to start analyzing."
                onClick={() => activate?.(CONNECT_WORKSPACE.UPLOAD)}
                className={embeddedDemo ? undefined : connectHubPillScaleExtra}
                iconSlotClassName={embeddedDemo ? undefined : connectHubIconSlotResponsive}
                labelClassName={embeddedDemo ? undefined : connectHubPillLabelScale}
              />
              <PillButtonSoon
                icon={<FileImage className={hubGlyphClass} strokeWidth={iconStroke} />}
                label="PDF & image"
                showDemoTierBadges={embeddedDemo}
                className={embeddedDemo ? undefined : connectHubPillScaleExtra}
                iconSlotClassName={embeddedDemo ? undefined : connectHubIconSlotResponsive}
                labelClassName={embeddedDemo ? undefined : connectHubPillLabelScale}
              />
              <PillButtonSoon
                icon={<Braces className={hubGlyphClass} strokeWidth={iconStroke} />}
                label="JSON"
                showDemoTierBadges={embeddedDemo}
                className={embeddedDemo ? undefined : connectHubPillScaleExtra}
                iconSlotClassName={embeddedDemo ? undefined : connectHubIconSlotResponsive}
                labelClassName={embeddedDemo ? undefined : connectHubPillLabelScale}
              />
              <PillButton
                icon={<FilePlus2 className={hubGlyphClass} strokeWidth={iconStroke} />}
                label="Start from blank"
                title="Empty sheet — build from scratch."
                onClick={() => activate?.(CONNECT_WORKSPACE.BLANK)}
                className={embeddedDemo ? undefined : connectHubPillScaleExtra}
                iconSlotClassName={embeddedDemo ? undefined : connectHubIconSlotResponsive}
                labelClassName={embeddedDemo ? undefined : connectHubPillLabelScale}
              />
            </div>
          </section>

          <section className="min-w-0 overflow-hidden">
            <SectionTitle className={embeddedDemo ? undefined : connectHubSectionTitleClass}>Integrations</SectionTitle>
            <div className={integrationsColClass}>
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
                  ) : isConnectHubIntegrationAvailable(row) ? (
                    <PillButton
                      className={hubIntegrationSurfaceClass}
                      icon={
                        <IntegrationIconWrap className={embeddedDemo ? undefined : connectHubIntegrationLogoClass}>
                          {row.icon}
                        </IntegrationIconWrap>
                      }
                      label={row.name}
                      title={row.description}
                      onClick={() => onIntegrationRowClick(row)}
                      iconClassName={connectIntegrationIconClass(row.key)}
                      iconSlotClassName={embeddedDemo ? undefined : connectHubIconSlotResponsive}
                      labelClassName={embeddedDemo ? undefined : connectHubPillLabelScale}
                    />
                  ) : (
                    <PillButtonSoon
                      className={hubIntegrationSurfaceClass}
                      icon={
                        <IntegrationIconWrap className={embeddedDemo ? undefined : connectHubIntegrationLogoClass}>
                          {row.icon}
                        </IntegrationIconWrap>
                      }
                      label={row.name}
                      showDemoTierBadges={embeddedDemo}
                      iconClassName={connectIntegrationIconClass(row.key)}
                      iconSlotClassName={embeddedDemo ? undefined : connectHubIconSlotResponsive}
                      labelClassName={embeddedDemo ? undefined : connectHubPillLabelScale}
                    />
                  )}
                </div>
              ))}
              <ConnectPillTooltip content="Browse all integrations">
                <button
                  type="button"
                  onClick={() => activate?.(CONNECT_WORKSPACE.INTEGRATIONS_PICKER)}
                  className={cn(
                    hubIntegrationSurfaceClass,
                    "justify-center border-dashed text-muted-foreground hover:border-border hover:bg-muted/20 hover:text-foreground",
                  )}
                >
                  + more
                </button>
              </ConnectPillTooltip>
            </div>
          </section>

          {!embeddedDemo ? (
          <section className="hidden min-w-0 overflow-hidden lg:block lg:min-w-0">
            <div className={cn("flex flex-col", connectHubColGapClass)}>
              <div>
                <SectionTitle className={connectHubSectionTitleClass}>Dashboards</SectionTitle>
                <div className={integrationsColClass}>
                  <PillLink
                    href={EXAMPLE_DASHBOARD.href}
                    external
                    wide
                    className={connectHubWideTemplatesScaleExtra}
                    labelClassName={connectHubWideLabelScaleExtra}
                    iconSlotClassName={connectHubIconSlotResponsive}
                    externalIconClassName="h-3 w-3 lg:h-3.5 lg:w-3.5"
                    icon={<LayoutDashboard className={connectHubIconGlyphClass} strokeWidth={iconStroke} />}
                    label={EXAMPLE_DASHBOARD.title}
                    title="Public example dashboard"
                  />
                </div>
              </div>
              <div>
                <SectionTitle className={connectHubSectionTitleClass}>Guides</SectionTitle>
                <div className={integrationsColClass}>
                  {CONNECT_HOME_GUIDES.slice(0, 5).map((g) => (
                    <PillLink
                      key={g.slug}
                      href={`/guides/${g.slug}`}
                      wide
                      className={connectHubWideTemplatesScaleExtra}
                      labelClassName={connectHubWideLabelScaleExtra}
                      iconSlotClassName={connectHubIconSlotResponsive}
                      icon={<BookOpen className={connectHubIconGlyphClass} strokeWidth={iconStroke} />}
                      label={g.title}
                      title={g.publishedAt ? `${g.title} — published ${g.publishedAt}` : g.title}
                    />
                  ))}
                </div>
              </div>
              <div>
                <SectionTitle className={connectHubSectionTitleClass}>Templates</SectionTitle>
                <div className={integrationsColClass}>
                  {PREDICTION_TEMPLATES.map((t) => (
                    <PillButtonWide
                      key={t.id}
                      className={connectHubWideTemplatesScaleExtra}
                      iconSlotClassName={connectHubIconSlotResponsive}
                      labelClassName={connectHubWideLabelScaleExtra}
                      icon={<LayoutTemplate className={connectHubIconGlyphClass} strokeWidth={iconStroke} />}
                      label={PREDICTION_TEMPLATE_LABEL}
                      title={PREDICTION_TEMPLATE_LABEL}
                      disabled
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
          ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
      {demoProDialog}
    </TooltipProvider>
  );
}
