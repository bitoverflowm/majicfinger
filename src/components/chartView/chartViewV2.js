
import { AgChartsReact } from 'ag-charts-react';

import { useMyStateV2  } from '@/context/stateContextV2'
import ChartDataModsV2 from './chartDataModsV2';
import { useEffect } from 'react';


const ChartViewV2 = () => {

    const contextStateV2 = useMyStateV2()

    let previewChartOptions = contextStateV2?.previewChartOptions || {};
    let chartOptions = contextStateV2?.chartOptions || {}
    let bgColor = contextStateV2?.bgColor || '';
    let cardColor = contextStateV2?.cardColor || '';
    let textColor = contextStateV2?.textColor || '';
    let titleHidden = contextStateV2?.titleHidden
    let titleFont = contextStateV2?.titleFont
    let title = contextStateV2?.title || 'Give Your Chart a Title';
    let subTitle = contextStateV2?.subTitle || 'Add a description';

    useEffect(()=> {
        console.log('options: ', titleFont)
    }, [titleFont])

    return(
        <div className='grid grid-cols-12 pl-5 py-12 place-items-center place-content-center gap-6 gradualEffect'>
            {/*Start of background card. WE need spacing, otherwise it looks bad */}
            <div className={`col-span-8 h-full rounded-lg pb-10 pt-10 `} style={{background: bgColor && bgColor}}>
                <div className='w-full h-[700px] rounded-lg p-20 internalGradualEffect' style={{background: cardColor && cardColor}}>
                    { !titleHidden && <div className='text-center text-xl font-bold py-2' style={{color: textColor && textColor, fontFamily: titleFont}}>{title}</div>}                    
                    <div className='text-center text-sm font-bold py-2' style={{color: textColor && textColor}}>{subTitle}</div>
                    <AgChartsReact options={chartOptions ? chartOptions : previewChartOptions} />
                </div>                
                {/*<div className='text-center text-xxs'>Footnotes</div>*/}
            </div>
            <div className='col-span-4'>
                <ChartDataModsV2 />
            </div>
        </div>
    )
}

export default ChartViewV2