import React from 'react';

import { Hero } from './hero';
import { SocialProofTestimonials } from './testimonials';
import Link from 'next/link';

import Particles from "../magicui/particles";

 
const LandingPage = () => {

    return (
        <div className='font-body sm:pt-5' >    
            <Hero/>
        </div>
    );
};

export default LandingPage;
 
