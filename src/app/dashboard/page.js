"use client"

import Script from 'next/script'

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"

import { StateProvider } from '@/context/stateContext'
import { StateProviderV2 } from '@/context/stateContextV2';

import DashBody from './dashBody';
import LiveStreamManager from './components/liveStreamManager';
import { RunYourselfLoaderGate } from './RunYourselfLoaderGate';
import { HubQueryLoaderGate } from './HubQueryLoaderGate';

import { Toaster } from "@/components/ui/sonner"
import { Progress } from "@/components/ui/progress"

import { userSwrFetcher } from "@/lib/hooks"
import { AuthenticatedJourneyInit } from "@/components/analytics/AuthenticatedJourneyInit"

const Dashbaord = () => {
    const router = useRouter()
    const { data: user, isLoading } = useSWR("/api/user", userSwrFetcher)

    useEffect(() => {
        if (isLoading) return
        if (!user) {
            router.replace("/login")
        }
    }, [isLoading, user, router])

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
                    <AuthenticatedJourneyInit user={user} />
                    <LiveStreamManager />
                    <Toaster />
                    <main className="flex min-h-svh flex-col">
                        <RunYourselfLoaderGate userId={user.userId} />
                        <HubQueryLoaderGate />
                        <DashBody user={user}/>
                    </main>
                </StateProviderV2>
            </StateProvider>
        </div>
    )
}

export default Dashbaord