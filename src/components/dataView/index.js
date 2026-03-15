import { useEffect, useState } from 'react'

import { useMyStateV2  } from '@/context/stateContextV2'
import { HardDriveUpload, Cable, Shovel, FilePlus2, PanelRightOpen } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

//import Image from 'next/image'
import GridView from '@/components/gridView'
import { VscCircleFilled } from 'react-icons/vsc'

const DataView = ({user}) => {
    const contextStateV2 = useMyStateV2()

    const [sheetId,setSheetId] = useState(0)

    const connectedData = contextStateV2?.connectedData
    const loadedDataMeta = contextStateV2?.loadedDataMeta
    const setConnectedData = contextStateV2?.setConnectedData
    const setViewing = contextStateV2?.setViewing
    const setIntegrationSidebar = contextStateV2?.setIntegrationSidebar
    const integrationSidebar = contextStateV2?.integrationSidebar
    const multiSheetFlag = contextStateV2?.multiSheetFlag
    const multiSheetData = contextStateV2?.multiSheetData
    const sheetNames = contextStateV2?.sheetNames
    const dataSheets = contextStateV2?.dataSheets
    const activeSheetId = contextStateV2?.activeSheetId
    const setActiveSheetId = contextStateV2?.setActiveSheetId

    const sheetSwitchHandler = (sheetName, id) => {
        setConnectedData(multiSheetData[sheetName])
        setSheetId(id)
    }

    const dataSheetIds = dataSheets ? Object.keys(dataSheets) : []
    const hasMultipleDataSheets = dataSheetIds.length > 1
    const showGrid = (connectedData?.length > 0) || hasMultipleDataSheets || integrationSidebar

    return(
        <div className='min-w-0 max-w-full px-2 sm:px-4 md:px-6'>                       
            {hasMultipleDataSheets && (
                <div className='flex flex-wrap gap-1 mb-2'>
                    {dataSheetIds.map((id) => (
                        <code
                            key={id}
                            className={`${id === activeSheetId ? 'bg-lychee_blue/30' : 'bg-yellow-200/30 cursor-pointer hover:bg-lychee_blue/80 hover:text-lychee_white'} relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold`}
                            onClick={() => setActiveSheetId?.(id)}
                        >
                            {dataSheets[id]?.name || id}
                        </code>
                    ))}
                </div>
            )}
            {multiSheetFlag && (
                <div className='flex flex-wrap gap-1 mb-2'>
                    {Object.keys(multiSheetData).map((sheetName, index) => (
                        <code key={index} className={`${sheetName === sheetNames[sheetId] ? 'bg-lychee_blue/30' : 'bg-yellow-200/30 cursor-pointer hover:bg-lychee_blue/80 hover:text-lychee_white'} relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold`} onClick={()=>sheetSwitchHandler(sheetName, index)}>
                            {sheetName}
                        </code>
                    ))}
                </div>
            )}
            {
                showGrid ? (
                <div className="relative">
                    {!integrationSidebar && setIntegrationSidebar && (
                        <button
                            type="button"
                            onClick={() => setIntegrationSidebar('polymarket')}
                            className="absolute top-0 right-0 z-10 flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs hover:bg-muted"
                        >
                            <PanelRightOpen className="h-3.5 w-3.5" />
                            Open API panel
                        </button>
                    )}
                    <div className='min-h-0 w-full max-w-full overflow-auto'> <GridView/> </div>
                </div>
                )
                : <div className="relative">
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
                            <p className="text-xs text-muted-foreground">Upload your own .csv or excel</p>
                            <p className="pt-2 text-xs text-muted-foreground">json, pdf, more coming soon</p>
                        </div>
                        <div className="p-10 text-sm object-cover transition-all hover:scale-105 cursor-pointer" onClick={()=>setViewing('integrations')}>
                            <div className='py-4'><Cable /></div>
                            <h3 className="pb-1 font-medium leading-none">Integrate</h3>
                            <p className="text-xs text-muted-foreground">Connect directly to your favorite data sources</p>
                            <p className="pt-1 text-xs text-muted-foreground">Polymarket, Kaggle, Twitter, Youtube, Instagram, Strava, etc</p>
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