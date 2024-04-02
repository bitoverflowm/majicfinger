'use client'
import React from 'react';

import { useMyState } from '@/context/stateContext'


const FAQ = () => {
    const { setWorking } = useMyState()

    return (
            <div className="p-4 w-96 sm:w-full sm:max-w-2xl sm:mx-auto flex flex-col gap-6">
                <div className="text-4xl sm:text-8xl font-bold mb-4"><span className='text-lychee-peach'>Frequently</span> Asked Questions</div>
                <div>
                    <div className="text-2xl">1. What does the lifetime access offer include?</div>
                    <div>
                        With lifetime access, you'll enjoy uninterrupted use of Lychee, including all current and future features covered by your purchase.
                    </div>
                </div>
                <div>
                    <div className="text-2xl">2. Is there a trial period for lifetime access?</div>
                    <div>
                        While lifetime access doesn't include a trial period, you can wait until the pre-order offer is over and we move over to subscription plans. Keep in mind that the lifetime access won't be available by then.
                    </div>
                </div>
                <div>
                    <div className="text-2xl">3. Can I share my access with others?</div>
                    <div>
                        Your account is intended for individual use only. But, if you have team members who would like access, we have enterprise custom pricing, you can contact us at lychee@bitoverflow.org
                    </div>
                </div>
                <div>
                    <div className="text-2xl">4. Will I receive updates and new features with my lifetime access?</div>
                    <div>
                        Yes, you'll receive all updates and new features introduced during the pre-order period and beyond as part of your lifetime access.
                    </div>
                </div>
                <div className='bg-lychee-green text-lychee-black font-black text-center w-56 mx-auto hover:bg-lychee-white hover:text-lychee-black cursor-pointer px-5 py-4 rounded-full text-xs' onClick={()=>setWorking('getLychee')}>
                    I want it
                </div>

            </div>
    );
};

export default FAQ;