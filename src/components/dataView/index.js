
import { useMyStateV2  } from '@/context/stateContextV2'
import { MoveRight } from 'lucide-react'

import Image from 'next/image'
import GridViewV2 from '@/components/gridView/gridViewV2'

const DataView = ({user}) => {
    const contextStateV2 = useMyStateV2()

    const connectedData = contextStateV2?.connectedData
    const setViewing = contextStateV2?.setViewing

    return(
        <div className='w-full px-10'>
            <h1 className='text-4xl font-extrabold'>
                Your Data
            </h1>
            {
                connectedData ? <div className='min-h-screen'>
                    <GridViewV2 />
                </div>
                : <div className="grid flex-1 gap-4 overflow-auto p-10 md:grid-cols-2 lg:grid-cols-3">
                    <div
                        className="relative hidden flex-col items-start gap-8 md:flex" x-chunk="dashboard-03-chunk-0"
                    >
                        {
                            !(user) && 
                                <div>Please <span onClick={()=>setViewing('subscribe')} className='underline hover:text-green-600 cursor-pointer'>register</span> to save your data.</div>
                        }
                        {
                            connectedData 
                                    ? <div> Previous session data: Hello </div>
                                    : <div>
                                        <div>No Data detected</div>
                                        <div> Check panel to the right </div>
                                        <div><MoveRight /></div>
                                    </div>
                        }
                    </div>
                    <div className="grid grid-cols-2 rounded-xl bg-muted/50 p-4 col-span-2">
                        <div className="text-sm object-cover transition-all hover:scale-105 cursor-pointer" onClick={()=>setViewing('upload')}>
                            <h3 className="font-medium leading-none">Upload</h3>
                            <p className="text-xs text-muted-foreground">Upload your own .csv, excel, .json, etc</p>
                        </div>
                        <div className="text-sm object-cover transition-all hover:scale-105 cursor-pointer" onClick={()=>setViewing('integrations')}>
                            <h3 className="font-medium leading-none">Integrate</h3>
                            <p className="text-xs text-muted-foreground">Integrate with your favorite data source</p>
                        </div>
                        <div className="text-sm object-cover transition-all hover:scale-105 cursor-pointer" onClick={()=>setViewing('scrape')}>
                            <h3 className="font-medium leading-none">Scrape</h3>
                            <p className="text-xs text-muted-foreground">Scrape the data of any website</p>
                        </div>
                        <div className="text-sm object-cover transition-all hover:scale-105 cursor-pointer" onClick={()=>setViewing('generate')}>
                            <h3 className="font-medium leading-none">Generate</h3>
                            <p className="text-xs text-muted-foreground">Generate some data to play around with</p>
                        </div>
                        
                    </div>
                </div>

            }
            
        </div>
    )

}

export default DataView