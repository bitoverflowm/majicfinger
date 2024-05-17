'use client'

import React, { useEffect, useState } from 'react';

import { useUser, mutateUser } from '@/lib/hooks';
import { Magic } from 'magic-sdk';
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { useRouter } from 'next/navigation';

import { useMyStateV2  } from '@/context/stateContextV2'

import { Button } from '../ui/button';

const Login = ({noName}) => {
    const contextStateV2 = useMyStateV2()
    const setViewing = contextStateV2?.setViewing

    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter()

    const user = useUser()

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Your async logic here
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
                //setViewing('dataStart')
            } else {
                console.error("Magic Login Failed", await res.text())
                alert("There was an issue with login and sub, please message @misterrpink1 on twitter.")
                setLoading(false)
            }
    };

    return (
        <div className='flex place-items-center place-content-center h-dvh w-full'>
            <div className='bg-black font-body shadow-2xl rounded-xl text-white p-4 mb-4 w-96 mx-auto'>
                {
                user ? 
                    <div>
                        <h1>Welcome to Lychee {user.email}</h1>
                        <div>You have an account</div>
                        <Button onClick={()=>setViewing('dashboard')} >Go to your dashboard</Button>
                    </div>
                    :
                    <form onSubmit={handleSubmit} className='flex flex-col place-items-center'>
                        {
                            loading 
                            ?
                                <div>
                                    <AiOutlineLoading3Quarters className='animate-spin'/>
                                    Loading...
                                </div>
                                : <>
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
                                    <button type="submit" className='bg-lychee-black px-6 rounded-md py-2 text-sm mt-4'>Submit</button>
                                </>
                        }                        
                    </form>
                }
            </div>
        </div>
    );
};

export default Login;