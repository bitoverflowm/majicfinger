import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { bgPalette } from '@/components/chartView/panels/bgPalette';
import BrowserFrame from 'react-browser-frame'

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

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"

import { CaretRightIcon, EyeClosedIcon, EyeOpenIcon, IdCardIcon, ShuffleIcon } from '@radix-ui/react-icons';
import { Download, MinusCircle, Moon, Sun, Tag, TrendingUp, Upload } from 'react-feather';
import { IoConstructOutline, IoPieChartOutline, IoShuffleOutline, IoStatsChart } from 'react-icons/io5';
import { Toggle } from '@/components/ui/toggle';
import { CameraIcon, Expand, Lightbulb } from 'lucide-react';
import { PiChartBarHorizontalLight, PiChartDonut, PiChartLine, PiChartLineThin } from 'react-icons/pi';
import { MdOutlineAreaChart, MdStackedBarChart } from 'react-icons/md';
import { GoDotFill } from 'react-icons/go';
import { AiOutlineRadarChart } from 'react-icons/ai';
import * as htmlToImage from 'html-to-image';
import { toPng, toJpeg, toBlob, toPixelData, toSvg } from 'html-to-image';
import { Input } from "@/components/ui/input"

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

const Interactive = () => {
    const chartRef = useRef(null)

    //chart is usable once data requirements are satisfied 
    const [chartUsable, setChartUsable] = useState()

    const [xOptions, setXOptions] = useState()
    const [yOptions, setYOptions] = useState()
    const [chartConfig, setChartConfig] = useState()

    const [selChartType, setSelChartType] = useState('area')
    const [selX, setSelX] = useState()
    const [availableYOptions, setAvailableYOptons] = useState(["desktop", "mobile", "other"])
    const [selY, setSelY] = useState(["desktop"])
    const [selColor, setSelColor] = useState('#0064E6')
    const [colorVisible, setColorVisible] = useState()
    const [lineStyle, setLineStyle] = useState('natural')
    const [selectedPalette, setSelectedPalette] = useState(['#0064E6', 'hsl(212 97% 87%)', 'hsl(142 88% 28%)'])
    const categories = Object.keys(masterPalette);
    const [selectedCategory, setSelectedCategory] = useState()
    const [expanded, setExpanded] = useState(false);
    const [legendVisible, setLegendVisible] = useState(false)
    const [horizontal, setHorizontal] = useState(false)
    const [stackedBar, setStackedBar] = useState(false)
    const [dots, setDots] = useState(true)
    const [labelLine, setLabelLine] = useState(false)
    const [donut, setDonut] = useState(false)
    const [light, setLight] = useState()
    const [dark, setDark] = useState()

    const [titleHidden, setTitleHidden] = useState()
    const [title, setTitle] = useState('Your Amazing Title')
    const [subTitleHidden, setSubTitleHidden]  = useState()    
    const [subTitle, setSubTitle] = useState('Some interesting Discovery')
    const [bodyHeadingHidden, setHeadingHidden]  = useState()
    const [bodyHeading, setBodyHeading] = useState('Closing 30X More Deals')
    const [bodyContentHidden, setBodyContentHidden]  = useState()
    const [bodyContent, setBodyContent] = useState('This chart is so beautuful and your analysis is so mesmerizingly amazing that you are aleady winning. Stastically more likely to close deals.')

    const [bgColor, setBgColor] = useState()
    const [cardColor, setCardColor] = useState()
    const [editHidden, setEditHidden] = useState()

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

    //demo state
    useEffect(() => {
        setFilteredData(dfltChartData);
        setXOptions(['month']);
        setYOptions(['desktop', 'mobile', 'other']);
        setAvailableYOptons(['desktop', 'mobile', 'other']);
    }, []);


    useEffect(() => {
        if (selChartType === 'pie' && selX && selY.length > 0 && filteredData) {
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
        }
    }, [selChartType, selX, selY, selectedPalette]);


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

    const handleToggleDark = (pressed) => {
        setLight(false)
        setDark(pressed)
    }

    const downloadChart = (pressed) => {
        if (chartRef.current) {
            if(pressed === 'png'){
                toPng(chartRef.current)
                .then((dataUrl) => {
                    const link = document.createElement('a');
                    link.download = 'chart.png';
                    link.href = dataUrl;
                    link.click();
                })
                .catch((error) => {
                    console.error('Error downloading chart:', error);
                });
            }else if(pressed ==='svg'){
                toSvg(chartRef.current)
                .then((dataUrl) => {
                    const link = document.createElement('a');
                    link.download = 'chart.svg';
                    link.href = dataUrl;
                    link.click();
                })
                .catch((error) => {
                    console.error('Error downloading chart:', error);
                });
            }else if(pressed ==='jpg'){
                toJpeg(chartRef.current)
                .then((dataUrl) => {
                    const link = document.createElement('a');
                    link.download = 'chart.jpg';
                    link.href = dataUrl;
                    link.click();
                })
                .catch((error) => {
                    console.error('Error downloading chart:', error);
                });
            }
        }
    };
    
    return(
        <BrowserFrame  url="www.lych3e.com/your_handle/chart_title">
            <div className={`gradualEffect flex ${dark ? 'bg-black text-white': 'bg-slate-100 text-black' } p-10`}>
                <div className={`gradualEffect py-10 px-10`}>                    
                        <div className='gradualEffect py-12 px-12 rounded-xl' ref={chartRef} style={{backgroundColor: selectedPalette ? selectedPalette[0] : "#0064E6"}}>
                            <div className='py-4 px-4 rounded-xl shadow-xl backdrop-blur-xl bg-opacity-50' style={{backgroundColor: dark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)'}}>
                                <Card className={`py-4 border-0 ${dark ? 'text-white bg-black': ' text-black bg-white'}`}>
                                    <CardHeader>
                                        {
                                            !(titleHidden) && <CardTitle>{title}</CardTitle>
                                        }{
                                            !(subTitleHidden) && <CardDescription className={`${dark && 'text-slate-200'}`}>
                                            {subTitle}
                                            </CardDescription>
                                        }                                
                                    </CardHeader>
                                    <CardContent className="px-0">
                                        <ChartContainer config={chartConfig ? chartConfig : dfltChartConfig} className={`h-[350px] w-[550px] flex place-items-center place-content-center mx-auto ${dark && 'text-slate-200'}`}>
                                            { selChartType === 'area' &&
                                                <AreaChart
                                                    accessibilityLayer
                                                    data={dfltChartData }
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
                                                        //tick={{ fill: dark ? '#fff' : '#000' }}
                                                        label={{ fill: dark ? '#fff' : '#000' }}
                                                        //tickFormatter={(value) => value.slice(0, 3)}
                                                    />
                                                    <YAxis
                                                        tickLine={false}
                                                        axisLine={false}
                                                        tickMargin={8}
                                                        tickCount={3}
                                                        //tick={{ fill: dark ? 'white' : 'black' }}
                                                        tick={{ fill: dark ? '#fff' : '#000' }}
                                                        label={{ fill: dark ? '#fff' : '#000' }}
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
                                                                tick={{ fill: dark ? 'white' : 'black' }}
                                                            //tickFormatter={(value) => value.slice(0, 3)}
                                                            />
                                                            <YAxis
                                                                dataKey={selX ? selX : "month"}
                                                                type="category"
                                                                tickLine={false}
                                                                axisLine={false}
                                                                tickMargin={8}
                                                                tick={{ fill: dark ? 'white' : 'black' }}
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
                                                                tick={{ fill: dark ? 'white' : 'black' }}
                                                                //tickFormatter={(value) => value.slice(0, 3)}
                                                            />
                                                            <YAxis
                                                                tickLine={false}
                                                                axisLine={false}
                                                                tickMargin={8}
                                                                tickCount={3}
                                                                tick={{ fill: dark ? 'white' : 'black' }}
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
                                                        tick={{ fill: dark ? 'white' : 'black' }}
                                                        //tickFormatter={(value) => value.slice(0, 3)}
                                                    />
                                                    <YAxis
                                                        tickLine={false}
                                                        axisLine={false}
                                                        tickMargin={8}
                                                        tickCount={3}
                                                        tick={{ fill: dark ? 'white' : 'black' }}
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
                                            {bodyHeading}
                                            </div>
                                            <div className={`flex items-center gap-2 leading-none  ${dark ? 'text-slate-300': 'text-muted-foreground' }`}>
                                            {bodyContent}
                                            </div>
                                        </div>
                                        </div>
                                    </CardFooter>
                                </Card>
                            </div>
                        </div>
                        <div className='flex gap-2 place-items-center place-content-center py-2'>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Toggle aria-label="Toggle png" className="bg-[#0064E6] shadow-xl">
                                        <div className='text-[10px] text-white hover:text-black flex gap-2 place-items-center'>
                                            <Upload className='h-3 w-3' /> Upload
                                        </div>
                                    </Toggle>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Anti-Bot Measure </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Hey! Misterrpink here. <div>I had to hire the anti-bot police.</div> Please register to start uploading your own data. <br/> <div className='text-xs mt-4'>*No card required.</div><div className='text-xs mt-4'>**If you already have an account you can also click here.</div>
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction>
                                            <Link href="/login">
                                                Continue
                                            </Link>
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <div className='pl-2'><Download className='text-slate-700 h-3 w-3'/></div>
                            <Toggle area-label="Toggle png"
                                onClick={()=>downloadChart('png')} pressed={false} className="bg-white shadow-xl">
                                <div className='text-[10px] text-black font-mono'>png</div>
                            </Toggle>
                            <Toggle area-label="Toggle svg" onClick={()=>downloadChart('svg')} pressed={false} className="bg-white shadow-xl">
                                <div className='text-[10px] text-black font-mono'>svg</div>
                            </Toggle>
                            <Toggle area-label="Toggle jpg" onClick={()=>downloadChart('jpg')} pressed={false} className="bg-white shadow-xl">
                                <div className='text-[10px] text-black font-mono'>jpeg</div>
                            </Toggle>
                        </div>
                </div>
                <div className={`gradualEffect ${ dark ? 'bg-gray-500/40' : 'bg-white'} rounded-xl flex flex-col shadow-lg px-10 py-5 w-96`}   style={{ zIndex: 20 }}>
                        <>
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
                                    <p className={`text-xs font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'} pt-2`}>Select your x-axis </p>
                                    <div className="py-2 text-black">
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
                                        <p className={`text-xs font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'} pt-2`}>Select your y-axis</p>
                                        <p className={`text-xs ${dark ? 'text-slate-300' : 'text-muted-foreground'} pt-2`}>Typically this should be something quantifiable {`(numerical)`}</p>
                                        {selY.length > 0 && selY.map((yValue, index) => (
                                            <div className='py-1 flex place-items-center gap-2 text-black' key={index}>
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
                                            <div className='text-black'>
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
                                </>
                        }
                        <div className='pt-4 pb-2'>                    
                            <p className={`text-xs font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'} pt-2`}>Click To Change</p>
                            <div className='flex gap-3 place-items-center'>
                                <div className="flex text-xs rounded-md py-2 cursor-pointer" onClick={()=>setColorVisible(true)}>
                                    {
                                        selectedPalette && selectedPalette.map((color)=>
                                            <div className="p-3" style={{ backgroundColor: color}}> </div>
                                        )
                                    }
                                </div>
                                <div className='p-1 cursor-pointer' onClick={()=>shufflePalette()}><IoShuffleOutline className='h-4 w-4 text-slate-600'/></div>
                                <Toggle area-label="Toggle Expand" pressed={dark}
                                    onPressedChange={handleToggleDark}>
                                    {dark ? <Lightbulb className='h-4 w-4 text-slate-800' /> : <Moon className='h-4 w-4 text-slate-800'/>}
                                </Toggle>
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
                        { (selChartType === 'area' || selChartType === 'line') && <div className='py-2 text-black'>
                            <p className={`text-xs font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'} pt-2`}>Line Style</p>
                            <p className={`text-xs pb-1 ${dark ? 'text-slate-200' : 'text-muted-foreground'} pt-1`}>How do you want your line</p>
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
                                    <Expand className={`h-4 w-4 font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'}`}/>
                                </Toggle>
                            }
                            <Toggle area-label="Toggle Legend" pressed={legendVisible}
                                onPressedChange={handleToggleLegend}>
                                <IdCardIcon className={`h-4 w-4 font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'}`}/>
                            </Toggle>
                            {selChartType === 'bar' &&
                                <>
                                    <Toggle area-label="Toggle Horizontal" pressed={horizontal}
                                        onPressedChange={handleToggleHorizontal}>
                                        <PiChartBarHorizontalLight className={`h-4 w-4 font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'}`}/>
                                    </Toggle>
                                    <Toggle area-label="Toggle Stack" pressed={stackedBar}
                                        onPressedChange={handleToggleStack}>
                                        <MdStackedBarChart className={`h-4 w-4 font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'}`}/>
                                    </Toggle>
                                </>
                            }
                            {selChartType === 'line' &&
                                <>
                                    <Toggle area-label="Toggle Dots" pressed={dots}
                                        onPressedChange={handleToggleDots}>
                                        <GoDotFill className={`h-4 w-4 font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'}`}/>
                                    </Toggle>
                                    <Toggle area-label="Toggle label line" pressed={labelLine}
                                        onPressedChange={handleToggleLabelLine}>
                                        <Tag className={`h-4 w-4 font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'}`}/>
                                    </Toggle>
                                </>
                            }
                            {selChartType === 'line' || selChartType === 'pie' &&
                                <>
                                    <Toggle area-label="Toggle label line" pressed={labelLine}
                                        onPressedChange={handleToggleLabelLine}>
                                        <Tag className={`h-4 w-4 font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'}`}/>
                                    </Toggle>
                                </>
                            }
                            {selChartType === 'pie' &&
                                <>
                                    <Toggle area-label="Toggle label line" pressed={donut}
                                        onPressedChange={handleToggleDonut}>
                                        <PiChartDonut className={`h-4 w-4 font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'}`}/>
                                    </Toggle>
                                </>
                            }
                        </div>
                        <div className="flex place-items-center gap-3 text-xs">
                            <Input id="title" type="text" placeholder="Give Your Chart a Title" className="text-xs" onChange={(e)=>setTitle(e.target.value)} />
                            <div
                            className="bg-yellow-400/30 p-2 w-6 h-6 rounded-full flex place-items-center place-content-center text-black cursor-pointer hover:bg-lychee_green/40 hover:text-slate-600"
                            onClick={() => setTitleHidden(!titleHidden)}
                            >
                            {titleHidden ? <EyeOpenIcon className="w-3 h-3" /> : <EyeClosedIcon className="w-3 h-3" /> }
                            </div>
                        </div>
                        <div className="flex gap-2 place-items-center py-1">
                            <Input id="subTitle" type="text" className="text-xs" placeholder="Add a Description" onChange={(e)=>setSubTitle(e.target.value)} />
                            <div
                            className="bg-yellow-400/30 p-2 w-6 h-6 rounded-full flex place-items-center place-content-center text-black cursor-pointer hover:bg-lychee_green/40 hover:text-slate-600"
                            onClick={() => setSubTitleHidden(!subTitleHidden)}
                            >
                                { subTitleHidden ? <EyeOpenIcon className="w-3 h-3" /> : <EyeClosedIcon className="w-3 h-3" /> }
                            </div>
                        </div>
                        <div className="flex gap-2 place-items-center py-1">
                            <Input id="bodyHeading" type="text" className="text-xs" placeholder="Add a body Heading" onChange={(e)=>setBodyHeading(e.target.value)} />
                            <div
                            className="bg-yellow-400/30 p-2 w-6 h-6 rounded-full flex place-items-center place-content-center text-black cursor-pointer hover:bg-lychee_green/40 hover:text-slate-600"
                            onClick={() => setHeadingHidden(!bodyHeadingHidden)}
                            >
                                { bodyHeadingHidden ? <EyeOpenIcon className="w-3 h-3" /> : <EyeClosedIcon className="w-3 h-3" /> }
                            </div>
                        </div>
                        <div className="flex gap-2 place-items-center">
                            <p className="text-xs text-muted-foreground">Content</p>
                            <Input id="BodyContent" type="text" className="text-xs" placeholder="Add a Description" onChange={(e)=>setBodyContent(e.target.value)} />
                            <div
                            className="bg-yellow-400/30 p-2 w-6 h-6 rounded-full flex place-items-center place-content-center text-black cursor-pointer hover:bg-lychee_green/40 hover:text-slate-600"
                            onClick={() => setBodyContentHidden(!bodyContentHidden)}
                            >
                                { bodyContentHidden ? <EyeOpenIcon className="w-3 h-3" /> : <EyeClosedIcon className="w-3 h-3" /> }
                            </div>
                        </div>
                        </>
                </div>  
            </div>
        </BrowserFrame>
    )
}

export default Interactive