
"use client"

import { useEffect } from "react"
import { useUser } from '@/lib/hooks';
import { useRouter } from 'next/navigation';

import Login from '@/components/login';

const LoginPage = () => {
    const user = useUser()
    const router = useRouter()


    useEffect(() => {
        if(user){
            router.push('/dashboard')
        }
    }, [user])

    return (
        <div className='h-screen w-screen'>
            <div className="max-w-48 p-4">
                <img src={"./logo.png"}/>
            </div>
            <div className="h-full flex place-content-center place-items-center">
                <Login noName={true}/>
            </div>
        </div>
    );
};

export default LoginPage;


