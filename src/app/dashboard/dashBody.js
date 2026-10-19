import { useEffect, useState, useCallback, useRef, useLayoutEffect } from "react";

import { useMyStateV2  } from '@/context/stateContextV2'

import Nav from './components/nav'
import DataSheetWithIntegration from "@/components/dataView/dataSheetWithIntegration";
import IntegrationsView from "@/components/integrationsView";
import ConnectHomeShell from "@/components/connectData/ConnectHomeShell";
import { CONNECT_WORKSPACE } from "@/lib/connectHomeWorkspace";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

import AiView from "@/components/aiView";
import ScraperView from "@/components/scraperView";
import ComingSoon from "./components/comingSoon";
import EasyLychee from "@/components/easyLychee";
import { Separator } from "@/components/ui/separator";
import { ProfilePictureUploader } from "@/components/profile/ProfilePictureUploader";
import CheckoutWelcome, { takeCheckoutWelcome, workspaceWelcomePending } from "@/components/checkout/CheckoutWelcome";
import { loadWorkspaceStartTabs } from "@/lib/workspaceStartTabs";
import { membershipTierLabel } from "@/lib/membershipLabel";

import { WorkspaceComposerDockProvider } from "@/components/dashboardComposer/workspaceComposerDock";
import { WorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { WorkspaceWelcomeLayer } from "@/components/dashboardComposer/blankDashboardEmpty";
import { IntegrationConnectLandingDemo } from "@/components/dashboardComposer/integrationConnectDialog";
import FigmaNavChrome from "./components/figmaNavChrome";
import { cn } from "@/lib/utils";

import { debounce } from "@/lib/debounce";
import { isReservedUserHandle, reservedUserHandleMessage } from "@/lib/reservedUserHandles";
import { userHasDashboardAccess } from "@/lib/membershipAccess";
import {
  userRunYourselfInteractiveUnlocked,
} from "@/lib/runYourself/hasPaidAccess";
import { consumeRunYourselfInteractiveSession } from "@/lib/runYourself/consumeInteractiveSession";
import BillingView from "@/components/billing/BillingView";
import { MembershipGate } from "./membershipGate";
import { OPEN_BILLING_EVENT } from "@/lib/scrollToPricing";

/** Views that show the billing screen (plans, current tier, upgrade/downgrade). */
const BILLING_VIEWS = new Set(["manageAccount", "pricing"]);

function freeRunRequestedInUrl() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("runYourselfSession") === "1";
}

const DashBody = ({ user }) => {
    const contextStateV2 = useMyStateV2()
    const isDemo = contextStateV2?.isDemo
    const setViewing = contextStateV2?.setViewing
    const requestConnectWorkspace = contextStateV2?.requestConnectWorkspace

    const viewing = contextStateV2?.viewing
    const navChromeExpanded = !!contextStateV2?.navChromeExpanded
    const rightPanelOpen = contextStateV2?.rightPanelOpen
    //const savedDataSets = contextStateV2?.savedDataSets
    const setSavedDataSets = contextStateV2?.setSavedDataSets
    const setSavedCharts = contextStateV2?.setSavedCharts
    const setSavedPresentations = contextStateV2?.setSavedPresentations
    const setSavedChartDashboards = contextStateV2?.setSavedChartDashboards
    
    const refetchData = contextStateV2?.refetchData
    const setRefetchData = contextStateV2?.setRefetchData
    const refetchChart = contextStateV2?.refetchChart
    const setRefetchChart = contextStateV2?.setRefetchChart
    const refetchPresentations = contextStateV2?.refetchPresentations
    const setRefetchPresentations = contextStateV2?.setRefetchPresentations
    const refetchChartDashboardsTick = contextStateV2?.refetchChartDashboardsTick
    const setUserHandle = contextStateV2?.setUserHandle
    const userHandle = contextStateV2?.userHandle
    const profilePic = contextStateV2?.profilePic
    const setProfilePic = contextStateV2?.setProfilePic
    const polymarketWsState = contextStateV2?.polymarketWsState
    const chainlinkWsState = contextStateV2?.chainlinkWsState
    const liveStreamState = contextStateV2?.liveStreamState
    const liveFeedState = contextStateV2?.liveFeedState
    const hasAnyLiveStream =
      Object.values(liveStreamState?.streamsBySheetId || {}).some((s) => s?.isRunning) ||
      Object.values(liveFeedState?.feedsById || {}).some((s) => s?.isRunning)
    const setIsLifeTimeMember = contextStateV2?.setIsLifeTimeMember
    const isLifeTimeMember = contextStateV2?.isLifeTimeMember

    const [startNew, setStartNew] = useState();
    const [newUserHandle, setNewUserHandle] = useState("");
    const [isButtonEnabled, setIsButtonEnabled] = useState(false);
    const [usernameExists, setUsernameExists] = useState(false);
    const [isCheckingHandle, setIsCheckingHandle] = useState(false);
    const [subscriptionTier, setSubscriptionTier] = useState(null);
    const [billingCycle, setBillingCycle] = useState(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [subscribedAt, setSubscribedAt] = useState(null);
    /** True only after a successful `/api/users/:id` GET — used so Connect hub does not flash handle setup while handle is unknown. */
    const [userProfileFetchOk, setUserProfileFetchOk] = useState(false);
    const [entryReady, setEntryReady] = useState(false);
    const [welcomeTier, setWelcomeTier] = useState("");
    const [celebrateCheckout, setCelebrateCheckout] = useState(false);
    const welcomedRef = useRef(false);
    const hasDbBackedUserId =
      typeof user?.userId === "string" &&
      user.userId !== "dev-bypass-no-db" &&
      /^[a-f0-9]{24}$/i.test(user.userId);

    const hasPaidAccess = !!isDemo || userHasDashboardAccess(user);
    const isLocked = !hasPaidAccess;
    const runYourselfLocked = !!contextStateV2?.runYourselfLocked;
    const runYourselfSessionActive = !!contextStateV2?.runYourselfSessionActive;
    const loadedDataId = contextStateV2?.loadedDataId;
    const forkDataSetId = user?.run_yourself_fork_data_set_id
      ? String(user.run_yourself_fork_data_set_id)
      : null;
    const viewingForkProject =
      !!forkDataSetId &&
      !!loadedDataId &&
      String(loadedDataId) === forkDataSetId;
    const runYourselfInteractiveUnlocked =
      userRunYourselfInteractiveUnlocked(user) &&
      (runYourselfSessionActive || viewingForkProject);
    const dashboardAccessLocked = isLocked && !runYourselfInteractiveUnlocked;
    const workspaceWriteLocked =
      !isDemo && !!user && (dashboardAccessLocked || runYourselfLocked);
    // The run-yourself loader flips the session flag after mount; don't flash the gate first.
    const [freeRunStarting, setFreeRunStarting] = useState(
      () => userRunYourselfInteractiveUnlocked(user) && freeRunRequestedInUrl(),
    );
    useEffect(() => {
      if (!freeRunStarting) return undefined;
      if (runYourselfSessionActive) {
        setFreeRunStarting(false);
        return undefined;
      }
      const timer = window.setTimeout(() => setFreeRunStarting(false), 8000);
      return () => window.clearTimeout(timer);
    }, [freeRunStarting, runYourselfSessionActive]);
    const membershipLocked = !isDemo && !!user && dashboardAccessLocked && !freeRunStarting;
    const wasOnForkProjectRef = useRef(false);

    useEffect(() => {
      if (isDemo || typeof window === "undefined") return;
      const url = new URL(window.location.href);
      if (url.searchParams.get("view") !== "billing") return;
      setViewing?.("manageAccount");
      url.searchParams.delete("view");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }, [isDemo, setViewing]);

    useEffect(() => {
      if (isDemo) return undefined;
      const open = () => setViewing?.("manageAccount");
      window.addEventListener(OPEN_BILLING_EVENT, open);
      return () => window.removeEventListener(OPEN_BILLING_EVENT, open);
    }, [isDemo, setViewing]);

    useEffect(() => {
      contextStateV2?.setWorkspaceWriteLocked?.(workspaceWriteLocked);
    }, [workspaceWriteLocked, contextStateV2]);

    useEffect(() => {
      if (!userRunYourselfInteractiveUnlocked(user)) {
        wasOnForkProjectRef.current = false;
        return;
      }

      if (viewingForkProject) {
        wasOnForkProjectRef.current = true;
        return;
      }

      if (wasOnForkProjectRef.current) {
        wasOnForkProjectRef.current = false;
        contextStateV2?.setRunYourselfSessionActive?.(false);
        void consumeRunYourselfInteractiveSession();
      }
    }, [viewingForkProject, user, contextStateV2]);

    useLayoutEffect(() => {
        if (welcomedRef.current) return;
        welcomedRef.current = true;
        const welcome = takeCheckoutWelcome();
        if (welcome?.tier) setWelcomeTier(welcome.tier);
        if (welcome?.celebrate) setCelebrateCheckout(true);
        if (!isDemo && (workspaceWelcomePending() || welcome)) {
            setViewing?.("welcome");
        }
        setEntryReady(true);
    }, [setViewing, isDemo]);

    const startTabsUserRef = useRef(null);
    useLayoutEffect(() => {
        const userId = user?.userId || "local";
        if (startTabsUserRef.current === userId) return;
        // A user refetch blanks the user for a moment; the signed-out tab list would replace theirs.
        if (userId === "local" && startTabsUserRef.current) return;
        startTabsUserRef.current = userId;
        const stored = loadWorkspaceStartTabs(user?.userId);
        contextStateV2?.setWorkspaceStartTabs?.(stored.tabs);
        contextStateV2?.setWelcomeTabRemoved?.(stored.welcomeRemoved);
        contextStateV2?.setActiveWorkspaceStartTabId?.(stored.activeId);
        if (!stored.tabs.length) {
            setViewing?.("connectDataHome");
        }
    }, [user?.userId, contextStateV2, setViewing]);

    useEffect(() => {
        if (viewing === "upload") {
            setViewing?.("connectDataHome");
            requestConnectWorkspace?.(CONNECT_WORKSPACE.UPLOAD);
        } else if (viewing === "newSheet") {
            setViewing?.("connectDataHome");
            requestConnectWorkspace?.(CONNECT_WORKSPACE.BLANK);
        }
    }, [viewing, setViewing, requestConnectWorkspace]);

    useEffect(() => {
        if(user && !isDemo && hasDbBackedUserId){
            fetch(`/api/dataSets?uid=${user.userId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
            .then(({ ok, data }) => {
                if (ok && data?.success && Array.isArray(data.data)) {
                    setSavedDataSets(data.data);
                } else {
                    setSavedDataSets([]);
                }
                setRefetchData(0);
            })
            .catch(() => {
                setSavedDataSets([]);
                setRefetchData(0);
            });
        }
    }, [user, refetchData, isDemo, hasDbBackedUserId])

    useEffect(() => {
        if(user && !isDemo && hasDbBackedUserId){
            fetch(`/api/charts?uid=${user.userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
            .then(({ ok, data }) => {
                if (ok && data?.success && Array.isArray(data.data)) {
                    setSavedCharts(data.data);
                } else {
                    if (!ok || !data?.success) {
                        console.error("Failed to fetch saved charts:", data?.message || "request failed");
                    }
                    setSavedCharts([]);
                }
                setRefetchChart(0);
            })
            .catch((err) => {
                console.error("Failed to fetch saved charts:", err);
                setSavedCharts([]);
                setRefetchChart(0);
            });
        }
    }, [user, refetchChart, isDemo, hasDbBackedUserId])

    useEffect(() => {
        if (user && !isDemo && hasDbBackedUserId) {
            fetch(`/api/chart-dashboards?uid=${user.userId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            })
            .then(response => response.json())
            .then(data => {
                if (data.success && Array.isArray(data.data)) {
                    setSavedChartDashboards(data.data);
                } else {
                    setSavedChartDashboards([]);
                }
            })
            .catch(() => setSavedChartDashboards([]));
        }
    }, [user, isDemo, hasDbBackedUserId, refetchChartDashboardsTick, setSavedChartDashboards])



    useEffect(() => {
        if(user && !isDemo && hasDbBackedUserId){
            fetch(`/api/presentations?uid=${user.userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    setSavedPresentations(data.data);
                    console.log(data.data)
                } else {
                    console.error('Failed to fetch saved Charts:', data.message);
                }
                setRefetchPresentations(0)
            })
        }
    }, [user, refetchPresentations, isDemo, hasDbBackedUserId])

    useEffect(() => {
        if (!user || isDemo || !hasDbBackedUserId) {
            setUserProfileFetchOk(false);
            return;
        }
        setUserProfileFetchOk(false);
        let cancelled = false;
        fetch(`/api/users/${user.userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then((response) => response.json())
            .then((data) => {
                if (cancelled) return;
                if (data.success) {
                    setUserHandle(data.data.user_name);
                    setProfilePic?.(data.data.profile_pic);
                    setIsLifeTimeMember(data.data.lifetimeMember);
                    setSubscriptionTier(data.data.subscriptionTier || null);
                    setBillingCycle(data.data.billingCycle || null);
                    setSubscriptionStatus(data.data.subscriptionStatus || null);
                    setSubscribedAt(data.data.subscribedAt || null);
                    setUserProfileFetchOk(true);
                } else {
                    console.error('Failed to fetch user info:', data.message);
                    setUserProfileFetchOk(false);
                }
            })
            .catch((error) => {
                console.error('Error fetching user info:', error);
                if (!cancelled) setUserProfileFetchOk(false);
            });
        return () => {
            cancelled = true;
        };
    }, [user, isDemo, hasDbBackedUserId]);

    const checkUsernameAvailability = useCallback(
        debounce((value) => {
            if (isReservedUserHandle(value)) {
                setUsernameExists(true);
                setIsButtonEnabled(false);
                return;
            }
            setIsCheckingHandle(true);
            fetch(`/api/users/checkUserhandle?userHandle=${value}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then(response => response.json())
            .then(data => {
                setUsernameExists(data.exists);
                setIsButtonEnabled(!data.exists && value.length > 2);
                setIsCheckingHandle(false);
            })
            .catch(error => {
                console.error('Error checking username availability:', error);
                setIsCheckingHandle(false);
            });
        }, 500),
        []
    );

    const handleUserHandleChange = (e) => {
        const value = e.target.value;
        setNewUserHandle(value);
        if (value.length > 2) {
            checkUsernameAvailability(value);
        } else {
            setIsButtonEnabled(false);
        }
    };

    const handleUpdateUserHandle = () => {
        if (isReservedUserHandle(newUserHandle)) {
            toast.error(reservedUserHandleMessage(newUserHandle));
            return;
        }
        if (!hasDbBackedUserId) {
            return;
        }
        fetch(`/api/users/${user.userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_name: newUserHandle,
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                setUserHandle(data.data.user_name);
                toast('User handle updated!', {
                    description: `Your user handle has been updated to ${data.data.user_name}.`,
                    closeButton: true,
                    duration: 3000
                });
                setNewUserHandle(""); // Clear the input
                setIsButtonEnabled(false); // Disable the button
            } else {
                console.error('Failed to update user handle:', data.message);
            }
        })
        .catch(error => {
            console.error('Error updating user handle:', error);
        });
    };


    const content = (
      <WorkspaceComposerDockProvider>
        {!isDemo && (
          <>
            <Nav />
            {!navChromeExpanded && (
              <div className="h-14 shrink-0" aria-hidden />
            )}
          </>
        )}
        {contextStateV2?.landingDemoActive && (
          <>
            <FigmaNavChrome dashboardName="Demo Dashboard" />
            <div className="h-14 shrink-0" aria-hidden />
          </>
        )}
        {rightPanelOpen && <Separator className="shrink-0" />}
        <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col py-1 [--dashboard-tab-clearance:2.75rem]">
                <WorkspaceCanvas />
                {entryReady && (viewing === "welcome" || viewing === "connectDataHome") && (
                  <WorkspaceWelcomeLayer
                    viewing={viewing}
                    navChromeExpanded={navChromeExpanded}
                    checkout={
                      <CheckoutWelcome
                        name={user?.name}
                        celebrate={celebrateCheckout}
                        tier={
                          welcomeTier ||
                          membershipTierLabel({
                            subscriptionTier:
                              isLifeTimeMember || user?.lifetimeMember
                                ? "lifetime"
                                : subscriptionTier || user?.subscriptionTier,
                          })
                        }
                      />
                    }
                    connectHome={
                      contextStateV2?.landingDemo ? null : (
                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <ConnectHomeShell
                          user={user}
                          userProfileFetchOk={userProfileFetchOk}
                          startNew={startNew}
                          setStartNew={setStartNew}
                        />
                      </div>
                      )
                    }
                  />
                )}
                { !isDemo && (viewing === 'dataStart' || viewing === 'charts' || viewing === 'dashboardComposer') && (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <DataSheetWithIntegration
                      user={user}
                      startNew={startNew}
                      setStartNew={setStartNew}
                      chartMode={viewing === 'charts'}
                      dashboardMode={viewing === 'dashboardComposer'}
                    />
                  </div>
                ) }
                { viewing === 'integrations' && <div className="py-10"><IntegrationsView/></div> }
                {!isDemo && viewing === 'ai' && <AiView/> }
                {!isDemo && viewing === 'generate' && <div className="py-20"><ComingSoon /></div> }
                {!isDemo && viewing === 'presentation' && <div className="py-20"><EasyLychee /></div> }
                {!isDemo && viewing === 'scrape' && <ScraperView />}
                {!isDemo && BILLING_VIEWS.has(viewing) && (
                  <div className="absolute inset-0 z-30 overflow-y-auto bg-[#f5f5f5] dark:bg-[#1e1e1e]">
                    <BillingView user={user} onBack={() => setViewing?.("welcome")} />
                  </div>
                )}
                {!isDemo && viewing === 'profilePage' && <div className="p-56 text-black">
                    <div className="">
                        <div className="mb-4 max-w-xl">
                          <ProfilePictureUploader
                            userId={hasDbBackedUserId ? user.userId : null}
                            handle={userHandle}
                            name={user?.email}
                            currentSrc={profilePic}
                            onUpdated={(nextUrl) => setProfilePic?.(nextUrl)}
                          />
                        </div>
                        <div className="mb-6 rounded-lg border border-border bg-background p-4 text-sm text-foreground">
                          <div className="font-semibold">Account plan</div>
                          <div className="mt-2 text-muted-foreground">
                            Tier:{" "}
                            <span className="font-medium text-foreground">
                              {isLifeTimeMember
                                ? "Lifetime"
                                : (subscriptionTier
                                    ? `${subscriptionTier}${billingCycle ? ` (${billingCycle})` : ""}`
                                    : "Free / Unassigned")}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            Status:{" "}
                            <span className="font-medium text-foreground">
                              {isLifeTimeMember ? "active" : (subscriptionStatus || "none")}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            Subscribed on:{" "}
                            <span className="font-medium text-foreground">
                              {subscribedAt ? new Date(subscribedAt).toLocaleDateString() : "N/A"}
                            </span>
                          </div>
                        </div>
                        <div className="grid flex-1 gap-2 max-w-64 py-4">
                            <Label htmlFor="user_handle">
                                Handle (@{userHandle})
                            </Label>
                            <Input
                                id="user_handle"
                                placeholder="Enter new user handle"
                                value={newUserHandle}
                                onChange={handleUserHandleChange}
                            />
                        </div>
                        {usernameExists && <div className="text-red-500 text-xs">Handle unavailable (reserved or already taken)</div>}
                        
                        <Button 
                            type="button" 
                            size="sm" 
                            className="px-3" 
                            onClick={handleUpdateUserHandle}
                            disabled={!isButtonEnabled}
                        >
                            <span className="">Submit</span>
                        </Button>
                        
                    </div>
                </div>}
        </div>
        {contextStateV2?.landingDemo && (
          <IntegrationConnectLandingDemo
            active={!!contextStateV2?.landingDemoActive}
            onSelectIntegration={() => contextStateV2?.activateLandingDemo?.()}
          />
        )}
      </WorkspaceComposerDockProvider>
    );

    if (membershipLocked) {
      return <MembershipGate user={user} />;
    }

    return isDemo ? (
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">{content}</div>
    ) : (
      <div className="relative flex min-h-svh min-w-0 flex-col bg-[#f5f5f5] dark:bg-[#1e1e1e]">
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-out",
            navChromeExpanded && "lg:px-[276px]",
          )}
        >
          {content}
        </div>
      </div>
    );
}

export default DashBody;
