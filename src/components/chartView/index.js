import { useState, useEffect } from 'react';
import Link from 'next/link';

import { AgChartsReact } from 'ag-charts-react';

import { useMyStateV2  } from '@/context/stateContextV2'

import ChartDataMods from './chartDataMods';

import { Alert } from "../ui/alert"
import { BeanOff, Dumbbell } from "lucide-react"
import { CaretRightIcon } from '@radix-ui/react-icons';

const ChartView = () => {
    const contextStateV2 = useMyStateV2()
    let connectedCols = contextStateV2.connectedCols
    let dataTypes = contextStateV2.dataTypes
    let dataTypeMismatch = contextStateV2.dataTypeMismatch
    let loadedDataMeta = contextStateV2.loadedDataMeta
    let connectedData = contextStateV2.connectedData
    let setConnectedData = contextStateV2?.setConnectedData
    let setViewing = contextStateV2?.setViewing

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
    const [titleHidden, setTitleHidden] = useState()
    const [titleFont, setTitleFont] = useState()
    const [title, setTitle] = useState('Give Your Chart a Title')
    const [subTitle, setSubTitle] = useState('Add a Description')
    const [subTitleHidden, setSubTitleHidden]  = useState()
    const [subTitleFont, setSubTitleFont] = useState()

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
        <div className='grid grid-cols-12 pl-5 place-items-center place-content-center gradualEffect'>
            <div className='col-span-12'>
                <Alert className="pt-3 pb-1">
                    {!connectedData && 
                        <div className='flex place-items-center text-xs gap-2 place-items-center bg-red-500 rounded-lg px-4 py-2'>
                            <div className='rounded-full bg-white h-2 w-2 mr-1'></div>
                            <small className="text-xs text-white"> You haven't connected any data yet. 
                            </small>
                            <span className='flex place-items-center ml-2 text-[10px] rounded-md bg-white text-black cursor-pointer hover:bg-black hover:text-white px-2' onClick={()=>setViewing('dataStart')}>Fix<CaretRightIcon/></span>
                        </div>
                    }
                    <div className='py-3 px-4 flex place-content-center'>
                        <Link rel="noopener noreferrer" target="_blank" href="https://misterrpink.beehiiv.com/p/how-to-create-crarts-on-lychee">
                            <div className="flex place-items-center gap-2 place-items-center">
                                <small className="text-xs">New? Click to get up to speed on MajicCharts in no time.</small>
                                <CaretRightIcon/>
                            </div>
                        </Link>
                    </div>
                </Alert>
            </div>
            {/*Start of background card. WE need spacing, otherwise it looks bad */}
            <div className={`col-span-8 h-full pt-4 `}>
                <div className='rounded-lg p-10' style={{background: bgColor && bgColor}}>
                    <div className='w-full h-[700px] rounded-lg p-20 internalGradualEffect' style={{background: cardColor && cardColor}}>
                        { !titleHidden && <div className='text-center text-xl font-bold py-2' style={{color: textColor && textColor, fontFamily: titleFont}}>{title}</div>}                    
                        { !subTitleHidden && <div className='text-center text-sm font-bold py-2' style={{color: textColor && textColor, fontFamily: subTitleFont}}>{subTitle}</div>}
                        <AgChartsReact options={chartOptions && chartOptions} />
                    </div>                
                    {/*<div className='text-center text-xxs'>Footnotes</div>*/}
                </div>
            </div>
            <div className='col-span-4 w-full pl-2 pr-6'>
                <ChartDataMods connectedData={connectedData} seriesConfigs={seriesConfigs} setSeriesConfigs={setSeriesConfigs} directions={directions} direction={direction} setDirection={setDirection} chartTheme={chartTheme} setChartTheme={setChartTheme} cardColor={cardColor} setCardColor={setCardColor} bgColor={bgColor} setBgColor={setBgColor} textColor={textColor} setTextColor={setTextColor} xOptions={xOptions} yOptions={yOptions} chartTypes={chartTypes} axesConfig={axesConfig} setAxesConfig={setAxesConfig} normalize={normalize} setNormalize={setNormalize} normalizeValue={normalizeValue} setNormalizeValue={setNormalizeValue} titleHidden={titleHidden} setTitleHidden={setTitleHidden} titleFont={titleFont} setTitleFont={setTitleFont} title={title} setTitle={setTitle} subTitle={subTitle} setSubTitle={setSubTitle} subTitleHidden={subTitleHidden} setSubTitleHidden={setSubTitleHidden} subTitleFont={subTitleFont} setSubTitleFont={setSubTitleFont}/>
            </div>
        </div>
    )
}

export default ChartView