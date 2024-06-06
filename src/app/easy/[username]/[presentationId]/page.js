"use client"

// app/[username]/[presentationId]/page.tsx
import { useEffect, useState } from 'react'
//import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function PresentationPage({ params }) {
  const { username, presentationId } = params

  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [displayMap, setDisplayMap] = useState()
  const [connectedData, setConnectedData] = useState()
  const [projectName, setProjectName] = useState()
  const [presentationName, setPresentationName] = useState()

  useEffect(() => {
    const fetchPresentationData = async () => {
        try {
            const response = await fetch(`/api/presentations/easy/${username}/${presentationId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            if (!response.ok) {
                throw new Error('Network response was not ok')
            }
            const result = await response.json()
            setDisplayMap(result.display_map)
            setConnectedData(result.data_snap_shot)
            setProjectName(result.project_name)
            setPresentationName(result.presentation_name)
            setData(result)
        } catch (error) {
          setError(error.message)
        }
    }

    if(username && presentationId){
        console.log("params: ", username, presentationId) 
        fetchPresentationData()
    }

  }, [username, presentationId])

  if (error) {
    return <div>Error: {error}</div>
  }

  if (!data) {
    return <div>Loading...</div>
  }

  return (
    <div className='p-10'>
        <div className='text-4xl font-black'>{presentationName && presentationName}</div>
      <div className='grid grid-cols-3 gap-4'>
        {connectedData.length > 0 ? 
          connectedData.map((row) => (
            <Card key={row.id}>
              <CardHeader>
                <CardTitle>{row[displayMap.title] || 'title'}</CardTitle>
                <CardDescription>{row[displayMap.subTitle] || 'subTitle'}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>{row[displayMap.text0] || 'text 0'}</p>
              </CardContent>
              <CardFooter>
                <p>{row[displayMap.text1] || 'text 1'}</p>
              </CardFooter>
              {displayMap.cta && <a href={row[displayMap.cta]}>Go to {row[displayMap.cta]}</a>}
            </Card>
          ))
          : <div>This dataset you have selected is currently empty. Add some data to create your presentations</div>
        }
      </div>
    </div>
  )
}
