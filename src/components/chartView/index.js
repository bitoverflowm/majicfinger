import { useState, useEffect } from 'react';

import { AgChartsReact } from 'ag-charts-react';

import { useMyStateV2  } from '@/context/stateContextV2'

import ChartDataMods from './chartDataMods';


const ChartView = () => {
    const contextStateV2 = useMyStateV2()
    let connectedCols = contextStateV2.connectedCols
    let dataTypes = contextStateV2.dataTypes
    let dataTypeMismatch = contextStateV2.dataTypeMismatch
    let loadedDataMeta = contextStateV2.loadedDataMeta
    let connectedData = contextStateV2.connectedData
    let setConnectedData = contextStateV2?.setConnectedData

    const [xOptions, setXOptions] = useState()
    const [yOptions, setYOptions] = useState()

    const chartTypes = ['bar', 'line', 'area', 'scatter', 'bubble', 'pie']
    const directions = ['horizontal', 'vertical']
    const [direction, setDirection] = useState('vertical')    

    //charts
    const extractData = (cols) => {
        let arr = cols.map(items => items.field)
        setXOptions(arr)
        setYOptions(arr)
    }
   
    //Extract column names
    useEffect(()=> {
        connectedCols && extractData(connectedCols)
    }, [connectedCols])

    const [titleProps, setTitleProps] = useState({
        value: 'Name Your Chart',
        hidden: false,
        styling: {
            fontFamily: 'inter'
        }
    })

    const [subTitleProps, setSubTitleProps] = useState({
        value: 'Give it a sub heading.',
        hidden: false,
        styling: {
            fontFamily: 'inter'
        }
    })

    /* Themes and colors */
    const [chartTheme, setChartTheme] = useState({
        baseTheme: "ag-default",
        palette: {
            fills: ["#cdb4db"],
            strokes: ["#fff"],
        },
    })

    const [bgColor, setBgColor] = useState()
    const [textColor, setTextColor] = useState()
    const [cardColor, setCardColor] = useState()

    useEffect(()=>{
        chartOptions &&
          setChartOptions(prevOptions => ({
              ...prevOptions,
              theme: chartTheme
            }))
      }, [chartTheme])

    /* Charting */

    const [seriesConfigs, setSeriesConfigs] = useState([{
        type: 'bar',
        xKey: '',
        yKey: '',
        direction: direction
      }]);
    
    const [axesConfig, setAxesConfig] = useState([
        {
          type: "category",
          position: "bottom",
          title: {
            text: '',
          },
        },
        {
          type: "number",
          position: "left",
          title: {
            text: '',
          },
          label: {
            formatter: ({ value }) => formatNumber(value),
          },
          gridLine: {
            enabled: false
          }
        },
    ])

    //initializing chartOptions
    const [chartOptions, setChartOptions] = useState({
        // Data: Data to be displayed in the chart
        theme: chartTheme,
        data: connectedData,
        series: seriesConfigs,
        background: { visible: false, }, //this should always be false because we have our own backgrounds
        axes: axesConfig})

    useEffect(()=>{
        setChartOptions(prevOptions => ({
            ...prevOptions,
            series: seriesConfigs,
        }))
    }, [seriesConfigs])

    useEffect(() => {
        setChartOptions(prevOptions => ({
            ...prevOptions,
            axes: axesConfig
        }));
    }, [axesConfig]);

    useEffect(() => {
        setAxesConfig(prevConfigs => {
            const xTitle = prevConfigs[0].title?.text || seriesConfigs[0]?.xKey || '';
            const yTitle = prevConfigs[1].title?.text || seriesConfigs[0]?.yKey || '';
    
            return direction === 'horizontal'
                ? [
                    {
                        type: "category",
                        position: "left",
                        title: {
                            text: xTitle,
                        },
                    },
                    {
                        type: "number",
                        position: "bottom",
                        title: {
                            text: yTitle,
                        },
                        label: {
                            formatter: ({ value }) => formatNumber(value),
                        },
                        gridLine: {
                            enabled: false
                        }
                    }
                ]
                : [
                    {
                        type: "category",
                        position: "bottom",
                        title: {
                            text: xTitle,
                        },
                    },
                    {
                        type: "number",
                        position: "left",
                        title: {
                            text: yTitle,
                        },
                        label: {
                            formatter: ({ value }) => formatNumber(value),
                        },
                        gridLine: {
                            enabled: false
                        }
                    }
                ];
        });
    
        setSeriesConfigs(prevConfigs => 
            prevConfigs.map(config => ({ 
                ...config, 
                direction: direction,
                normalizedTo: normalize ? normalizeValue : undefined
            }))
        );
    }, [direction]);

    const [normalize, setNormalize] = useState(false);
    const [normalizeValue, setNormalizeValue] = useState(100);

    useEffect(() => {
        console.log('setting new value: ', normalizeValue)
        console.log('normalize> ', normalize)
        setSeriesConfigs(prevConfigs => 
            prevConfigs.map(config => ({ 
                ...config,
                normalizedTo: normalize ? normalizeValue : undefined
            }))
        );
    }, [normalize, normalizeValue]);


    return(
        <div className='grid grid-cols-12 pl-5 py-12 place-items-center place-content-center gap-6 gradualEffect'>
            {/*Start of background card. WE need spacing, otherwise it looks bad */}
            <div className={`col-span-8 h-full rounded-lg pb-10 pt-10 `} style={{background: bgColor && bgColor}}>
                <div className='w-full h-[700px] rounded-lg p-20 internalGradualEffect' style={{background: cardColor && cardColor}}>
                    <AgChartsReact options={chartOptions && chartOptions} />
                </div>                
                {/*<div className='text-center text-xxs'>Footnotes</div>*/}
            </div>
            <div className='col-span-4 w-full pl-2 pr-6'>
                <ChartDataMods connectedData={connectedData} seriesConfigs={seriesConfigs} setSeriesConfigs={setSeriesConfigs} directions={directions} direction={direction} setDirection={setDirection} chartTheme={chartTheme} setChartTheme={setChartTheme} setCardColor={setCardColor} setBgColor={setBgColor} setTextColor={setTextColor} xOptions={xOptions} yOptions={yOptions} chartTypes={chartTypes} axesConfig={axesConfig} setAxesConfig={setAxesConfig} normalize={normalize} setNormalize={setNormalize} normalizeValue={normalizeValue} setNormalizeValue={setNormalizeValue}/>
            </div>
        </div>
    )
}

export default ChartView