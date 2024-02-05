import { useEffect, useState } from 'react';
import { AgChartsReact } from 'ag-charts-react';

const ChartView = ({data, fmtCols, type, xKey, yKey, dflt }) => {
    
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
        setChartOptions(prevOptions => ({
            ...prevOptions,
            series: [{
                    type: type ? type : chartOptions.series[0].type,
                    xKey: xKey ? xKey : chartOptions.series[0].xKey,
                    yKey: yKey ? yKey : chartOptions.series[0].yKey
                }],
            }))
    }, [type, xKey, yKey])

    useEffect(()=> {
        !(dflt) &&
            setChartOptions({
                data: data,
                series: [{
                        type: chartOptions.series[0].type,
                        xKey: fmtCols[0].field,
                        yKey: fmtCols[1].field
                    }],
                })        
    }, [data, fmtCols])


    return(
        <AgChartsReact options={chartOptions} />
    )
}

export default ChartView