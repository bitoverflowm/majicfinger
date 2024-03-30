import React from 'react';
import Link from 'next/link';

import { IoIosArrowRoundBack } from "react-icons/io";


const Affiliates = () => {
    return (
        <div className='flex flex-col place-items-center place-content-center bg-gradient-to-r from-soft to-softer h-screen w-full'>
            <div className="text-4xl py-4">Become a Lychee Co-Founder<div></div> without <span className='font-black italic'>ANY</span> of the headaches</div>
            <div>Join the Lychee affiliate program</div>
            <div>Earn 20% every time someone your refer signs up</div>
            <Link href="https://lych3e.promotekit.com/" className="bg-lychee-go px-3 py-2 cursor-pointer hover:bg-black hover:text-white my-4">All you gotta do is click here, sign up and start referring people to Lychee!</Link>

            <div>Imagine earning $ everytime someone bought Excel</div>
            <div>Except Lychee is even better than Excel</div>
            <Link href="/"><div className='flex gap-2 place-content-center place-items-center cursor-pointer'><IoIosArrowRoundBack /> go back</div></Link>
        </div>
    );
}

export default Affiliates;