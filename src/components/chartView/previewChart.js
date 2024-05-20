
import { AgChartsReact } from 'ag-charts-react';

import { useMyStateV2  } from '@/context/stateContextV2'


const PreviewChart = () => {

    const contextStateV2 = useMyStateV2()

    let previewChartOptions = contextStateV2?.previewChartOptions || {};

    return(
        <div className={`rounded-lg px-12 h-[600px] w-[800px]`} >
            <AgChartsReact options={previewChartOptions} />
            {/*<div className='text-center text-xxs'>Footnotes</div>*/}
        </div>
    )
}

export default PreviewChart