import React, { useEffect, useState } from 'react';
import { fetchEarthquakeData } from './earthquake_helper';
import { Transition } from '@headlessui/react';

const Integrations = () => {
    const [connectData, setConnectData] = useState('');
    const [lat, setLat] = useState('32.715736');
    const [long, setLong] = useState('-117.161087');

    const fetchEarthQuakesHandler = async (lat, long) => {
        let quakes = await fetchEarthquakeData(lat, long);
        console.log(quakes);
    }

    return (
        <div className='text-xxs'>
            <div> Give it a go!  </div>
            <div>Click to pull live data:</div>
            <div className="text-xxs px-2 py-1 rounded-md hover:bg-black hover:text-white cursor-pointer" onClick={()=>setConnectData('earthquake')}>Earthquakes</div>
            <Transition 
                show={connectData === 'earthquake'}
                enter="transition-opacity duration-1000"
                enterFrom="opacity-0 h-0"
                enterTo="opacity-100 h-auto"
                leave="transition-opacity duration-150"
                leaveFrom="opacity-100 h-auto"
                leaveTo="opacity-0">
                    <div>
                        <div>Earthquake Data</div>
                        <div>Location: San Diego, CA</div>
                        <div className="px-2 py-1 rounded-sm hover:bg-black hover:text-white cursor-pointer" onClick={()=>fetchEarthQuakesHandler()}>Connect</div>
                    </div>
            </Transition>
        </div>
    );
};

export default Integrations;