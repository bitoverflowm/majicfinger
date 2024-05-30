"use client"

import Script from 'next/script'

import { GoogleAnalytics } from '@next/third-parties/google'

import { useEffect } from "react"

import { useUser } from '@/lib/hooks';
import { StateProvider } from '@/context/stateContext'
import { StateProviderV2 } from '@/context/stateContextV2';
import { useMyStateV2  } from '@/context/stateContextV2'

import DashBody from './dashBody';
import Nav from "./components/nav";


import { Toaster } from "@/components/ui/sonner"

import { toast } from "sonner"

const Dashbaord = () => {
    const user = useUser()    

    const clairtyCode = `
        (function (c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "l5zqf94lap"); `

    useEffect(() => {
        if(!user){
            toast('Welcome to Lychee!', {
                description: `I'm Mr Pink the inventor of this thing. Take a look around. Don't forget to signup to save your work.`,
                duration: 4000
              });
        }else{
            toast('Hey!', {
                description: `Welcome ${user.email}`,
                duration: 3000
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
                    <main className=''>
                        <DashBody user={user}/>
                    </main>
                </StateProviderV2>
            </StateProvider>
        </div>
    )
}

export default Dashbaord