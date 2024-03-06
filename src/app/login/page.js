
"use client"

import { useEffect } from "react"
import { useUser } from '@/lib/hooks';

import Login from '@/components/login';

const LoginPage = () => {
    const user = useUser()

    useEffect(() => {
        if(user){
            router.push('/dashboard')
        }
    }, [user])

    return (
        <div className='flex h-screen w-screen place-items-center place-content-center'>
            <div>
                <Login noName={true}/>
            </div>
        </div>
    );
};

export default LoginPage;


