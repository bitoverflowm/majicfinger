import React from 'react';

import { colorPalettes } from '@/components/chartView/panels/colorPalette';
import { bgPalette } from '@/components/chartView/panels/bgPalette';


const KatsuColors = ({updateBgColor, mod}) => {
    // Your component logic here
    
    return (
        <div>
            <div className="flex flex-wrap gap-2 pr-2 pb-4 pl-2 py-6">
            {
                bgPalette && bgPalette.solids.map((solid, key) => (
                    <div
                        key={key}
                        className={'flex rounded-md h-6 w-6 cursor-pointer hover:border hover:border-black'}
                        onClick={()=>updateBgColor(solid)}
                        style={{background: solid}}/>
                ))
            }
            </div>
        </div>
    );
};

export default KatsuColors;