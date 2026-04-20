"use client"

import Script from 'next/script'

import { useEffect, useRef } from "react"

import { useUser } from '@/lib/hooks';
import { StateProvider } from '@/context/stateContext'
import { StateProviderV2 } from '@/context/stateContextV2';

import DashBody from './dashBody';
import LiveStreamManager from './components/liveStreamManager';

import { Toaster } from "@/components/ui/sonner"

import { toast } from "sonner"


const Dashbaord = () => {
    const user = useUser()    
    const hasShownWelcomeToastRef = useRef(false);

    useEffect(() => {
        if (hasShownWelcomeToastRef.current) return;

        // Session-level guard: avoid duplicate welcome toasts on remounts.
        const key = "dashboard_welcome_toast_shown";
        if (typeof window !== "undefined" && window.sessionStorage.getItem(key) === "1") {
            hasShownWelcomeToastRef.current = true;
            return;
        }

        if (!user) {
            toast('Welcome to Lychee!', {
                description: `I'm Mr Pink. Take a look around. Don't forget to signup to save your work.`,
                duration: 10000
              });
        } else {
            toast('Hey!', {
                description: `Welcome ${user.email}`,
                duration: 10000
              });
        }

        hasShownWelcomeToastRef.current = true;
        if (typeof window !== "undefined") {
            window.sessionStorage.setItem(key, "1");
        }
    }, [user])

    return (
        <div>
            {/*<Script async src="https://cdn.promotekit.com/promotekit.js" data-promotekit="03b8c588-8350-4a0c-97f0-0a839509e8e0" strategy="afterInteractive"/>*/}

            <Script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js" strategy="afterInteractive"/>
            <StateProvider>
                <StateProviderV2>
                    <LiveStreamManager />
                    <Toaster />
                    <main>
                        <DashBody user={user}/>
                    </main>
                </StateProviderV2>
            </StateProvider>
        </div>
    )
}

export default Dashbaord