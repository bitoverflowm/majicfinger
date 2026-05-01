import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

import { useMyStateV2  } from '@/context/stateContextV2'

import SideNav from './components/sideNav'
import Nav from './components/nav'
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import DataSheetWithIntegration from "@/components/dataView/dataSheetWithIntegration";
import Upload from '@/components/dataView/upload'
import IntegrationsView from "@/components/integrationsView";
import NewSheetView from "@/components/newSheetView";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

import AiView from "@/components/aiView";
import ScraperView from "@/components/scraperView";
import ComingSoon from "./components/comingSoon";
import { PricingSection } from "@/components/sections/pricing-section";
import EasyLychee from "@/components/easyLychee";
import { Separator } from "@/components/ui/separator";

import { cn } from "@/lib/utils";

import { debounce } from "@/lib/debounce";
import { isReservedUserHandle, reservedUserHandleMessage } from "@/lib/reservedUserHandles";
import { isDevLoginBypassUser } from "@/lib/devLoginBypass";
import { isOwnerFullAccessUser } from "@/lib/ownerFullAccess";

const DashBody = ({ user }) => {
    const contextStateV2 = useMyStateV2()
    const isDemo = contextStateV2?.isDemo
    const setViewing = contextStateV2?.setViewing

    const viewing = contextStateV2?.viewing
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
    const polymarketWsState = contextStateV2?.polymarketWsState
    const chainlinkWsState = contextStateV2?.chainlinkWsState
    const liveStreamState = contextStateV2?.liveStreamState
    const hasAnyLiveStream = Object.values(liveStreamState?.streamsBySheetId || {}).some((s) => s?.isRunning)
    const setIsLifeTimeMember = contextStateV2?.setIsLifeTimeMember
    const isLifeTimeMember = contextStateV2?.isLifeTimeMember

    const [startNew, setStartNew] = useState();
    const [newUserHandle, setNewUserHandle] = useState("");
    const [isButtonEnabled, setIsButtonEnabled] = useState(false);
    const [usernameExists, setUsernameExists] = useState(false);
    const [subscriptionTier, setSubscriptionTier] = useState(null);
    const [billingCycle, setBillingCycle] = useState(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [subscribedAt, setSubscribedAt] = useState(null);
    const hasDbBackedUserId =
      typeof user?.userId === "string" &&
      user.userId !== "dev-bypass-no-db" &&
      /^[a-f0-9]{24}$/i.test(user.userId);

    const normalizedSubscriptionStatus = String(
      subscriptionStatus || user?.subscriptionStatus || "",
    ).toLowerCase();
    const tierForAccess = subscriptionTier ?? user?.subscriptionTier ?? null;
    const lifetimeForAccess = Boolean(isLifeTimeMember || user?.lifetimeMember);
    const hasPaidAccess =
      !!isDemo ||
      isDevLoginBypassUser(user) ||
      isOwnerFullAccessUser(user) ||
      (!!user && (
        lifetimeForAccess ||
        normalizedSubscriptionStatus === "active" ||
        normalizedSubscriptionStatus === "trialing" ||
        // Backward-compatible: some historical users have tier/cycle populated without status.
        (!!tierForAccess && !normalizedSubscriptionStatus)
      ));
    const isLocked = !hasPaidAccess;

    useEffect(() => {
        if(user && !isDemo && hasDbBackedUserId){
            fetch(`/api/dataSets?uid=${user.userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    setSavedDataSets(data.data); // Assuming you have a state to hold the fetched data
                    toast('Project History Loaded!', {
                        description: `We just pulled your saved project history.`,
                        closeButton: true,
                        duration: 3000
                      });
                } else {
                    console.error('Failed to fetch saved projects:', data.message);
                }
                setRefetchData(0)
            })
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
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    setSavedCharts(data.data);
                    toast('Chart History Loaded!', {
                        description: `We just pulled your saved charts.`,
                        closeButton: true,
                        duration: 3000
                      });
                } else {
                    console.error('Failed to fetch saved Charts:', data.message);
                }
                setRefetchChart(0)
            })
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
                    toast('Saved Presentations Loaded!', {
                        description: `We just pulled your saved presentations.`,
                        closeButton: true,
                        duration: 3000
                      });
                } else {
                    console.error('Failed to fetch saved Charts:', data.message);
                }
                setRefetchPresentations(0)
            })
        }
    }, [user, refetchPresentations, isDemo, hasDbBackedUserId])


    useEffect(() => {
        if (user && !isDemo && hasDbBackedUserId) {
            fetch(`/api/users/${user.userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    setUserHandle(data.data.user_name);
                    setIsLifeTimeMember(data.data.lifetimeMember);
                    setSubscriptionTier(data.data.subscriptionTier || null);
                    setBillingCycle(data.data.billingCycle || null);
                    setSubscriptionStatus(data.data.subscriptionStatus || null);
                    setSubscribedAt(data.data.subscribedAt || null);
                } else {
                    console.error('Failed to fetch user info:', data.message);
                }
            })
            .catch(error => {
                console.error('Error fetching user info:', error);
            });
        }
    }, [user, isDemo, hasDbBackedUserId]);

    const checkUsernameAvailability = useCallback(
        debounce((value) => {
            if (isReservedUserHandle(value)) {
                setUsernameExists(true);
                setIsButtonEnabled(false);
                return;
            }
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
            })
            .catch(error => {
                console.error('Error checking username availability:', error);
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
      <>
        {!isDemo && (
          <header className="sticky top-0 z-30 w-full shrink-0 border-b border-border bg-white shadow-sm dark:bg-slate-950 dark:shadow-none">
            <Nav />
          </header>
        )}
        {rightPanelOpen && <Separator className="shrink-0" />}
        <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col py-1">
                { (viewing === 'dataStart' || viewing === 'charts' || viewing === 'dashboardComposer') && (
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
                { viewing === 'newSheet' && <div className="py-16"><NewSheetView user={user} startNew={true} setStartNew={setStartNew} /></div> }
                { viewing === 'upload' && <div className="py-16 h-screen"><Upload user={user}/></div> }
                { viewing === 'integrations' && <div className="py-10"><IntegrationsView/></div> }
                {!isDemo && viewing === 'ai' && <AiView/> }
                {!isDemo && viewing === 'generate' && <div className="py-20"><ComingSoon /></div> }
                {!isDemo && viewing === 'presentation' && <div className="py-20"><EasyLychee /></div> }
                {!isDemo && viewing === 'scrape' && <ScraperView />}
                {!isDemo && viewing === 'pricing' && <div className="py-10"><PricingSection /></div>}
                {!isDemo && viewing === 'profilePage' && <div className="p-56 text-black">
                    <div className="">
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
                { viewing === 'manageAccount' && <div className="p-56 text-black">
                    <div className="mb-6 rounded-lg border border-border bg-background p-4 text-sm text-foreground">
                        <div className="font-semibold">Current subscription</div>
                        <div className="mt-2 text-muted-foreground">
                          {isLifeTimeMember
                            ? "Lifetime access"
                            : (subscriptionTier
                                ? `${subscriptionTier}${billingCycle ? ` (${billingCycle})` : ""} - ${subscriptionStatus || "unknown"}`
                                : "No active paid tier on file")}
                        </div>
                        <div className="text-muted-foreground">
                          Subscribed on: {subscribedAt ? new Date(subscribedAt).toLocaleDateString() : "N/A"}
                        </div>
                    </div>
                    <div>Hi, I am working on making this page more useful</div>
                    <div>For now I have enabled managed billing using Stripe click here: </div>
                    <Link className="bg-black text-white hover:cursor-pointer" href="https://billing.stripe.com/p/login/14k6sm3PU1cTd44fYY">Customer Portal</Link>
                </div>}
        </div>
      </>
    );

    return isDemo ? (
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">{content}</div>
    ) : (
      <SidebarProvider defaultOpen={false}>
        <div className="relative flex min-h-0 min-w-0 flex-1">
          <div className={cn("contents", isLocked && "pointer-events-none select-none")}>
            <SideNav user={user} startNew={startNew} setStartNew={setStartNew}/>
            <SidebarInset className="min-h-0">{content}</SidebarInset>
          </div>

          {isLocked && user && (
            <div className="pointer-events-auto fixed bottom-5 left-1/2 z-[999] w-[min(94vw,42rem)] -translate-x-1/2 rounded-xl border-2 border-primary/50 bg-card p-5 shadow-2xl ring-4 ring-primary/15">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-base font-semibold text-foreground">
                    Choose a plan to unlock the dashboard
                  </div>
                  <div className="mt-1 text-sm leading-snug text-muted-foreground">
                    Editing, saving, uploads, and integrations stay locked until you have an active paid plan (or lifetime access).
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href="/#pricing"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-md hover:opacity-90"
                  >
                    View plans
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </SidebarProvider>
    )

}

export default DashBody;