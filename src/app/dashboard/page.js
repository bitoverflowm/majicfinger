"use client"

import Script from 'next/script'

import { GoogleAnalytics } from '@next/third-parties/google'

import { useEffect } from "react"

import { useUser } from '@/lib/hooks';
import { StateProvider } from '@/context/stateContext'
import { StateProviderV2 } from '@/context/stateContextV2';

import { useRouter } from "next/navigation";
import LycheeCore from "@/components/lycheeCore";

import Nav from "./components/nav";
import SideNav from './components/sideNav'

import { Toaster } from "@/components/ui/sonner"

import { toast } from "sonner"
import KatsuView from './components/katsuView';


const Dashbaord = () => {
    const user = useUser()
    const router = useRouter()

    const clairtyCode = `
        (function (c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "l5zqf94lap"); `

    useEffect(() => {
        if(!user){
            //router.push('/login')
        }else{
            toast('Welcome!', {
                description: "",
                closeButton: true,
                duration: 99999999
              });
        }
    }, [user])

    return (
        <div>
            <Script
                id = "ms-clarity"
                strategy="afterInteractive"
            >{clairtyCode}</Script>
            <Script async src="https://cdn.promotekit.com/promotekit.js" data-promotekit="03b8c588-8350-4a0c-97f0-0a839509e8e0" strategy="afterInteractive"/>
            <Script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js" strategy="afterInteractive"/>
            <GoogleAnalytics gaId="G-G8X2NEPTEG" />
            <StateProvider>
                <StateProviderV2>
                    <Toaster />
                    <header>
                        <Nav/>
                    </header>
                    <main className='flex place-content-center'>
                        <SideNav/>
                        { true &&
                            <div className='w-full min-h-screen'>
                                <KatsuView />
                            </div>                        
                        }
                        
                    </main>                      
                    {/*<LycheeCore />*/}
                </StateProviderV2>
            </StateProvider>
        </div>
    )
}

export default Dashbaord