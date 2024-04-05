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
                            I am a developer and I am committed to protecting your privacy. This policy describes how I collect and use your personal data. I encourage you to read this policy carefully.
                        </div>
                        <div>
                            I don't collect any personal info or data from you other than your email in registering.
                        </div>
                        <div>
                            If data is collected I will make it explicitly clear. However I want to make it also even more clear I do not intend on ever profiting from the practice of data collection/ harvesting.
                        </div>
                        <div>
                            And if the time comes where profits can be made on user data, I would like to be one of the first companies to enable user's to profit along side me in the profits made from their data.
                        </div>
                        <div>
                            As the platform stands right now, none of the data you upload or import are stored. 
                        </div>
                        <div>
                            That is why when you close the browser all your work disappears.
                        </div>
                        <div>
                            I will enable voting, and if the community decides that saving spreadsheets on Lychee within a dashboard is vital/ requested, then I will implement it. 
                        </div>
                        <div>
                            In doing so, I will obviously have to store your spreadsheets and imported data somewhere. 
                        </div>
                        <div>
                            Nevertheless, even now, the point of this project is to serve you users, who make my work possible.
                        </div>
                        <div>
                            So I want to keep the platform simple as far as the "product goes". All Lychee is is a platform that lets you focus on interpreting the data, rather than wrangling, cleaning, conducting math operations, of the data. 
                        </div>
                        <div>
                            And all features I build will be in that direction
                        </div>
                        <div>
                            Thank you. I will flesh this page out more in the near future.
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