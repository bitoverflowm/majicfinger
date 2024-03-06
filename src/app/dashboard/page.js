"use client"

import { useEffect } from "react"

import { useUser } from '@/lib/hooks';
import { StateProvider } from '@/context/stateContext'

import { useRouter } from "next/navigation";
import ActionMenu from "@/components/actionMenu";
import Nav from "@/components/nav";


const Dashbaord = () => {
    const user = useUser()
    const router = useRouter()

    useEffect(() => {
        if(!user){
            router.push('/login')
        }
    }, [user])

    return (
        <StateProvider>
            <Nav/>
            <div className="p-2">
                <ActionMenu />
            </div>
        </StateProvider>
    )
}

export default Dashbaord