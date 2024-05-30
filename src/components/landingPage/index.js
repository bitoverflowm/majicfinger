import React from 'react';

import { Hero } from './hero';
import { SocialProofTestimonials } from './testimonials';
import Link from 'next/link';

 
const LandingPage = () => {

    return (
        <div className='font-body sm:pt-5 text-black' >
            <Hero/>            
            <SocialProofTestimonials />
            <Link className="text-xs fixed bottom-3 right-3 bg-lychee_go text-lychee_black hover:bg-lychee_blue hover:text-lychee_white font-[600] p-2 rounded-sm" href={"/dashboard"}> Try For Free</Link>
        </div>
    );
};

export default LandingPage;
 
