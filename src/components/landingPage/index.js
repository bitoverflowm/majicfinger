"use client"

import React from 'react';

import { useMyState  } from '@/context/stateContext'


import { Hero } from './hero';
import { SocialProofTestimonials } from './testimonials';

import { UploadDataCard } from './uploadDataCard'
import { ChartCard } from './chartCard';
import { FeatureIntegrations } from './featureIntegrations';
import { FeatureAICard } from './featureAICard';

const companies = [
    "jpm",
    "goldman",
    "meta",
    "google",
    "apple",
    "mit",
  ];
 
const LandingPage = () => {
    const { setWorking } = useMyState()

    const readAbout = () => {
        const yOffset = -60; // Adjust this value based on your fixed header size or desired spacing
        const element = document.getElementById('about');
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
        window.scrollTo({top: y, behavior: 'smooth'});
    }

    return (
        <div className='font-body sm:pt-5 text-black' >
            <Hero readAbout={readAbout}/>                        
            <section id="about">
                <div className="py-14">
                    <div className="container mx-auto px-4 md:px-8">
                        <h3 className="pt-40 text-center text-sm font-semibold text-gray-500 py-8">
                            USED, TRUSTED AND BETA TESTED BY FRIENDS AT
                        </h3>
                        <div className="relative mt-6">
                            <div className="grid grid-cols-2 place-items-center place-content-center gap-2 md:grid-cols-4 xl:grid-cols-6 xl:gap-4">
                                {companies.map((logo, idx) => (
                                    <img
                                        key={idx}
                                        src={`./${logo}.svg`}
                                        className="h-10 w-28 brightness-0 invert"
                                        alt={logo}
                                    />
                                ))}
                            </div>
                            <div className="pointer-events-none absolute inset-y-0 left-0 h-full w-1/3 bg-gradient-to-r from-lychee_black"></div>
                            <div className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/3 bg-gradient-to-l from-lychee_black"></div>
                        </div>
                    </div>
                </div>
            </section>
            <SocialProofTestimonials />
        </div>
    );
};

export default LandingPage;
 
