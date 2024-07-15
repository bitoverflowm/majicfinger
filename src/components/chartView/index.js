import { useState, useEffect } from 'react';
import Link from 'next/link';
import { bgPalette } from '@/components/chartView/panels/bgPalette';

import { masterPalette } from '@/components/chartView/panels/masterPalette';
import { Area, AreaChart, Bar, BarChart, Line, LineChart, Pie, PieChart, LabelList, Label, CartesianGrid, Cell, XAxis, YAxis, Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis } from "recharts"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    ChartLegend,
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegendContent,
} from "@/components/ui/chart"

import { useMyStateV2  } from '@/context/stateContextV2'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";

import {
    ToggleGroup,
    ToggleGroupItem,
} from "@/components/ui/toggle-group"

import { Alert } from "../ui/alert"
import { CaretRightIcon, EyeClosedIcon, EyeOpenIcon, IdCardIcon, ShuffleIcon } from '@radix-ui/react-icons';
import { MinusCircle, Tag, TrendingUp } from 'react-feather';
import { IoConstructOutline, IoPieChartOutline, IoShuffleOutline, IoStatsChart } from 'react-icons/io5';
import { Toggle } from '../ui/toggle';
import { Expand } from 'lucide-react';
import { PiChartBarHorizontalLight, PiChartDonut, PiChartLine, PiChartLineThin } from 'react-icons/pi';
import { MdOutlineAreaChart, MdStackedBarChart } from 'react-icons/md';
import { GoDotFill } from 'react-icons/go';
import { AiOutlineRadarChart } from 'react-icons/ai';

const dfltChartData = [
    { month: "January", desktop: 186, mobile: 80, other: 45 },
    { month: "February", desktop: 305, mobile: 200, other: 100 },
    { month: "March", desktop: 237, mobile: 120, other: 150 },
    { month: "April", desktop: 73, mobile: 190, other: 50 },
    { month: "May", desktop: 209, mobile: 130, other: 100 },
    { month: "June", desktop: 214, mobile: 140, other: 160 },
  ]

const dfltChartConfig = {
    desktop: {
        label: "Desktop",
        color: "hsl(347 77% 50%)",
    },
    mobile: {
        label: "Mobile",
        color: "hsl(212 97% 87%)",
    },
    other: {
        label: "Other",
        color: "hsl(142 88% 28%)",
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
    const chartTypes = ['area', 'bar', 'line', 'pie', 'radar'];

    const [selChartType, setSelChartType] = useState('area')
    const [selX, setSelX] = useState()
    const [availableYOptions, setAvailableYOptons] = useState(["desktop"])
    const [selY, setSelY] = useState([])
    const [selColor, setSelColor] = useState('hsl(142 88% 28%)')
    const [colorVisible, setColorVisible] = useState()
    const [lineStyle, setLineStyle] = useState('natural')
    const [selectedPalette, setSelectedPalette] = useState(['hsl(142 88% 28%)'])
    const categories = Object.keys(masterPalette);
    const [selectedCategory, setSelectedCategory] = useState()
    const [expanded, setExpanded] = useState(false);
    const [legendVisible, setLegendVisible] = useState(false)
    const [horizontal, setHorizontal] = useState(false)
    const [stackedBar, setStackedBar] = useState(false)
    const [dots, setDots] = useState(true)
    const [labelLine, setLabelLine] = useState(false)
    const [donut, setDonut] = useState(false)

    //data filtering and management
    const [filteredData, setFilteredData] = useState()

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

    useEffect(() => {
        connectedData && setFilteredData(connectedData)
    }, [connectedData])

    useEffect(()=>{
        if(chartUsable){            
            setChartConfig({
                [yOptions[1]]: {label: yOptions[1]},
            })
            setSelX(xOptions[0])
            setSelY([yOptions[1]])
            console.log(yOptions.filter(option => option !== xOptions[0] && option !== yOptions[1]))
            setAvailableYOptons(yOptions.filter(option => option !== xOptions[0] && option !== yOptions[1]))
        }
    }, [chartUsable])

    useEffect(() => {
        if (chartUsable && selChartType === 'pie' && selX && selY.length > 0 && filteredData) {
            const newChartConfig = {};
            const updatedFilteredData = filteredData.map((item, index) => {
                const color = selectedPalette[index % selectedPalette.length];
                newChartConfig[item[selX]] = {
                    label: item[selX],
                    color: color,
                };
                return {
                    ...item,
                    fill: color,
                };
            });
            setChartConfig(newChartConfig);
            setFilteredData(updatedFilteredData);
            console.log(newChartConfig);
            console.log(updatedFilteredData);
        }
    }, [chartUsable, selChartType, selX, selY, selectedPalette]);

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
        setAvailableYOptons(checkYOptions())
    }, [selY, selX])

    const checkYOptions = () =>{
        return yOptions && yOptions.filter(option => !selY.includes(option))
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

    const handleToggleChange = (pressed) => {
        setExpanded(pressed);
    };

    const handleToggleLegend = (pressed) => {
        setLegendVisible(pressed);
    };

    const handleToggleHorizontal = (pressed) => {
        setHorizontal(pressed);
    };

    const handleToggleStack = (pressed) => {
        setStackedBar(pressed);
    };

    const handleToggleDots = (pressed) => {
        setDots(pressed);
    };

    const handleToggleLabelLine = (pressed) => {
        setLabelLine(pressed)
    }

    const handleToggleDonut = (pressed) => {
        setDonut(pressed)
    }

    const [bgColor, setBgColor] = useState()
    const [cardColor, setCardColor] = useState()
    const [editHidden, setEditHidden] = useState()
    
    return(
        <div className='grid grid-cols-12 pl-5 place-items-center place-content-center gradualEffect'>
            <div className='gradualEffect col-span-12 place-items-center place-content-center py-10'>
                <div className='gradualEffect p-20 px-12 rounded-xl bg-opacity-30' style={{backgroundColor: selectedPalette ? selectedPalette[0] : "'hsl(142 88% 28%)'"}}>
                    <Card className="px-4 py-8 border-0 shadow-xl" style={{backgroundColor: selectedPalette[4] ? selectedPalette[4] : "#fff"}}>
                        <CardHeader>
                            <CardTitle>Title</CardTitle>
                            <CardDescription>
                            Showing total visitors for the last 6 months
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig ? chartConfig : dfltChartConfig} className="h-[300px] lg:h-[500px] w-full">
                                { selChartType === 'area' &&
                                    <AreaChart
                                        accessibilityLayer
                                        data={filteredData ? filteredData : dfltChartData }
                                        margin={{
                                            left: 12,
                                            right: 12,
                                            top: 0,
                                            bottom:0
                                        }}
                                        stackOffset={expanded ? "expand" : false}
                                    >
                                        <CartesianGrid vertical={false} />
                                        <XAxis
                                            dataKey={selX ? selX : "month"}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            //tickFormatter={(value) => value.slice(0, 3)}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            tickCount={3}
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
                                                stackId={'a'}
                                            />
                                        )) : <Area
                                            dataKey={'desktop'}
                                            type={lineStyle}
                                            fill={selColor}
                                            fillOpacity={0.4}
                                            stroke={selColor}
                                        />}
                                        {legendVisible && <ChartLegend content={<ChartLegendContent />} />}
                                    </AreaChart>
                                }
                                {
                                    selChartType === 'bar' && 
                                        <BarChart
                                            accessibilityLayer
                                            data={filteredData ? filteredData : dfltChartData }
                                            margin={{
                                                left: 12,
                                                right: 12,
                                            }}
                                            layout={horizontal ? "vertical": "horizontal"}
                                        >
                                        <CartesianGrid vertical={false} />
                                        {
                                            horizontal ?
                                                <>
                                                <XAxis
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickMargin={8}
                                                    tickCount={3}
                                                    dataKey={selY[0]}
                                                    type="number"
                                                    hide
                                                //tickFormatter={(value) => value.slice(0, 3)}
                                                />
                                                <YAxis
                                                    dataKey={selX ? selX : "month"}
                                                    type="category"
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickMargin={8}
                                                    //type="number"
                                                />
                                                </>
                                                :
                                                <>
                                                <XAxis
                                                    dataKey={selX ? selX : "month"}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickMargin={8}
                                                    //tickFormatter={(value) => value.slice(0, 3)}
                                                />
                                                <YAxis
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickMargin={8}
                                                    tickCount={3}
                                                    //type="number"
                                                /></>
                                        }
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent indicator="line" />}
                                        />
                                        {selY.length > 0 ? selY.map((yValue, index) => (
                                            <Bar
                                                key={index}
                                                dataKey={yValue}
                                                //type={lineStyle}
                                                fill={selectedPalette && selectedPalette.length > index ? selectedPalette[index] : selectedPalette[0]}
                                                //fillOpacity={0.4}
                                                radius={4}
                                                stackId={stackedBar ? 'a': index}
                                            >
                                                {filteredData.map((item, idx) => (
                                                    <Cell
                                                    key={`cell-${idx}`}
                                                    fill={
                                                        item[yValue] > 0
                                                        ? (selectedPalette && selectedPalette.length > index ? selectedPalette[index] : selectedPalette[0])
                                                        : selectedPalette[1]
                                                    }
                                                    />
                                                ))}
                                            </Bar>
                                        )) : <Bar
                                            dataKey={'desktop'}
                                            //type={lineStyle}
                                            fill={selColor}
                                            //fillOpacity={0.4}
                                            //stroke={selColor}
                                            radius={4}
                                        />}
                                    {legendVisible && <ChartLegend content={<ChartLegendContent />} />}
                                </BarChart>
                                }
                                {
                                    selChartType === 'line' && 
                                    <LineChart
                                        accessibilityLayer
                                        data={filteredData ? filteredData : dfltChartData }
                                        margin={{
                                            left: 12,
                                            right: 12,
                                            top: 0,
                                            bottom:0
                                        }}
                                        stackOffset={expanded ? "expand" : false}
                                    >
                                        <CartesianGrid vertical={false} />
                                        <XAxis
                                            dataKey={selX ? selX : "month"}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            //tickFormatter={(value) => value.slice(0, 3)}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            tickCount={3}
                                        />
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent indicator="line" />}
                                        />
                                        {selY.length > 0 ? selY.map((yValue, index) => (
                                            <Line
                                                key={index}
                                                dataKey={yValue}
                                                type={lineStyle}
                                                //fill={selectedPalette && selectedPalette.length > index ? selectedPalette[index] : selectedPalette[0]}
                                                //fillOpacity={0.4}
                                                stroke={selectedPalette && selectedPalette.length > index ? selectedPalette[index] : selectedPalette[0]}
                                                //stackId={'a'}
                                                dot={dots}
                                                strokeWidth={2}
                                            >
                                                {labelLine &&<LabelList
                                                    position="top"
                                                    offset={12}
                                                    className="font-black"
                                                    fontSize={12}
                                                />}
                                            </Line>
                                        )) : <Line
                                            dataKey={'desktop'}
                                            type={lineStyle}
                                            //fill={selColor}
                                            //fillOpacity={0.4}
                                            stroke={selColor}
                                        />}
                                        {legendVisible && <ChartLegend content={<ChartLegendContent />} />}
                                    </LineChart>
                                }
                                {
                                    selChartType === 'pie' && 
                                    <PieChart
                                        accessibilityLayer
                                        margin={{
                                            left: 12,
                                            right: 12,
                                            top: 0,
                                            bottom:0
                                        }}
                                >
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent indicator="line" />}
                                    />
                                    <Pie
                                        data={filteredData ? filteredData : dfltChartData }
                                        dataKey={selY ? selY[0] : "visitor"}
                                        nameKey={selX}
                                        innerRadius={donut && 120}
                                        strokeWidth={donut && 5}
                                    >
                                        { labelLine &&
                                            <LabelList
                                                dataKey={selX ? selX : "browser"}
                                                className="fill-background"
                                                stroke="none"
                                                fontSize={12}
                                                formatter={(value) =>
                                                    chartConfig[value]?.label
                                                }
                                            />
                                        }
                                        {
                                            donut &&
                                                <Label
                                                    content={({ viewBox }) => {
                                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                                        return (
                                                            <text
                                                                x={viewBox.cx}
                                                                y={viewBox.cy}
                                                                textAnchor="middle"
                                                                dominantBaseline="middle"
                                                            >
                                                                <tspan
                                                                    x={viewBox.cx}
                                                                    y={viewBox.cy}
                                                                    className="fill-foreground text-3xl font-bold"
                                                                >
                                                                    {filteredData.reduce((acc, item) => acc + item[selY[0]], 0)}
                                                                </tspan>
                                                                <tspan
                                                                    x={viewBox.cx}
                                                                    y={(viewBox.cy || 0) + 24}
                                                                    className="fill-muted-foreground"
                                                                >
                                                                    Total {selY[0]}
                                                                </tspan>
                                                            </text>
                                                        )
                                                    }
                                                    }}
                                                />
                                        }
                                    </Pie>
                                    {legendVisible && <ChartLegend content={<ChartLegendContent />} />}
                                </PieChart>
                                }
                                {
                                    selChartType === 'radar' &&
                                    <RadarChart
                                        data={filteredData ? filteredData : dfltChartData}
                                    >
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent indicator="line" />}
                                        />
                                        <PolarAngleAxis dataKey={selX ? selX : "month"} />
                                        <PolarGrid />
                                        <PolarRadiusAxis 
                                            angle={60}
                                            orientation="middle"
                                        />
                                        {selY.length > 0 ? selY.map((yValue, index) => (
                                            <Radar
                                                key={index}
                                                //name={yValue}
                                                dataKey={yValue}
                                                fill={selectedPalette && selectedPalette.length > index ? selectedPalette[index] : selectedPalette[0]}
                                                fillOpacity={0.6}
                                            />
                                        )) : <Radar
                                            //name={'desktop'}
                                            dataKey={'desktop'}
                                            //stroke={selColor}
                                            fill={selColor}
                                            fillOpacity={0.6}
                                        />}
                                        {legendVisible && <ChartLegend content={<ChartLegendContent />} />}
                                    </RadarChart>
                                }
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
            </div>
            <div className={`gradualEffect fixed top-20 right-10 border rounded-xl flex flex-col bg-white shadow-lg p-10 ${editHidden ? 'bg-opacity-20 w-1/12 border-0 ' : 'w-1/4 border-slate-200'}`}   style={{ zIndex: 20 }}>
                {
                    editHidden ? <div className='mx-auto cursor-pointer hover:text-slate-600 bg-opacity-40 py-4' onClick={()=>setEditHidden(false)}><EyeOpenIcon/></div> : <div className='mx-auto cursor-pointer hover:text-slate-600 pb-4' onClick={()=>setEditHidden(true)}><EyeClosedIcon /></div>
                }
                { !(editHidden) &&
                    <>
                    {!connectedData && 
                        <div className='flex place-items-center text-xs gap-2 place-items-center bg-indigo-500/80 rounded-lg px-4 py-2 mx-8 mb-4'>
                            <div className='rounded-full bg-white h-2 w-2 mr-1 animate-bounce'></div>
                            <small className="text-xs text-white"> You haven't connected any data yet. 
                            </small>
                            <span className='flex place-items-center ml-2 text-[10px] rounded-md bg-white text-black cursor-pointer hover:bg-black hover:text-white px-2' onClick={()=>setViewing('dataStart')}>Fix<CaretRightIcon/></span>
                        </div>
                    }
                    
                    {
                        !(colorVisible) &&
                            <>
                                <ToggleGroup variant="outline" type="single" area-label="Chart Type"
                                    value={selChartType}
                                    onValueChange={(value) => {
                                        if (value) setSelChartType(value);
                                    }}>
                                    <ToggleGroupItem value="area" aria-label="Toggle area">
                                        <MdOutlineAreaChart className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="bar" aria-label="Toggle bar">
                                        <IoStatsChart className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="line" aria-label="Toggle line">
                                        <PiChartLine className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="pie" aria-label="Toggle pie">
                                        <IoPieChartOutline className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="radar" aria-label="Toggle radar">
                                        <AiOutlineRadarChart className="h-4 w-4" />
                                    </ToggleGroupItem>
                                </ToggleGroup>
                                <p className="text-xs font-bold text-muted-foreground pt-2">Select your x-axis </p>
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
                                                    {availableYOptions && availableYOptions.map((i) => (
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
                                                    {availableYOptions && availableYOptions.map((i) => (
                                                        <SelectItem key={i} value={i} className='text-xs'>
                                                            {i}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                                { selChartType !== 'pie' &&
                                    <button
                                        className="p-2 bg-black text-white rounded-md text-xs"
                                        onClick={() => handleSelectY(availableYOptions[0])}
                                        disabled={availableYOptions && availableYOptions.length === 0}
                                    >
                                        {availableYOptions && availableYOptions.length === 0 ? 'You have no more columns': '+ Stack Another Value'}
                                    </button>
                                }
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
                            <div className="flex text-xs rounded-md py-2 cursor-pointer" onClick={()=>setColorVisible(true)}>
                                {
                                    selectedPalette && selectedPalette.map((color)=>
                                        <div className="p-3" style={{ backgroundColor: color}}> </div>
                                    )
                                }
                            </div>
                            <div className='p-1 cursor-pointer' onClick={()=>shufflePalette()}><IoShuffleOutline className='h-4 w-4 text-slate-600'/></div>
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
                    {selChartType === 'area' || selChartType === 'line' && <div className='py-2'>
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
                    </div>}
                    <div className='py-2 flex gap-2'>
                        {selChartType === 'area' &&
                            <Toggle area-label="Toggle Expand" pressed={expanded}
                                onPressedChange={handleToggleChange}>
                                <Expand className='h-4 w-4 text-slate-800'/>
                            </Toggle>
                        }
                        <Toggle area-label="Toggle Legend" pressed={legendVisible}
                            onPressedChange={handleToggleLegend}>
                            <IdCardIcon className='h-4 w-4 text-slate-800'/>
                        </Toggle>
                        {selChartType === 'bar' &&
                            <>
                                <Toggle area-label="Toggle Horizontal" pressed={horizontal}
                                    onPressedChange={handleToggleHorizontal}>
                                    <PiChartBarHorizontalLight className='h-4 w-4 text-slate-800'/>
                                </Toggle>
                                <Toggle area-label="Toggle Stack" pressed={stackedBar}
                                    onPressedChange={handleToggleStack}>
                                    <MdStackedBarChart className='h-4 w-4 text-slate-800'/>
                                </Toggle>
                            </>
                        }
                        {selChartType === 'line' &&
                            <>
                                <Toggle area-label="Toggle Dots" pressed={dots}
                                    onPressedChange={handleToggleDots}>
                                    <GoDotFill className='h-4 w-4 text-black'/>
                                </Toggle>
                                <Toggle area-label="Toggle label line" pressed={labelLine}
                                    onPressedChange={handleToggleLabelLine}>
                                    <Tag className='h-4 w-4 text-black'/>
                                </Toggle>
                            </>
                        }
                        {selChartType === 'line' || selChartType === 'pie' &&
                            <>
                                <Toggle area-label="Toggle label line" pressed={labelLine}
                                    onPressedChange={handleToggleLabelLine}>
                                    <Tag className='h-4 w-4 text-black'/>
                                </Toggle>
                            </>
                        }
                        {selChartType === 'pie' &&
                            <>
                                <Toggle area-label="Toggle label line" pressed={donut}
                                    onPressedChange={handleToggleDonut}>
                                    <PiChartDonut className='h-4 w-4 text-black'/>
                                </Toggle>
                            </>
                        }
                    </div>
                    <div className='py-2 pb-10'>
                        <p className="text-xs font-bold text-muted-foreground">Filters</p>
                        <p className="text-xs text-muted-foreground">Powerful tools to give you insane power</p>
                        <p className="text-xs text-muted-foreground">Coming soon.</p>
                    </div>
                    <Link rel="noopener noreferrer" target="_blank" href="https://misterrpink.beehiiv.com/p/how-to-create-crarts-on-lychee">
                        <div className='bottom-0 absolute flex place-items-center place-content-center w-5/6 py-3 bg-slate-200/40 rounded-t-md hover:bg-slate-300/30'>    
                            <div className="flex place-content-center gap-2 place-items-center text-center w-full">
                                <small className="text-xs">New? <span className='underline'>Click</span> to get up to speed on MajicCharts in no time.</small>
                                <CaretRightIcon/>
                            </div>
                        </div>
                    </Link>
                    </>
                }
            </div>  
        </div>
    )
}

export default ChartView