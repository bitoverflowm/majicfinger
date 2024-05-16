import { useEffect  } from "react";

import { useMyStateV2  } from '@/context/stateContextV2'

import SideNav from './components/sideNav'
import KatsuView from './components/katsuView';
import DataView from "@/components/dataView";
import Upload from '@/components/dataView/upload'
import ChartViewV2 from "@/components/chartView/chartViewV2";
import { ChartGallery } from "@/components/chartGallery";
import { IntegrationsView } from "@/components/integrationsView";



const DashBody = ({user}) => {
    const contextStateV2 = useMyStateV2()

    const viewing = contextStateV2?.viewing

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
            </div>
        </div>
    )

}

export default DashBody;