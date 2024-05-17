
import { useMyStateV2  } from '@/context/stateContextV2'
import { Circle, HardDriveUpload, MoveRight, Cable, Shovel } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"


//import Image from 'next/image'
import GridViewV2 from '@/components/gridView/gridViewV2'
import { VscCircleFilled } from 'react-icons/vsc'

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
                : <div className="py-20">
                    <div className='w-1/3 mx-auto py-8'>
                        {
                            !(user) && 
                                <Alert onClick={()=>setViewing('register')} className="cursor-pointer">
                                    <VscCircleFilled className="h-5 w-5"/>
                                    <AlertTitle>Heads up!</AlertTitle>
                                    <AlertDescription >
                                        Want to save your work? Click here to register.
                                    </AlertDescription>
                                </Alert>
                        }
                    </div>
                    <div className="mx-auto w-7/12 grid grid-cols-2 rounded-xl gap-10 bg-muted/50 p-20">
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
                            <p className="text-xs text-muted-foreground">Assuming an APi isnot available, scrape a website</p>
                            <p className="pt-1 text-xs text-muted-foreground">coming soon</p>
                        </div>
                        <div className="p-10 text-sm object-cover transition-all hover:scale-105 cursor-pointer" onClick={()=>setViewing('generate')}>
                            <div className='py-4'><HardDriveUpload /></div>
                            <h3 className="pb-1 font-medium leading-none">Generate</h3>
                            <p className="text-xs text-muted-foreground">Use Athena (Lychee AI) to generate data to your specifications</p>
                        </div>                        
                    </div>
                </div>

            }
            
        </div>
    )

}

export default DataView