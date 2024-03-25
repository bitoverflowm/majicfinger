import { use, useEffect, useState } from 'react';
import { AgChartsReact } from 'ag-charts-react';

import { useMyState  } from '@/context/stateContext'


const ChartView = () => {

    const contextState = useMyState()

    let chartOptions = contextState?.chartOptions || {};
    let bgColor = contextState?.bgColor || '';
    let bgType = contextState?.bgType || '';
    let title = contextState?.title || '';
    let subTitle = contextState?.subTitle || '';


    useEffect(()=> {
        if(chartOptions){
            console.log('chart Options:', chartOptions)
        }
    }, [chartOptions])


    return(
        <div className={`h-full w-full rounded-lg px-12 pb-10 pt-10 `} style={bgType === 'gradients' ? {'background-image': bgColor}:{background: bgColor}}>
            <div className='text-center text-xl font-bold py-2'>{title}</div>
            <div className='text-center text-sm font-bold py-2'>{subTitle}</div>
            <AgChartsReact options={chartOptions} />
            {/*<div className='text-center text-xxs'>Footnotes</div>*/}
        </div>
    )
}

export default ChartView