
import { useMyStateV2  } from '@/context/stateContextV2'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

//import Image from 'next/image'
import GridView from '@/components/gridView'
import { VscCircleFilled } from 'react-icons/vsc'
import { DemoSignUpBadge } from "@/components/demo/DemoSignUpBadge"
import { useRouter } from "next/navigation"

const NewSheetView = ({user, startNew}) => {
    const router = useRouter()
    const contextStateV2 = useMyStateV2()
    const isDemo = contextStateV2?.isDemo

    return(
        <div className='w-full px-10'>
            {isDemo ? (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold leading-snug tracking-tight sm:text-base">
                        New sheet
                    </h2>
                    <DemoSignUpBadge />
                </div>
            ) : null}
            {
                !(user) && 
                    <Alert onClick={() => router.push('/login')} className="cursor-pointer">
                        <VscCircleFilled className="h-5 w-5"/>
                        <AlertTitle className="text-xs">Want to save your work?</AlertTitle>
                        <AlertDescription className="text-xs" >
                                Click here to register.
                        </AlertDescription>
                    </Alert>
            }                     
                <div className='min-h-screen'> 
                    <GridView startNew={startNew}/> 
                </div>
        </div>
    )

}

export default NewSheetView