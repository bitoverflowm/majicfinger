import React from 'react';
import { useState } from 'react';

import { AiOutlineLoading3Quarters } from "react-icons/ai";

import GridView from '../../gridView';


const TwitterIntegration = ({ setData, setDflt}) => {
    // Your component logic goes here
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);

    const fetchTwitterHandler = async (handle) => {
        setLoading(true);
        // Append the handle as a query parameter in the URL
        const url = new URL('/api/integrations/twitter', window.location.origin);
        url.searchParams.append('handle', handle);

        try {
            let res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (res.status === 200) {
                let twitterUserData = await res.json();
                console.log(twitterUserData);
                setConnected(true);
                setDflt(false);
            } else {
                console.error("Twitter User Data pull failed");
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        // Your JSX code goes here
        <div>
            <div className='px-2 py-1 bg-black text-white hover:bg-white hover:text-black ' onClick={()=>fetchTwitterHandler('misterrpink1')}>Get</div>
            
                {   loading &&
                    <div className='flex place-items-center animate-pulse gap-2'>
                        <AiOutlineLoading3Quarters className='animate-spin'/>
                            Loading...
                    </div>
            }
            {
                connected && <div>
                                <div>Twitter has been connected. </div>
                                <div>Go to Table or Chart to view the full data set</div>
                                <div>The data below is just a preview</div>
                            </div>
            }
            {
                connected && <div className='h-96 w-full'>
                                <GridView sample={true}/>
                            </div>
                            }
                        
        </div>
    );
};

export default TwitterIntegration;