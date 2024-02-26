
"use client"

import Login from '@/components/login';

const LoginPage = () => {

    return (
        <div className='flex h-screen w-screen place-items-center place-content-center'>
            <div>
                <Login noName={true}/>
            </div>
        </div>
    );
};

export default LoginPage;


