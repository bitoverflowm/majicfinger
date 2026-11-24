"use client"

import Script from 'next/script'

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"

import { StateProvider } from '@/context/stateContext'
import { StateProviderV2 } from '@/context/stateContextV2';

import DashBody, { preloadDashboardViews } from './dashBody';
import LiveStreamManager from './components/liveStreamManager';
import RestLiveFeedManager from './components/restLiveFeedManager';
import { RunYourselfLoaderGate } from './RunYourselfLoaderGate';
import { HubQueryLoaderGate } from './HubQueryLoaderGate';

import { SpectrumLoadingState } from "@/components/ui/spectrum-loading-state"
import { WORKSPACE_PROJECT_PARAM, WorkspaceProjectProvider } from "@/components/projects/workspaceProjectContext"

import { userSwrFetcher } from "@/lib/hooks"
import { rememberTerminalRequest } from "@/lib/terminalRequest"
import { AuthenticatedJourneyInit } from "@/components/analytics/AuthenticatedJourneyInit"
import { readShellSurfaceParam, SHELL_SURFACES } from "@/lib/projectsShellLaunch"

if (typeof window !== "undefined") preloadDashboardViews()

function DashboardLoading() {
    return (
        <div className="flex min-h-svh w-full flex-col items-center justify-center gap-3 bg-background px-6 text-muted-foreground">
            <SpectrumLoadingState label="Loading" />
        </div>
    )
}

function shellInitialSettings(surface) {
    if (surface === SHELL_SURFACES.integrations) {
        return { viewing: "integrations" }
    }
    if (surface === SHELL_SURFACES.historical || surface === SHELL_SURFACES.present) {
        return { viewing: "welcome", landingDemoSurface: surface }
    }
    if (surface === SHELL_SURFACES.markets || surface === SHELL_SURFACES.holders) {
        return { viewing: "welcome", landingDemoSurface: surface }
    }
    return { viewing: "welcome" }
}

function DashboardInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { data: user, isLoading } = useSWR("/api/user", userSwrFetcher)
    const shellSurface = readShellSurfaceParam(searchParams)

    useEffect(() => {
        if (isLoading) return
        if (!user) {
            rememberTerminalRequest()
            router.replace("/login")
        }
    }, [isLoading, user, router])

    if (isLoading || !user) {
        return <DashboardLoading />
    }

    return (
        <div>
            <Script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js" strategy="afterInteractive"/>
            <WorkspaceProjectProvider
                userId={user.userId}
                urlProject={searchParams.get(WORKSPACE_PROJECT_PARAM) || ""}
                loading={<DashboardLoading />}
            >
                <StateProvider>
                    <StateProviderV2 initialSettings={shellInitialSettings(shellSurface)}>
                        <AuthenticatedJourneyInit user={user} />
                        <LiveStreamManager />
                        <RestLiveFeedManager />
                        <main className="flex min-h-svh flex-col">
                            <RunYourselfLoaderGate userId={user.userId} />
                            <HubQueryLoaderGate />
                            <DashBody user={user} />
                        </main>
                    </StateProviderV2>
                </StateProvider>
            </WorkspaceProjectProvider>
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
