"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function PresentationPage({ params }) {
  const { username, projectName, presentationName } = params;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const [mainTitle, setMainTitle] = useState()
  const [subTitle, setSubTitle] = useState()
  const [userHandle, setUserHandle] = useState()
  const [displayMap, setDisplayMap] = useState()
  const [dataSnapShot, setDataSnapShot] = useState()
  const [template, setTemplate] = useState()
  const [palette, setPalette] = useState()

  useEffect(() => {
    const fetchPublicationData = async () => {
        try {
            const response = await fetch(`/api/presentations/easy/${username}/${projectName}/${presentationName}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const result = await response.json();
            setData(result.data);
            setMainTitle(result.data.main_title)
            setSubTitle(result.data.sub_title)
            setUserHandle(username)
            setDisplayMap(result.data.display_map)
            setDataSnapShot(result.data.data_snap_shot)
            setTemplate(result.data.template)
            setPalette(result.data.palette)
        } catch (error) {
          setError(error.message);
        }
    };

    if(username && projectName && presentationName){
        fetchPublicationData();
    }
  }, [username, projectName, presentationName]);

  if (error) {
    return <div>Error: {error}</div>
  }

  if (!data) {
    return <div>Loading...</div>
  }

  const getRandomColor = () => {
    return palette[Math.floor(Math.random() * palette.length)];
  };

  const renderLinkOrButton = (url) => {
    return isValidLink(url) ? (
      <Link rel="noopener noreferrer" target="_blank" href={url}>
        <div className='bg-black px-3 py-1 rounded-md text-white text-xs cursor-pointer hover:bg-lychee_green hover:text-black'>Go</div>
      </Link>
    ) : (
      <div className='bg-gray-400 px-3 py-1 rounded-md text-white text-xs cursor-not-allowed'>Go</div>
    );
  };

  const isValidLink = (url) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  return (
    <div className='p-10'>
        <div className="flex gap-10">
            <div className={`border border-slate-100 rounded-xl w-full p-10`}>
                <div className='h-96 text-center flex flex-col place-items-center
                place-content-center'>
                    <h1 className="py-6 scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                        {mainTitle}
                    </h1>
                    <p className="text-sm text-muted-foreground py-2 w-1/2">{subTitle}</p>
                    <p className="text-xs text-muted-foreground">
                        Created by
                        <Link rel="noopener noreferrer" target="_blank" href={'https://x.com/misterrpink1'}>
                            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                @{userHandle}
                            </code>
                        </Link> 
                        using
                        <Link rel="noopener noreferrer" target="_blank" href="https://www.lych3e.com/#easyLychee">
                            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                EasyLychee
                            </code>
                        </Link>
                    </p>
                    <Link target="_blank" rel="noopener noreferrer" href="https://www.producthunt.com/posts/launchshortcut?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-launchshortcut" passHref>
                            <img
                                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=470412&theme=dark"
                                alt="LaunchShortcut - Where to launch your product for max revenue and traffic | Product Hunt"
                                style={{ width: '150px', height: '30px' }}
                                width="250"
                                height="54"
                                className='mt-4'
                            />
                    </Link>                                           
                </div>
                {
                    template === 'classic' && 
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                            {displayMap && dataSnapShot && dataSnapShot.length > 0 ?
                                    dataSnapShot.map((data, index) => (
                                    <Card key={index} className="flex flex-col h-full">
                                        <CardHeader className={`w-full items-center rounded-md py-20`} style={{backgroundColor: getRandomColor()}}>
                                            <small className="text-white text-sm font-medium leading-none">{data[displayMap.name] ? data[displayMap.name] : '-'}</small>
                                        </CardHeader>
                                        <CardContent className="py-4 grow">
                                            <p className="text-sm pt-1 text-muted-foreground pb-2">{data[displayMap.description] ? data[displayMap.description] : '-'}</p>
                                        </CardContent>
                                        <CardFooter className="flex place-content-end">
                                            {renderLinkOrButton(data[displayMap.link])}
                                        </CardFooter>
                                    </Card>
                                ))
                                : <Card key={0} className="flex flex-col h-full">
                                        <CardHeader className={`w-full items-center rounded-md py-20`} style={{backgroundColor: getRandomColor()}}>
                                            <small className="text-white text-sm font-medium leading-none">Connect Data First</small>
                                        </CardHeader>
                                        <CardContent className="py-4 grow">
                                            <p className="text-sm pt-1 text-muted-foreground pb-2">You haven't connected data yet. But this is how a basic card will look</p>
                                        </CardContent>
                                        <CardFooter className="flex place-content-end">
                                        {
                                            <Link rel="noopener noreferrer" target="_blank" href={''}><div className='bg-black px-3 py-1 rounded-md text-white text-xs cursor-pointer hover:bg-lychee_green hover:text-black'>Go</div></Link>
                                        }
                                        </CardFooter>
                                    </Card>
                            }
                        </div>
                }
            </div>
        </div>
    </div>
  );
}
