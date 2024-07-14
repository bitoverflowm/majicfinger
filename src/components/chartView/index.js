import { useState, useEffect } from 'react';
import Link from 'next/link';
import { bgPalette } from '@/components/chartView/panels/bgPalette';

import { masterPalette } from '@/components/chartView/panels/masterPalette';
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"

import { useMyStateV2  } from '@/context/stateContextV2'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";

import { Alert } from "../ui/alert"
import { CaretRightIcon, ShuffleIcon } from '@radix-ui/react-icons';
import { MinusCircle, TrendingUp } from 'react-feather';
import { IoShuffleOutline } from 'react-icons/io5';

const dfltChartData = [
    { month: "January", desktop: 186 },
    { month: "February", desktop: 305 },
    { month: "March", desktop: 237 },
    { month: "April", desktop: 73 },
    { month: "May", desktop: 209 },
    { month: "June", desktop: 214 },
]

const dfltChartConfig = {
    desktop: {
        label: "Desktop",
        color: "hsl(347 77% 50%)",
    },
}

const ChartView = () => {
    const contextStateV2 = useMyStateV2()
    let connectedCols = contextStateV2.connectedCols
    let dataTypes = contextStateV2.dataTypes
    let dataTypeMismatch = contextStateV2.dataTypeMismatch
    let loadedDataMeta = contextStateV2.loadedDataMeta
    let connectedData = contextStateV2.connectedData
    let setConnectedData = contextStateV2?.setConnectedData
    let setViewing = contextStateV2?.setViewing

    //chart is usable once data requirements are satisfied 
    const [chartUsable, setChartUsable] = useState()

    const [xOptions, setXOptions] = useState()
    const [yOptions, setYOptions] = useState()
    const [chartConfig, setChartConfig] = useState()

    //const chartTypes = ['bar', 'line', 'area', 'scatter', 'bubble', 'pie']
    const chartTypes = ['areaChart']

    const [selX, setSelX] = useState()
    const [availableYOptions, setAvaialbelYOptons] = useState([])
    const [selY, setSelY] = useState([])
    const [selColor, setSelColor] = useState('hsl(347 77% 50%)')
    const [colorVisible, setColorVisible] = useState()
    const [lineStyle, setLineStyle] = useState('natural')
    const [selectedPalette, setSelectedPalette] = useState(['hsl(347 77% 50%)'])
    const categories = Object.keys(masterPalette);
    const [selectedCategory, setSelectedCategory] = useState()

    const selectedPaletteHandler = (index) => {
        let newPalette = masterPalette[selectedCategory][index]
        setSelectedPalette(newPalette)
        setColorVisible(false)
    }

    const shufflePalette = () => {
        const newPalette = [...selectedPalette];
        for (let i = newPalette.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newPalette[i], newPalette[j]] = [newPalette[j], newPalette[i]];
        }
        setSelectedPalette(newPalette);
    };

    //charts
    const extractData = (cols) => {
        let arr = cols.map(items => items.field)
        setXOptions(arr)
        setYOptions(arr)
        setChartUsable(true)
    }
   
    //Extract column names
    useEffect(()=> {
        connectedCols ? extractData(connectedCols) : setChartUsable(false)
    }, [connectedCols])

    useEffect(()=>{
        if(chartUsable){            
            setChartConfig({
                [yOptions[1]]: {label: yOptions[1]},
            })
            setSelX(xOptions[0])
            setSelY([yOptions[1]])
            setAvaialbelYOptons(yOptions.filter(option => option !== xOptions[0] && option !== yOptions[1]))
        }
    }, [chartUsable])

    const handleColorSel = (val) => {
        setColorVisible(false)
        setSelColor(val)
    }

    const handleSelectY = (value, index = -1) => {
        let newSelY;
        if (index >= 0) {
            newSelY = [...selY];
            newSelY[index] = value;
        } else {
            newSelY = [...selY, value];
        }
    
        setSelY(newSelY);
        setChartConfig(prevConfig => ({
            ...prevConfig,
            [value]: { label: value },
        }));
    }

    useEffect(()=> {
        selY && checkYOptions()
    }, [selY])

    const checkYOptions = () =>{
        yOptions && yOptions.filter(option => !selY.includes(option))
    }

    const removeY = (val, index) => {
        const newSelY = [...selY];
        newSelY.splice(index, 1);
        setSelY(newSelY);
        
        setChartConfig(prevConfig => {
            const newConfig = { ...prevConfig };
            delete newConfig[val];
            return newConfig;
        });
    }


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
            <div className='col-span-12 place-items-center place-content-center py-10'>
                <Card className="">
                    <CardHeader>
                        <CardTitle>Area Chart</CardTitle>
                        <CardDescription>
                        Showing total visitors for the last 6 months
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig ? chartConfig : dfltChartConfig} className="h-[300px] lg:h-[500px] w-full">
                            <AreaChart
                                accessibilityLayer
                                data={chartUsable ? connectedData : dfltChartData }
                                margin={{
                                    left: 12,
                                    right: 12,
                                }}
                            >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey={selX ? selX : "month"}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    //tickFormatter={(value) => value.slice(0, 3)}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent indicator="line" />}
                                />
                                {selY.length > 0 ? selY.map((yValue, index) => (
                                    <Area
                                        key={index}
                                        dataKey={yValue}
                                        type={lineStyle}
                                        fill={selectedPalette && selectedPalette.length > index ? selectedPalette[index] : selectedPalette[0]}
                                        fillOpacity={0.4}
                                        stroke={selectedPalette && selectedPalette.length > index ? selectedPalette[index] : selectedPalette[0]}
                                    />
                                )) : <Area
                                    dataKey={'desktop'}
                                    type={lineStyle}
                                    fill={selColor}
                                    fillOpacity={0.4}
                                    stroke={selColor}
                                />}
                            </AreaChart>
                        </ChartContainer>
                    </CardContent>
                    <CardFooter>
                        <div className="flex w-full items-start gap-2 text-sm">
                        <div className="grid gap-2">
                            <div className="flex items-center gap-2 font-medium leading-none">
                            Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
                            </div>
                            <div className="flex items-center gap-2 leading-none text-muted-foreground">
                            January - June 2024
                            </div>
                        </div>
                        </div>
                    </CardFooter>
                </Card>
            </div>
            <div className="fixed top-20 right-10 w-1/4 border border-slate-200 rounded-xl flex flex-col bg-white shadow-lg p-10"  style={{ zIndex: 20 }}>
                {
                    !(colorVisible) &&
                        <>
                
                            <p className="text-xs font-bold text-muted-foreground">Select your x-axis </p>
                            <p className="text-xs text-muted-foreground"></p>
                            <div className="py-2">
                                <Select value={selX} onValueChange={(value) => setSelX(value)}>
                                    <SelectTrigger >
                                        <SelectValue placeholder="x axis" className='text-xs'/>
                                    </SelectTrigger>
                                    <SelectContent className='text-xs'>
                                        {xOptions && xOptions.map((i) => (
                                            <SelectItem key={i} value={i} className='text-xs'>
                                                {i}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>                             
                            </div>
                            <div className="py-2">
                                <p className="text-xs font-bold text-muted-foreground">Select your y-axis</p>
                                <p className="text-xs text-muted-foreground pb-1">Typically this should be something quantifiable {`(numerical)`}</p>
                                {selY.length > 0 && selY.map((yValue, index) => (
                                    <div className='py-1 flex place-items-center gap-2' key={index}>
                                        <Select value={yValue} onValueChange={(val) => handleSelectY(val, index)}>
                                            <SelectTrigger>
                                                <SelectValue className='text-xs'>{yValue}</SelectValue>
                                            </SelectTrigger>
                                            <SelectContent className='text-xs'>
                                                {availableYOptions.map((i) => (
                                                    <SelectItem key={i} value={i} className='text-xs'>
                                                        {i}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {
                                            !(selY.length === 1) && <div className='p-1 text-red-400 cursor-pointer hover:text-red-700'><MinusCircle className='h-4 w-4' onClick={()=>removeY(yValue, index)}/></div>
                                        }
                                    </div>
                                ))}
                                {selY.length === 0 && (
                                    <div className=''>
                                        <Select onValueChange={(val) => handleSelectY(val)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="desktop" className='text-xs' />
                                            </SelectTrigger>
                                            <SelectContent className='text-xs'>
                                                {availableYOptions.map((i) => (
                                                    <SelectItem key={i} value={i} className='text-xs'>
                                                        {i}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                            <button
                                className="p-2 bg-black text-white rounded-md text-xs"
                                onClick={() => handleSelectY(availableYOptions[0])}
                                disabled={availableYOptions && availableYOptions.length === 0}
                            >
                                {availableYOptions.length === 0 ? 'You have no more columns': '+ Stack Another Value'}
                            </button>
                            {/*
                            <div className='py-2'>
                                <p className="text-xs font-bold text-muted-foreground">Area Color </p>
                                <div className="flex text-xs rounded-md p-2 cursor-pointer" onClick={()=>setColorVisible(true)}>
                                    <div className="p-2 rounded-sm" style={{ backgroundColor: selColor}}> </div>
                                </div>
                                <div className='flex flex-wrap gap-1'>
                                    {
                                        colorVisible && bgPalette.solids.map((solid, key) => (
                                            <div
                                                key={key}
                                                className={'flex rounded-md h-5 w-5 cursor-pointer hover:border hover:border-black'}
                                                onClick={()=>handleColorSel(solid)}
                                                style={{background: solid}}/>
                                        ))
                                    }
                                </div>
                            </div> */}
                        </>
                }
                <div className='py-2'>                    
                    <p className="text-xs font-bold text-muted-foreground">Paletter</p>
                    <div className='flex gap-3 place-items-center'>
                        <div className="flex text-xs rounded-md p-2 cursor-pointer" onClick={()=>setColorVisible(true)}>
                            {
                                selectedPalette && selectedPalette.map((color)=>
                                    <div className="p-3" style={{ backgroundColor: color}}> </div>
                                )
                            }
                        </div>
                        <div className=' border border-slate-400 rounded-full p-1 cursor-pointer' onClick={()=>shufflePalette()}><IoShuffleOutline className='h-3 w-3 text-slate-600'/></div>
                    </div>                    
                    <div className=''>
                        {
                            colorVisible && 
                                <div className="">
                                    <div className="cursor-pointer bg-yellow-300/40 w-16 hover:bg-slate-300/40  text-xs pl-1 my-2" onClick={()=>setColorVisible(false)}>close</div>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {categories.map((category, index) => (
                                            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono cursor-pointer text-xs hover:bg-lychee_green"
                                                key={index}
                                                onClick={() => setSelectedCategory(category)}
                                            >
                                                {category}
                                            </code>
                                        ))}
                                    </div>
                                    {selectedCategory && (
                                        <div className="flex flex-wrap place-items-center place-content-center gap-3">
                                            {masterPalette[selectedCategory].map((palette, index) => (
                                                <div key={index} className="flex cursor-pointer rounded-full hover:shadow-inner hover:bg-slate-100 p-1" onClick={() => selectedPaletteHandler(index)}>
                                                    {palette.map((color, colorIndex) => (
                                                        <div key={colorIndex} className="p-2 rounded-full" style={{ backgroundColor: color }}></div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                        }
                    </div>
                </div>
                <div className='py-2'>
                    <p className="text-xs font-bold text-muted-foreground">Line Style</p>
                    <p className="text-xs text-muted-foreground">How do you want your line</p>
                    <Select value={lineStyle} onValueChange={(value) => setLineStyle(value)}>
                        <SelectTrigger >
                            <SelectValue placeholder="y axis" className='text-xs'/>
                        </SelectTrigger>
                        <SelectContent className='text-xs'>
                            {['natural', 'linear', 'step'].map((i) => (
                                <SelectItem key={i} value={i} className='text-xs'>
                                    {i}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>                             
                </div>

            </div>  
        </div>
    )
}

export default ChartView