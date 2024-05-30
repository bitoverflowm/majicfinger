import React from 'react';
import Link from 'next/link';

import { IoIosArrowRoundBack } from "react-icons/io";
import { AffiliateCard } from './affiliateCard';


const Affiliates = () => {
    return (
        <div className='bg-lychee_black text-lychee_white h-screen flex place-content-center place-items-center'>
            <div className='text-center'>
                <div className="text-4xl py-4">Become a Co-Founder<div></div> With <span className='font-black italic'>NONE</span> of The Headaches</div>
                <div>Join the Lychee affiliate program</div>
                <div className='py-10 '>
                    <AffiliateCard />
                </div>
                <div className='py-4'>Imagine if you earned $ everytime someone bought Excel</div>
                <Link href="/"><div className='flex gap-2 place-content-center place-items-center cursor-pointer'><IoIosArrowRoundBack /> go back</div></Link>
            </div>
        </div>
    );
}

export default Affiliates;