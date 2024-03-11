import { useMyState } from '@/context/stateContext'

const ChartDataMods = () => {
    const contextState = useMyState()

    const xKey = contextState?.xKey || '';
    const setXKey = contextState?.setXKey || {};
    const yKey = contextState?.yKey || '';
    const setYKey = contextState?.setYKey || {};
    const xOptions = contextState?.xOptions || {};
    const yOptions = contextState?.yOptions || {};
    const chartTypes = contextState?.chartTypes || {};
    const directions = contextState?.directions || {};
    const direction = contextState?.direction || '';
    const setDirection = contextState?.setDirection || {};
    const type = contextState?.type || '';
    const setType = contextState?.setType || {};

    
    return (
        <div className="">
            <div className="text-xs px-2 py-2">Chart Type</div>
            <div className="flex flex-wrap gap-2 pr-2 pb-4">
                {
                    chartTypes.map(
                        (opt, key) => <div key={key} className={`px-2 py-2 border border-white rounded-lg shadow-xl text-xs cursor-pointer ${type === opt ? 'bg-black text-white hover:bg-white hover:text-black': 'bg-white text-black hover:bg-black hover:text-white'} `} onClick={()=>setType(opt)}>{opt}</div>
                    )
                }
            </div>
            <div>Choose X-axis</div>
            <div className="flex flex-wrap gap-2 pr-2 pb-4">
                {
                    xOptions && xOptions.map(
                        (opt, key) => <div key={key} className={`px-2 py-2 border border-white rounded-lg shadow-xl text-xs cursor-pointer ${xKey === opt ? 'bg-black text-white hover:bg-white hover:text-black': 'bg-white text-black hover:bg-black hover:text-white'} `} onClick={()=>setXKey(opt)}>{opt}</div>
                    )
                }
            </div>
            <div>Set Y-axis</div>
            <div className="flex flex-wrap gap-2 pr-2 pb-4">
                {
                    yOptions && yOptions.map(
                        (opt, key) => <div key={key} className={`px-2 py-2 border border-white rounded-lg shadow-xl text-xs cursor-pointer ${yKey === opt ? 'bg-black text-white hover:bg-white hover:text-black': 'bg-white text-black hover:bg-black hover:text-white'} `} onClick={()=>setYKey(opt)}>{opt}</div>
                    )
                }
            </div>
            <div>Direction</div>
            <div className="flex flex-wrap gap-2 pr-2 pb-4">
                {
                    directions && directions.map(
                        (opt, key) => <div key={key} className={`px-2 py-2 border border-white rounded-lg shadow-xl text-xs cursor-pointer ${direction === opt ? 'bg-black text-white hover:bg-white hover:text-black': 'bg-white text-black hover:bg-black hover:text-white'} `} onClick={()=>setDirection(opt)}>{opt}</div>
                    )
                }
            </div>
            
        </div>
    )
    
}

export default ChartDataMods;