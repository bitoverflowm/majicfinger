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
                    <div className="text-2xl">2. Will I be charged any additional fees after the pre-order period?</div>
                    <div>
                        No, your lifetime access purchase covers all costs. You won't be subject to any additional fees related to Lychee, even when we transition to a subscription model.
                    </div>
                </div>
                <div>
                    <div className="text-2xl">3. How do I access my lifetime access after the pre-order period ends?</div>
                    <div>
                        To access your lifetime access, make sure to complete your purchase before the pre-order period expires. Once it ends, lifetime access will no longer be available, and Lychee will transition to a subscription model.
                    </div>
                </div>
                <div>
                    <div className="text-2xl">4. Is there a trial period for lifetime access?</div>
                    <div>
                        While lifetime access doesn't include a trial period, you can wait until the pre-order offer is over and we move over to subscription plans. Keep in mind that the lifetime access won't be available by then.
                    </div>
                </div>
                <div>
                    <div className="text-2xl">5. Can I share my lifetime access with others?</div>
                    <div>
                        Your lifetime access is intended for individual use only. But, if you have team members who would like access, we have enterprise custom pricing, you can contact us at lychee@bitoverflow.org
                    </div>
                </div>
                <div>
                    <div className="text-2xl">6. What happens if I encounter issues after the pre-order period?</div>
                    <div>
                        Our dedicated support team is here to assist you. If you encounter any issues or have questions, simply reach out to lychee@bitoverflow.org , and we'll provide the support you need as soon as possible.
                    </div>
                </div>
                <div>
                    <div className="text-2xl">7. How long is the pre-order period for lifetime access?</div>
                    <div>
                        The pre-order period for lifetime access is limited time only. After this period, Lychee will transition to a subscription model, and lifetime access will no longer be available.
                    </div>
                </div>
                <div>
                    <div className="text-2xl">8. If I don't like it, can I request a refund for my lifetime access purchase?</div>
                    <div>
                        If you don't like the platform or it doesn't match your needs after you purchase, get in touch with us at lychee@bitoverflow.org and we'll refund you. No questions asked.
                    </div>
                </div>
                <div>
                    <div className="text-2xl">9. Will I receive updates and new features with my lifetime access?</div>
                    <div>
                        Yes, you'll receive all updates and new features introduced during the pre-order period and beyond as part of your lifetime access.
                    </div>
                </div>
                <div>
                    <div className="text-2xl">10. How do I secure my lifetime access after the pre-order period ends?</div>
                    <div>
                        To secure your lifetime access, make sure to complete your purchase before the pre-order period expires. Once it ends, lifetime access will no longer be available, and Lychee will transition to a subscription model.
                    </div>
                </div>
                <div className='bg-lychee-green text-lychee-black font-black text-center w-56 mx-auto hover:bg-lychee-white hover:text-lychee-black cursor-pointer px-5 py-4 rounded-full text-xs' onClick={()=>setWorking('getLychee')}>
                    I want it
                </div>

            </div>
    );
};

export default FAQ;