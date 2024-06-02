import React from 'react';

import { Hero } from './hero';
import { SocialProofTestimonials } from './testimonials';
import Link from 'next/link';

 
const LandingPage = () => {

    
    const revealVariants = {
        initial: { opacity: 0, x: '-100%' },
        animate: { opacity: 1, x: '0%' }
    };

    const companies = [
        "jpm",
        "goldman",
        "meta",
        "google",
        "apple",
        "mit",
        "openai",
      ];

    return (
        <div className='font-body sm:pt-5 text-black' >
            <Hero/>            
            <SocialProofTestimonials />
            <div className="w-full flex place-content-center pb-20">
                <div className="container mx-auto px-4 md:px-8">
                    <h3 className="py-4 sm:pt-40 sm:py-8 text-center text-sm font-semibold text-slate-400">
                        ACTIVELY BETA TESTED BY FRIENDS AT
                    </h3>
                    <div className="mt-6">
                        <div className="flex flex-wrap gap-8 place-items-center place-content-center sm:grid sm:gap-2 md:grid-cols-4 xl:grid-cols-7 xl:gap-4">
                            {companies.map((logo, idx) => (
                                <img
                                    key={idx}
                                    src={`./${logo}.svg`}
                                    className="h-10 w-28 brightness-0 invert"
                                    alt={logo}
                                />
                            ))}
                        </div>
                        <div className="pointer-events-none inset-y-0 left-0 w-1/6 bg-gradient-to-r from-lychee_black"></div>
                        <div className="pointer-events-none inset-y-0 right-0 w-1/6 bg-gradient-to-l from-lychee_black"></div>
                    </div>
                </div>
            </div>
            <div className='w-full flex fixed bottom-0 z-20 place-content-center'>
                <Link className='text-center w-full sm:w-2/5 bg-green-600/70 p-2 rounded-t-xl hover:border hover:border-white' href={"/dashboard"}>
                    <div className="text-white text-xs rounded-sm"> Click Here Launch Lychee </div>
                    <div className="text-center text-[10px] pt-1 text-lychee_white">
                        No card or registration required
                    </div>
                </Link>
            </div>            
        </div>
    );
};

export default LandingPage;
 
