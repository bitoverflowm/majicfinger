import { useState } from 'react'

import { useMyStateV2  } from '@/context/stateContextV2'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

//import Image from 'next/image'
import GridView from '@/components/gridView'
import { VscCircleFilled } from 'react-icons/vsc'

const NewSheetView = ({user, startNew}) => {
    const contextStateV2 = useMyStateV2()

    const connectedData = contextStateV2?.connectedData
    const loadedDataMeta = contextStateV2?.loadedDataMeta
    const setViewing = contextStateV2?.setViewing

    return(
        <div className='w-full px-10'>
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
                <div className='min-h-screen'> <GridView startNew={startNew}/> </div>
        </div>
    )

}

export default NewSheetView