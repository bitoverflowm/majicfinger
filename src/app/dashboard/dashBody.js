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


import { debounce } from "@/lib/debounce";

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
    const refetchChart = contextStateV2?.refetchData
    const setRefetchChart = contextStateV2?.setRefetchData
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
        <div className="relative z-0 flex min-h-0 flex-1 flex-col py-1">
                {!isDemo && viewing === 'dashboard' && <div className=""><KatsuView user={user}/></div> }             
                { viewing === 'dataStart' && (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <DataSheetWithIntegration user={user} startNew={startNew} setStartNew={setStartNew} />
                  </div>
                ) }
                { viewing === 'newSheet' && <div className="py-16"><NewSheetView user={user} startNew={true} setStartNew={setStartNew} /></div> }
                { viewing === 'upload' && <div className="py-16 h-screen"><Upload user={user}/></div> }
                { viewing === 'charts' && (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <DataSheetWithIntegration user={user} startNew={startNew} setStartNew={setStartNew} chartMode />
                  </div>
                ) }
                { viewing === 'integrations' && <div className="py-10"><IntegrationsView/></div> }
                {!isDemo && viewing === 'ai' && <AiView/> }
                {!isDemo && viewing === 'generate' && <div className="py-20"><ComingSoon /></div> }
                {!isDemo && viewing === 'presentation' && <div className="py-20"><EasyLychee /></div> }
                {!isDemo && viewing === 'scrape' && <ScraperView />}
                {!isDemo && viewing === 'register' && <div className="flex place-items-center place-content-center"><div><Login/></div></div>}
                {!isDemo && viewing === 'pricing' && <div className="py-10"><Pricing /></div>}
                {!isDemo && viewing === 'profilePage' && <div className="p-56 text-black">
                    <div className="">
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
                        {usernameExists && <div className="text-red-500 text-xs">Username already taken</div>}
                        
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
      <div className="min-h-0 flex flex-1 flex-col">{content}</div>
    ) : (
      <SidebarProvider defaultOpen={false}>
        <SideNav user={user} startNew={startNew} setStartNew={setStartNew}/>
        <SidebarInset>{content}</SidebarInset>
      </SidebarProvider>
    )

}

export default DashBody;