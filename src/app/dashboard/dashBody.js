import { useEffect, useState } from "react";
import Link from "next/link";

import { useMyStateV2  } from '@/context/stateContextV2'

import SideNav from './components/sideNav'
import KatsuView from './components/katsuView';
import DataView from "@/components/dataView";
import Upload from '@/components/dataView/upload'
import ChartView from "@/components/chartView";
import { ChartGallery } from "@/components/chartGallery";
import IntegrationsView from "@/components/integrationsView";
import NewSheetView from "@/components/newSheetView";

import Login from "@/components/login";

import { toast } from "sonner"

import AiView from "@/components/aiView";
import ScraperView from "@/components/scraperView";
import ComingSoon from "./components/comingSoon";
import { Pricing } from "@/components/pricing/lycheePricing";
import PresentationView from "@/components/presentationView";
import EasyLychee from "@/components/easyLychee";


const DashBody = ({user}) => {
    const contextStateV2 = useMyStateV2()

    const viewing = contextStateV2?.viewing
    //const savedDataSets = contextStateV2?.savedDataSets
    const setSavedDataSets = contextStateV2?.setSavedDataSets
    const setSavedCharts = contextStateV2?.setSavedCharts
    
    const refetchData = contextStateV2?.refetchData
    const setRefetchData = contextStateV2?.setRefetchData
    const refetchChart = contextStateV2?.refetchData
    const setRefetchChart = contextStateV2?.setRefetchData

    const [startNew, setStartNew] = useState()

    useEffect(() => {
        if(user){
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
    }, [user, refetchData])

    useEffect(() => {
        if(user){
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
    }, [user, refetchChart])    

    return(
        <div className="flex">
            <div className="z-20 inset-y-0 flex-col border-r bg-background sm:flex">
                <SideNav user={user} startNew={startNew} setStartNew={setStartNew}/>
            </div>
            <div className='w-full'>
                { viewing === 'dashboard' && <div className=""><KatsuView user={user}/></div> }             
                { viewing === 'dataStart' && <div className="py-16"><DataView user={user} startNew={startNew} setStartNew={setStartNew} /></div> }
                { viewing === 'newSheet' && <div className="py-16"><NewSheetView user={user} startNew={true} setStartNew={setStartNew} /></div> }
                { viewing === 'upload' && <div className="py-16 h-screen"><Upload user={user}/></div> }
                { viewing === 'charts' && <div className="py-16"><ChartView user={user}/></div> }
                { viewing === 'gallery' && <div className="py-16 min-h-screen"><ChartGallery/></div> }
                { viewing === 'integrations' && <div className="py-10"><IntegrationsView/></div> }
                { viewing === 'ai' && <AiView/> }
                { viewing === 'generate' && <div className="py-20"><ComingSoon /></div> }
                { viewing === 'presentation' && <div className="py-20"><EasyLychee /></div> }
                { viewing === 'scrape' && <ScraperView />}
                { viewing === 'register' && <div className="flex place-items-center place-content-center"><div><Login/></div></div>}
                { viewing === 'pricing' && <div className="py-10"><Pricing /></div>}
                { viewing === 'manageAccount' && <div className="p-56 text-black">
                    <div>Hi, I am working on making this page more useful</div>
                    <div>For now I have enabled managed billing using Stripe click here: </div>
                    <Link className="bg-black text-white hover:cursor-pointer" href="https://billing.stripe.com/p/login/14k6sm3PU1cTd44fYY">Customer Portal</Link>
                </div>}
            </div>
        </div>
    )

}

export default DashBody;