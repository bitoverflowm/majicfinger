import { useEffect  } from "react";

import { useMyStateV2  } from '@/context/stateContextV2'

import SideNav from './components/sideNav'
import KatsuView from './components/katsuView';
import DataView from "@/components/dataView";
import Upload from '@/components/dataView/upload'
import ChartViewV2 from "@/components/chartView/chartViewV2";



const DashBody = ({user}) => {
    const contextStateV2 = useMyStateV2()

    const viewing = contextStateV2?.viewing

    return(
        <div className="w-full flex">
            <div className="fixed inset-y-0 left-0 z-20 w-14 flex-col border-r bg-background sm:flex">
                <SideNav user={user}/>
            </div>
            <div className='w-full px-20'>
                { viewing === 'dashboard' && <div className="py-28"><KatsuView user={user}/></div> }               
                { viewing === 'dataStart' && <div className="py-16"><DataView user={user}/></div> }
                { viewing === 'upload' && <div className="py-16 h-screen"><Upload user={user}/></div> }
                { viewing === 'charts' && <div className="py-16 h-screen"><ChartViewV2 user={user}/></div> }
                { viewing === 'gallery' && "Gallery" }
                { viewing === 'integrations' && "Pick Something to Commect to" }
                { viewing === 'ai' && "AI" }
                { viewing === 'presentation' && "Start Writing a Report Here" }
            </div>
        </div>
    )

}

export default DashBody;