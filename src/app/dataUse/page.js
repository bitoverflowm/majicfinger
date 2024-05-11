import React from 'react';
import Link from 'next/link';

import { IoIosArrowRoundBack } from "react-icons/io";

const DataUse = () => {
    return (
        <div>
            <div className ="min-h-screen w-full flex flex-col place-items-center place-content-center">
                <Link href="/"><div className='flex gap-2 place-content-center place-items-center cursor-pointer'><IoIosArrowRoundBack /> go back</div></Link>
                <div className='w-1/2 p-8 '>
                    <div className="text-6xl font-title">My Data Use Policy</div>
                    <div className='pt-6 flex flex-col gap-2'>
                        <div>
                            Hi There!
                        </div>
                        <div>
                            I don't collect any personal info or data from you other than your email when you register.
                        </div>
                        <div>
                            If data is collected I will make it explicitly clear. However I want to make it also even more clear I do not intend on ever profiting from the practice of data collection/ harvesting.
                        </div>
                        <div>
                            I care about data security and privacy, and I think all companies/ developers / projects should. 
                        </div>
                        <div>
                            And if the time comes where profits can be made on user data, I would like to be one of the first companies to enable user's to profit along side me in the profits made from their data.
                        </div>
                        <div>
                            Addendum: May 8th 2024. Due to popular demand, you all have determined that saving data is 0crucial
                        </div>
                        <div>
                            When you save your data, the data is saved in Lychee databases.
                        </div>
                        <div>
                            Howver this data is never shared. (unless indicated in certain AI features)
                        </div>
                        <Link href="https://www.twitter.com/misterrpink1">
                            MisterrPink (creator of Lychee)
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataUse;