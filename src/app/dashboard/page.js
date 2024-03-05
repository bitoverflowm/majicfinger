"use client"

import { useEffect } from "react"

import { useUser } from '@/lib/hooks';
import { StateProvider } from '@/context/stateContext'

import { useRouter } from "next/navigation";
import ActionMenu from "@/components/actionMenu";


const Dashbaord = () => {
    const user = useUser()
    const router = useRouter()

    useEffect(() => {
        if(!user){
            router.push('/login')
        }
    },[user])

    return (
        <StateProvider>
            <ActionMenu />
        </StateProvider>
    )
}

export default Dashbaord