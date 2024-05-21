
import { AgChartsReact } from 'ag-charts-react';

import { useMyStateV2  } from '@/context/stateContextV2'
import ChartDataModsV2 from './chartDataModsV2';


const ChartViewV2 = () => {

    const contextStateV2 = useMyStateV2()

    let previewChartOptions = contextStateV2?.previewChartOptions || {};
    let chartOptions = contextStateV2?.chartOptions || {}
    let bgColor = contextStateV2?.bgColor || '';
    let cardColor = contextStateV2?.cardColor || '';
    let textColor = contextStateV2?.textColor || '';
    let title = contextStateV2?.title || 'placeholder';
    let subTitle = contextStateV2?.subTitle || 'placeholder';

    return(
        <div className='h-full w-full flex gap-6 gradualEffect'>
            <div className={`w-4/5 h-full rounded-lg px-12 pb-10 pt-10 `} style={{background: bgColor && bgColor}}>
                <div className='w-full h-full rounded-lg p-20 internalGradualEffect' style={{background: cardColor && cardColor}}>
                    <div className='text-center text-xl font-bold py-2' style={{color: textColor && textColor}}>{title}</div>
                    <div className='text-center text-sm font-bold py-2' style={{color: textColor && textColor}}>{subTitle}</div>
                    <AgChartsReact options={chartOptions ? chartOptions : previewChartOptions} />
                </div>                
                {/*<div className='text-center text-xxs'>Footnotes</div>*/}
            </div>
            <ChartDataModsV2 />

        </div>
    )
}

export default ChartViewV2