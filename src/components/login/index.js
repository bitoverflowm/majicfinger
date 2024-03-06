'use client'

import React, { useEffect, useState } from 'react';

import { useUser  } from '@/lib/hooks';
import { Magic } from 'magic-sdk';
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { useRouter } from 'next/navigation';


const Login = ({noName}) => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter()

    const user = useUser()

    /*useEffect(() => {
        if(user) {
            router.push('/dashboard')
        }
    }, [user])*/

    const handleSubmit = async (e) => {
        setLoading(true);
        e.preventDefault();
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
                let user = await res.json()
                router.push('/dashboard')
            } else {
                console.error("Magic Login Failed", await res.text())
                alert("There was an issue with login and sub, please message @misterrpink1 on twitter.")
            }
    };

    return (
        <div className='bg-lychee-red font-body shadow-2xl rounded-xl text-white p-4 mb-4'>
            {
            user ? 
                <div>
                    <h1>Welcome {user.email}</h1>
                    <div>You already have an account</div>
                </div>
                :
                <form onSubmit={handleSubmit} className='flex flex-col place-items-center'>
                    {
                        loading 
                           ?
                            <div><AiOutlineLoading3Quarters className='animate-spin'/>
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
    );
};

export default Login;