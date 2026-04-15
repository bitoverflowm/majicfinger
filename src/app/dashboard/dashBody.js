import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

import { useMyStateV2  } from '@/context/stateContextV2'

import SideNav from './components/sideNav'
import Nav from './components/nav'
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import KatsuView from './components/katsuView';
import DataSheetWithIntegration from "@/components/dataView/dataSheetWithIntegration";
import Upload from '@/components/dataView/upload'
import IntegrationsView from "@/components/integrationsView";
import NewSheetView from "@/components/newSheetView";

import Login from "@/components/login";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

import AiView from "@/components/aiView";
import ScraperView from "@/components/scraperView";
import ComingSoon from "./components/comingSoon";
import { Pricing } from "@/components/pricing/lycheePricing";
import EasyLychee from "@/components/easyLychee";
import { Separator } from "@/components/ui/separator";

import { cn } from "@/lib/utils";

import { debounce } from "@/lib/debounce";
import { isReservedUserHandle, reservedUserHandleMessage } from "@/lib/reservedUserHandles";

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
    
    const refetchData = contextStateV2?.refetchData
    const setRefetchData = contextStateV2?.setRefetchData
    const refetchChart = contextStateV2?.refetchChart
    const setRefetchChart = contextStateV2?.setRefetchChart
    const refetchPresentations = contextStateV2?.refetchPresentations
    const setRefetchPresentations = contextStateV2?.setRefetchPresentations
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

    const normalizedSubscriptionStatus = String(subscriptionStatus || "").toLowerCase();
    const hasPaidAccess =
      !!isDemo ||
      (!!user && (
        !!isLifeTimeMember ||
        normalizedSubscriptionStatus === "active" ||
        normalizedSubscriptionStatus === "trialing" ||
        // Backward-compatible: some historical users have tier/cycle populated without status.
        (!!subscriptionTier && !normalizedSubscriptionStatus)
      ));
    const isLocked = !hasPaidAccess;

    useEffect(() => {
        if(user && !isDemo){
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
    }, [user, refetchData, isDemo])

    useEffect(() => {
        if(user && !isDemo){
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
    }, [user, refetchChart, isDemo])



    useEffect(() => {
        if(user && !isDemo){
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
    }, [user, refetchPresentations, isDemo])


    useEffect(() => {
        if (user && !isDemo) {
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
    }, [user, isDemo]);

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
                {!isDemo && viewing === 'dashboard' && <div className=""><KatsuView user={user}/></div> }             
                { (viewing === 'dataStart' || viewing === 'charts') && (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <DataSheetWithIntegration
                      user={user}
                      startNew={startNew}
                      setStartNew={setStartNew}
                      chartMode={viewing === 'charts'}
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
                {!isDemo && viewing === 'register' && <div className="flex place-items-center place-content-center"><div><Login/></div></div>}
                {!isDemo && viewing === 'pricing' && <div className="py-10"><Pricing /></div>}
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
                {!isDemo && (
                  <button
                      type="button"
                      onClick={() => setViewing?.('pricing')}
                      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-border shadow-lg hover:shadow-xl transition-shadow text-xs font-medium opacity-70 hover:opacity-100"
                  >
                      Deal for you
                  </button>
                )}
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

          {isLocked && (
            <div className="pointer-events-auto fixed bottom-5 left-1/2 z-[999] w-[min(94vw,42rem)] -translate-x-1/2 rounded-xl border border-border bg-background/95 p-4 shadow-xl backdrop-blur-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    {user ? "Upgrade to access dashboard actions" : "Sign in and choose a plan to use dashboard actions"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    You can look around, but editing, saving, uploads, and integrations are locked until you have an active paid plan.
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!user ? (
                    <Link
                      href="/login"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
                    >
                      Sign in
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setViewing?.("pricing")}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
                  >
                    View plans
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SidebarProvider>
    )

}

export default DashBody;