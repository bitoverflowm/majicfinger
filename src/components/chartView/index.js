import { use, useEffect, useState } from 'react';
import { AgChartsReact } from 'ag-charts-react';
import { set } from 'mongoose';

const ChartView = ({data, fmtCols, type, xKey, setXKey, yKey, setYKey, dflt }) => {
    
    /*const [chartOptions, setChartOptions] = useState({
        data: data, 
        series: [{ type: 'bar', xKey: 'athelete', yKey: 'age'}]
    })*/

    const [chartOptions, setChartOptions] = useState({
        // Data: Data to be displayed in the chart
        data: data,
        // Series: Defines which chart type and data to use
        series: [{ type: 'bar', xKey: 'mission', yKey: 'price' }],
      });

    useEffect(() => {
        if(type === 'scatter'){
            console.log('scattering')
            console.log('xKey', xKey)
            console.log('yKey', yKey)
            setChartOptions({
                series: [{
                        type: 'scatter',
                        data: data,
                        xKey: xKey ? xKey : chartOptions.series[0].xKey,
                        yKey: yKey ? yKey : chartOptions.series[0].yKey
                    }],
                })
        }else{
            setChartOptions(prevOptions => ({
                ...prevOptions,
                series: [{
                        type: type ? type : chartOptions.series[0].type,
                        xKey: xKey ? xKey : chartOptions.series[0].xKey,
                        yKey: yKey ? yKey : chartOptions.series[0].yKey
                    }],
            }))
        }
    }, [type, xKey, yKey])

    useEffect(()=> {
        if(!(dflt)){
            if(type === 'scatter'){
                setChartOptions({
                    series: [{
                            type: 'scatter',
                            data: data,
                            xKey: fmtCols[0].field,
                            yKey: fmtCols[1].field
                        }],
                    })
                }
            else{
                setChartOptions({
                    data: data,
                    series: [{
                            type: chartOptions.series[0].type,
                            xKey: fmtCols[0].field,
                            yKey: fmtCols[1].field
                        }],
                    })
            }
            setXKey(fmtCols[0].field)
            setYKey(fmtCols[1].field)
        }
    }, [data, fmtCols])

    useEffect(()=> {
        if(chartOptions){
            console.log(chartOptions)
        }
    }, [chartOptions])


    return(
        <AgChartsReact options={chartOptions} />
    )
}

export default ChartView