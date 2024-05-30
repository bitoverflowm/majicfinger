import React from 'react';

import { Hero } from './hero';
import { SocialProofTestimonials } from './testimonials';

 
const LandingPage = () => {

    return (
        <div className='font-body sm:pt-5 text-black' >
            <Hero/>                        
            <SocialProofTestimonials />
        </div>
    );
};

export default LandingPage;
 
