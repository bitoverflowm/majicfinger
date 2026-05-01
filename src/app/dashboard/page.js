"use client"

import Script from 'next/script'

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"

import { StateProvider } from '@/context/stateContext'
import { StateProviderV2 } from '@/context/stateContextV2';

import DashBody from './dashBody';
import LiveStreamManager from './components/liveStreamManager';

import { Toaster } from "@/components/ui/sonner"
import { Progress } from "@/components/ui/progress"

import { toast } from "sonner"
import { userSwrFetcher } from "@/lib/hooks"

const Dashbaord = () => {
    const router = useRouter()
    const { data: user, isLoading } = useSWR("/api/user", userSwrFetcher)
    const hasShownWelcomeToastRef = useRef(false);

    useEffect(() => {
        if (isLoading) return
        if (!user) {
            router.replace("/login")
        }
    }, [isLoading, user, router])

    useEffect(() => {
        if (!user) return
        if (hasShownWelcomeToastRef.current) return

        // Session-level guard: avoid duplicate welcome toasts on remounts.
        const key = "dashboard_welcome_toast_shown";
        if (typeof window !== "undefined" && window.sessionStorage.getItem(key) === "1") {
            hasShownWelcomeToastRef.current = true;
            return;
        }

        toast('Hey!', {
            description: `Welcome ${user.email}`,
            duration: 10000
        })

        hasShownWelcomeToastRef.current = true;
        if (typeof window !== "undefined") {
            window.sessionStorage.setItem(key, "1");
        }
    }, [user])

    if (isLoading || !user) {
        return (
            <div className="flex min-h-svh w-full flex-col items-center justify-center gap-3 bg-background px-6 text-muted-foreground">
                <p className="text-sm font-medium">Loading…</p>
                <Progress indeterminate className="h-2.5 w-full max-w-xs" indicatorClassName="bg-primary" />
            </div>
        )
    }

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