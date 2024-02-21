'use client'

import React, { useState } from 'react';

import { useUser  } from '@/lib/hooks';
import { Magic } from 'magic-sdk';


const Login = () => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');

    const user = useUser()

    const handleSubmit = async (e) => {
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
                body: JSON.stringify({ body }),
            })
            if(res.status === 200){
                let user = await res.json()
            } else {
                console.error("Magic Login Failed", await res.text())
                alert("There was an issue with login and sub, please message @misterrpink1 on twitter.")
            }
    };

    return (
        <div className='text-white'>
            {
            user ? 
                <div>
                    <h1>Welcome {user.email}</h1>
                    <div>You already have an account</div>
                </div>
                :
                <form onSubmit={handleSubmit}>
                    <label>
                        Name (what should we call you?):
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            />
                    </label>
                    <label>
                        Email:
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </label>
                    <button type="submit">Submit</button>
                </form>
            }
        </div>
    );
};

export default Login;