import { use, useEffect, useState } from 'react';
import { AgChartsReact } from 'ag-charts-react';

import { useMyStateV2  } from '@/context/stateContextV2'


const ChartViewV2 = () => {

    const contextStateV2 = useMyStateV2()

    let previewChartOptions = contextStateV2?.previewChartOptions || {};
    let bgColor = contextStateV2?.bgColor || '';
    let bgType = contextStateV2?.bgType || '';
    let title = contextStateV2?.title || 'placeholder';
    let subTitle = contextStateV2?.subTitle || 'placeholder';



    return(
        <div className={`h-full w-full rounded-lg px-12 pb-20 pt-10 `} style={bgType === 'gradients' ? {'background-image': bgColor}:{background: bgColor}}>
            <div className='text-center text-xl font-bold py-2'>{title}</div>
            <div className='text-center text-sm font-bold py-2'>{subTitle}</div>
            <AgChartsReact options={previewChartOptions} />
            {/*<div className='text-center text-xxs'>Footnotes</div>*/}
        </div>
    )
}

export default ChartViewV2