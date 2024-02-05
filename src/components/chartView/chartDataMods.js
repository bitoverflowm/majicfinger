import { useEffect, useState } from "react";

const ChartDataMods = ({fmtCols, setType, setXKey, setYKey}) => {
    const [xOptions, setXOptions] = useState()
    const [yOptions, setYOptions] = useState()
    const [chartOptions, setChartOptions] = useState(['bar', 'line', 'area', 'scatter', 'bubble', 'pie', 'histogram', 'combination'])

    const extractData = (cols) => {
        let arr = cols.map(items => items.field)
        setXOptions(arr)
        setYOptions(arr)
    }

    useEffect(()=> {
        fmtCols && extractData(fmtCols)
    }, [fmtCols])
    
    return (
        <div className="">
            <div className="text-xs px-2 py-2">Chart Type</div>
            <div className="flex flex-wrap gap-2 pr-2 pb-4">
                {
                    chartOptions.map(
                        (opt, key) => <div key={key} className="px-2 py-2 border border-white rounded-lg shadow-xl hover:bg-black hover:text-white text-xs cursor-pointer" onClick={()=>setType(opt)}>{opt}</div>
                    )
                }
            </div>
            <div>Choose X-axis</div>
            <div className="flex flex-wrap gap-2 pr-2 pb-4">
                {
                    xOptions && xOptions.map(
                        (opt, key) => <div key={key} className="px-2 py-2 border border-white rounded-lg shadow-xl hover:bg-black hover:text-white text-xs cursor-pointer" onClick={()=>setXKey(opt)}>{opt}</div>
                    )
                }
            </div>
            <div>Set Y-axis</div>
            <div className="flex flex-wrap gap-2 pr-2 pb-4">
                {
                    yOptions && yOptions.map(
                        (opt, key) => <div key={key} className="px-2 py-2 border border-white rounded-lg shadow-xl hover:bg-black hover:text-white text-xs cursor-pointer" onClick={()=>setYKey(opt)}>{opt}</div>
                    )
                }
            </div>
        </div>
    )
    
}

export default ChartDataMods;