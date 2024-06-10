import React from 'react';

import { Hero } from './hero';
import { SocialProofTestimonials } from './testimonials';
import Link from 'next/link';

 
const LandingPage = () => {

    return (
        <div className='font-body sm:pt-5 text-black' >
            <Hero/>            
            <SocialProofTestimonials />
            <div className='w-full flex fixed bottom-0 sm:bottom-5 sm:pr-5 z-20 place-content-center sm:place-content-end '>
                <Link className='text-center w-full sm:w-32 bg-green-600 sm:bg-green-600 p-2 rounded-t-xl sm:rounded-md hover:border hover:border-white' href={"/dashboard"}>
                    <div className="text-white text-xs rounded-sm"> Start </div>
                    <div className="text-center text-[10px] pt-1 text-lychee_white">
                        No card or registration required
                    </div>
                </Link>
            </div>            
        </div>
    );
};

export default LandingPage;
 
