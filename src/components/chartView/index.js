import { use, useEffect, useState } from 'react';
import { AgChartsReact } from 'ag-charts-react';

import { useMyState  } from '@/context/stateContext'


const ChartView = () => {

    const contextState = useMyState()

    let chartOptions = contextState?.chartOptions || {};
    let bgColor = contextState?.bgColor || '';
    let bgType = contextState?.bgType || '';

    useEffect(()=> {
        if(chartOptions){
            console.log('chart Options:', chartOptions)
        }
    }, [chartOptions])


    return(
        <div className={`h-full w-full rounded-lg p-20 overflow-hidden`} style={bgType === 'gradients' ? {'background-image': bgColor}:{background: bgColor}}>
            <div className='text-center text-xl font-bold py-2'>Title</div>
            <div className='text-center text-sm font-bold py-2'>Sub title</div>
            <AgChartsReact options={chartOptions} />
            <div className='text-center text-xxs -mt-10'>Footnotes</div>
        </div>
    )
}

export default ChartView