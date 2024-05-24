import { useEffect  } from "react";


import { useMyStateV2  } from '@/context/stateContextV2'


import SideNav from './components/sideNav'
import KatsuView from './components/katsuView';
import DataView from "@/components/dataView";
import Upload from '@/components/dataView/upload'
import ChartViewV2 from "@/components/chartView/chartViewV2";
import { ChartGallery } from "@/components/chartGallery";
import { IntegrationsView } from "@/components/integrationsView";
import Login from "@/components/login";

import { toast } from "sonner"



const DashBody = ({user}) => {
    const contextStateV2 = useMyStateV2()

    const viewing = contextStateV2?.viewing
    //const savedDataSets = contextStateV2?.savedDataSets
    const setSavedDataSets = contextStateV2?.setSavedDataSets
    const setSavedCharts = contextStateV2?.setSavedCharts

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
                        duration: 99999999
                      });
                } else {
                    console.error('Failed to fetch saved projects:', data.message);
                }
            })
        }
    }, [user])

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
                        duration: 99999999
                      });
                } else {
                    console.error('Failed to fetch saved Charts:', data.message);
                }
            })
        }
    }, [user])

    

    return(
        <div className="w-full flex">
            <div className="z-20 inset-y-0  flex-col border-r bg-background sm:flex">
                <SideNav user={user}/>
            </div>
            <div className='w-full px-20'>
                { viewing === 'dashboard' && <div className="py-28"><KatsuView user={user}/></div> }              
                { viewing === 'dataStart' && <div className="py-16"><DataView user={user}/></div> }
                { viewing === 'upload' && <div className="py-16 h-screen"><Upload user={user}/></div> }
                { viewing === 'charts' && <div className="py-16 h-screen"><ChartViewV2 user={user}/></div> }
                { viewing === 'gallery' && <div className="py-16 min-h-screen"><ChartGallery/></div> }
                { viewing === 'integrations' && <div className="py-16"><IntegrationsView/></div> }
                { viewing === 'ai' && "AI" }
                { viewing === 'presentation' && "Start Writing a Report Here" }
                { viewing === 'register' && <div className="py-16"><Login/></div>}
            </div>
        </div>
    )

}

export default DashBody;