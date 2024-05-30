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
                            I care about data security and privacy, and I think all companies/ developers / projects should. 
                        </div>
                        <div>
                            And if the time comes where profits can be made on user data, I would like to be one of the first companies to enable user's to profit along side me in the profits made from their data.
                        </div>
                        <div>
                            Addendum: May 8th 2024. Due to popular demand, you all have determined that saving data is crucial
                        </div>
                        <div>
                            When you save your data, the data is saved in Lychee databases.
                        </div>
                        <div>
                            However this data is never shared.
                        </div>
                        <div>
                            When you run data through any AI engine, it will be used by the AI and shared with any APIs connecting to the AI. 
                        </div>
                        <div>
                            I advise you not to use any AI for hypersensitive data. 
                        </div>
                        <div>
                            If you have need for partitioned data, dedicated security and dedicated AI that is segregated from external shares, you will want to join Enterprise. Here I will custom build you something for your data needs. 
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