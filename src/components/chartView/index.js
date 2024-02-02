import { useState } from 'react';
import { AgChartsReact } from 'ag-charts-react';

const ChartView = ({data, fmtCols}) => {
    
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

    return(
        <AgChartsReact options={chartOptions} />
    )
}

export default ChartView