import { useState } from 'react'

import { useMyStateV2  } from '@/context/stateContextV2'
import { HardDriveUpload, Cable, Shovel, FilePlus2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

//import Image from 'next/image'
import GridView from '@/components/gridView'
import { VscCircleFilled } from 'react-icons/vsc'

const DataView = ({user}) => {
    const contextStateV2 = useMyStateV2()

    const connectedData = contextStateV2?.connectedData
    const loadedDataMeta = contextStateV2?.loadedDataMeta
    const setViewing = contextStateV2?.setViewing

    return(
        <div className='w-full px-10'>                       
            <h1 className='text-4xl font-extrabold'>
                Your Data
            </h1>
            {loadedDataMeta && <div className='pt-1'>{loadedDataMeta.data_set_name}</div>}
            {
                (connectedData) ? <div className='min-h-screen'> <GridView/> </div>      
                : <div className="">
                    <div className='w-1/4 mx-auto py-8'>
                        {
                            !(user) && 
                                <Alert onClick={()=>setViewing('register')} className="cursor-pointer">
                                    <VscCircleFilled className="h-5 w-5"/>
                                    <AlertTitle className="text-xs">Want to save your work?</AlertTitle>
                                    <AlertDescription className="text-xs" >
                                         Click here to register.
                                    </AlertDescription>
                                </Alert>
                        }
                    </div>
                    <div className="mx-auto w-9/12 grid grid-cols-3 rounded-xl gap-10 bg-muted/50 p-5">
                        <div className="p-10 text-sm object-cover transition-all hover:scale-105 cursor-pointer" onClick={()=>setViewing('upload')}>
                            <div className='py-4'><HardDriveUpload /></div>
                            <h3 className="pb-1 font-medium leading-none">Upload</h3>
                            <p className="text-xs text-muted-foreground">Upload your own .csv, excel</p>
                            <p className="pt-1 text-xs text-muted-foreground">.json, and more coming soon</p>
                        </div>
                        <div className="p-10 text-sm object-cover transition-all hover:scale-105 cursor-pointer" onClick={()=>setViewing('integrations')}>
                            <div className='py-4'><Cable /></div>
                            <h3 className="pb-1 font-medium leading-none">Integrate</h3>
                            <p className="text-xs text-muted-foreground">Connect directly to your favorite data sources</p>
                            <p className="pt-1 text-xs text-muted-foreground">Kaggle, Twitter, Youtube, Instagram, Strava, etc</p>
                        </div>
                        <div className="p-10 text-sm object-cover transition-all hover:scale-105 cursor-pointer" onClick={()=>setViewing('scrape')}>
                            <div className='py-4'><Shovel /></div>
                            <h3 className="pb-1 font-medium leading-none">Scrape</h3>
                            <p className="text-xs text-muted-foreground">First: Make sure there is no Integration available for the website you want to scrape. <br/><br/> Then assuming an APi is not available, scrape any website at all. Just give the URL</p>
                        </div>
                        <div className="p-10 text-sm object-cover transition-all hover:scale-105 cursor-pointer" onClick={()=>setViewing('generate')}>
                            <div className='py-4'><HardDriveUpload /></div>
                            <h3 className="pb-1 font-medium leading-none">Generate</h3>
                            <p className="text-xs text-muted-foreground">Generate insanely realistic fake data to your specifications for your needs.</p>
                        </div>                        
                        <div className="p-10 text-sm object-cover transition-all hover:scale-105 cursor-pointer" onClick={()=>setViewing('newSheet')}>
                            <div className='py-4'><FilePlus2 /></div>
                            <h3 className="pb-1 font-medium leading-none">New Sheet</h3>
                            <p className="text-xs text-muted-foreground">Start with an empty sheet</p>
                        </div>
                    </div>
                </div>

            }
            
        </div>
    )

}

export default DataView