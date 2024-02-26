"use client"

import { useState, useEffect, useRef, use } from "react"

import { useUser } from '@/lib/hooks';
import { StateProvider } from '@/context/stateContext'

import { useRouter } from "next/navigation";
import ActionMenu from "@/components/actionMenu";


const Dashbaord = () => {
    const user = useUser({ redirectTo: '/', redirectIfNotFound: true })
    const router = useRouter()

    useEffect(() => {
        if(!user){
            router.push('/')
        }
    },[user])

    return (
        <StateProvider>
            <ActionMenu />
        </StateProvider>
    )
}

export default Dashbaord