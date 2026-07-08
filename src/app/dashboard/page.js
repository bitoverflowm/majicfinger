"use client"

import Script from 'next/script'

import { Suspense, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { isGuidedGuestHubQueryDraft, loadHubQueryDraft } from "@/lib/hubs/hubQueryDraft"

const GUEST_GUIDED_USER = {
    userId: "guided-guest",
    email: "guest@guided.lychee",
    name: "Guest",
}

function DashboardLoading() {
    return (
        <div className="flex min-h-svh w-full flex-col items-center justify-center gap-3 bg-background px-6 text-muted-foreground">
            <p className="text-sm font-medium">Loading…</p>
            <Progress indeterminate className="h-2.5 w-full max-w-xs" indicatorClassName="bg-primary" />
        </div>
    )
}

function DashboardInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const hubQueryHandoff = searchParams.get("hubQuery") === "1"
    const guidedGuestSession = useMemo(() => {
        if (!hubQueryHandoff || typeof window === "undefined") return false
        return isGuidedGuestHubQueryDraft(loadHubQueryDraft())
    }, [hubQueryHandoff])

    const { data: user, isLoading } = useSWR("/api/user", userSwrFetcher)

    useEffect(() => {
        if (isLoading) return
        if (!user && !guidedGuestSession) {
            router.replace("/login")
        }
    }, [isLoading, user, router, guidedGuestSession])

    if (!guidedGuestSession && (isLoading || !user)) {
        return <DashboardLoading />
    }

    const sessionUser = user || GUEST_GUIDED_USER

    return (
        <div>
            <Script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js" strategy="afterInteractive"/>
            <StateProvider>
                <StateProviderV2 initialSettings={{ viewing: "connectDataHome" }}>
                    {!guidedGuestSession ? <AuthenticatedJourneyInit user={sessionUser} /> : null}
                    <LiveStreamManager />
                    <Toaster />
                    <main className="flex min-h-svh flex-col">
                        {!guidedGuestSession ? <RunYourselfLoaderGate userId={sessionUser.userId} /> : null}
                        <HubQueryLoaderGate />
                        <DashBody user={sessionUser} guidedGuestSession={guidedGuestSession} />
                    </main>
                </StateProviderV2>
            </StateProvider>
        </div>
    )
}

const Dashbaord = () => {
    return (
        <Suspense fallback={<DashboardLoading />}>
            <DashboardInner />
        </Suspense>
    )
}

export default Dashbaord
