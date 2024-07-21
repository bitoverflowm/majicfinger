'use client'

import React, { useEffect, useState } from 'react';

import { useUser, mutateUser } from '@/lib/hooks';
import { Magic } from 'magic-sdk';
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { useRouter } from 'next/navigation';

import { useMyStateV2  } from '@/context/stateContextV2'

import { Button } from '../ui/button';
import { Progress } from '../ui/progress';

const Login = ({fromHome}) => {
    const router = useRouter()
    const contextStateV2 = useMyStateV2()
    const setViewing = contextStateV2?.setViewing

    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0); // Progress state

    const user = useUser()

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setProgress(0); // Reset progress bar
        const timer = setInterval(() => {
            setProgress((prev) => Math.min(prev + 10, 90)); // Increment progress
        }, 3000);
        const magic = new Magic(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY)
        const didToken = await magic.auth.loginWithMagicLink({ email: email })

        const body = {
            email: email,
            name: name,
        }
        let res = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + didToken,
            },
            body: JSON.stringify( body ),
        })
        if(res.status === 200){
            mutateUser()
            setLoading(false)
            clearInterval(timer);
            setProgress(100); // Complete progress
        } else {
            console.error("Magic Login Failed", await res.text())
            alert("There was an issue with login and sub, please message @misterrpink1 on twitter.")
            setLoading(false)
        }            
    };

    return (
        <div className='flex flex-col place-items-center place-content-center h-dvh w-full'>
            {
                loading ?
                    <Progress value={progress} className="w-[60%]" />
                    :<>
                        <div className='bg-lychee_blue font-body shadow-2xl rounded-xl text-white p-4 mb-4 w-96 mx-auto'>
                            {   
                            user ? 
                                <div>
                                    <h1>Welcome to Lychee {user.email}</h1>
                                    <div>You have an account</div>
                                    <Button onClick={()=> fromHome ? router.push('/dashboard') : setViewing('dashboard')} >Go to your dashboard</Button>
                                </div>
                                :
                                <form onSubmit={handleSubmit} className='flex flex-col place-items-center'>
                                    <div className='py-2 text-sm'>
                                        Name
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                
                                            className='rounded px-2 mx-2 py-2 text-black text-xs w-64'
                                            />
                                    </div>
                                    <div className='py-2 text-sm'>
                                        Email
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className='rounded px-2 mx-2 py-2 text-black text-xs w-64'
                                        />
                                    </div>
                                    <button type="submit" className='bg-lychee_black px-6 rounded-md py-2 text-sm mt-4'>Submit</button>
                                </form>
                            }
                        </div>
                    { !(user) && <div className='w-96 text-xs pl-4'>Fill out the form above.<br/> You will receive a majic link in your email.</div>}
                </>
            }
        </div>
    );
};

export default Login;