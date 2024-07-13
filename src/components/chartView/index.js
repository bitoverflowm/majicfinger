import { useState, useEffect } from 'react';
import Link from 'next/link';

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
import { CaretRightIcon } from '@radix-ui/react-icons';
import { TrendingUp } from 'react-feather';

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
    const [selY, setSelY] = useState()

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
                [xOptions[0]]: {
                    label: xOptions[0],
                    color: "hsl(347 77% 50%)",
                },
            })
            setSelX(xOptions[0])
            setSelY(yOptions[1])
        }
    }, [chartUsable])

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
                                <Area
                                    dataKey={selY ? selY : "desktop"}
                                    type="natural"
                                    fill="var(--color-desktop)"
                                    fillOpacity={0.4}
                                    stroke="var(--color-desktop)"
                                />
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
                <p className="text-xs font-bold text-muted-foreground">Select </p>
                <p className="text-xs text-muted-foreground">{selX} {selY}</p>
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
                    <Select value={selY} onValueChange={(value) => setSelY(value)}>
                        <SelectTrigger >
                            <SelectValue placeholder="y axis" className='text-xs'/>
                        </SelectTrigger>
                        <SelectContent className='text-xs'>
                            {yOptions && yOptions.map((i) => (
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