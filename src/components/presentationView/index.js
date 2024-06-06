import { useEffect, useState } from 'react'

import { useUser } from '@/lib/hooks';
import { useMyStateV2  } from '@/context/stateContextV2'

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"



const PresentationView = () => {
    const user = useUser()
    const contextStateV2 = useMyStateV2()

    let connectedCols = contextStateV2?.connectedCols
    let connectedData = contextStateV2?.connectedData
    let loadedDataMeta = contextStateV2?.loadedDataMeta

    //we are going to take the current connectedCols index orientation, and arbitarily assign it to each placeholder in a dictionary
    const [displayMap, setDisplayMap] = useState()
    const [projectName, setProjectName] = useState(`Wall St Bets and Sentiments`)
    const [presentationName, setPresentationName] = useState(`June 5th Bets`)
    useEffect(() => {
        if(connectedCols && connectedData){
            let colLen = connectedCols.length
            setDisplayMap({
                'title': colLen > 0 ? connectedCols[0].field : 0,
                'subTitle': colLen > 1 ? connectedCols[1].field : 0,
                'text0': colLen > 2 ? connectedCols[2].field : 0,
                'text1': colLen > 3 ? connectedCols[3].field : 0,
                'cta': colLen > 4 ? connectedCols[4].field : 0,
            })
        }
    }, [connectedData, connectedCols])

    const deployHandler = async() => {
        fetch(`/api/presentations/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                project_name: projectName, // think of this as the "folder" that could encompass multiple presentations
                presentation_name: presentationName, // this specific instance presentation
                display_map: displayMap,
                data_meta: loadedDataMeta,
                data_snap_shot: connectedData, // we will change connectedData to an internal state so that user can segment data
                user_id: user.userId,
            }),
        }).then(response => response.json())
        .then(data => {console.log("presentation saved: ", data)})
    }

    return(
        <div className='p-10'>
            <div className='bg-black text-white p-2 rounded-sm cursor-pointer' onClick={()=>deployHandler()}>Deploy</div>
            {displayMap ? 
                <div className='grid grid-cols-3 gap-4'>
                    {
                        connectedData.length > 0 ? 
                            connectedData.map((row) => (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{row[displayMap.title] ? row[displayMap.title] : 'title' }</CardTitle>
                                        <CardDescription>{row[displayMap.subTitle] ? row[displayMap.subTitle] : 'subTitle' }</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p>{row[displayMap.text0] ? row[displayMap.text0] : 'text 0' }</p>
                                        </CardContent>
                                        <CardFooter>
                                            <p>{row[displayMap.text1] ? row[displayMap.text1] : 'text 0' }</p>
                                        </CardFooter>
                                        {
                                            displayMap.cta > 0 && <Link href={'https://x.com/misterrpink1'}>Go to {row[displayMap.cta]}</Link>
                                        }
                                </Card>
                            ))
                            :<div>This dataset you have selected is currently empty. Add some data to create your presentations</div>
                    }
                </div>
                : <div>Load a dataset to start generating your presentations</div>
            }             
        </div>
    )    
}

export default PresentationView