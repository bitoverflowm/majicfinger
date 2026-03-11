import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { bgPalette } from '@/components/chartView/panels/bgPalette';

import { masterPalette } from '@/components/chartView/panels/masterPalette';
import { Area, AreaChart, Bar, BarChart, Line, LineChart, Pie, PieChart, LabelList, Label, CartesianGrid, Cell, XAxis, YAxis, ZAxis, Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, ScatterChart, Scatter } from "recharts"
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

import { CaretRightIcon, EyeClosedIcon, EyeOpenIcon, IdCardIcon, ShuffleIcon } from '@radix-ui/react-icons';
import { MinusCircle, Moon, Sun, Tag, TrendingUp } from 'react-feather';
import { IoConstructOutline, IoPieChartOutline, IoShuffleOutline, IoStatsChart } from 'react-icons/io5';
import { Toggle } from '../ui/toggle';
import { CameraIcon, Expand, Lightbulb, ArrowUp, ArrowDown, LogIn, Radio, Square, CircleFadingArrowUpIcon } from 'lucide-react';
import { PiChartBarHorizontalLight, PiChartDonut, PiChartLine, PiChartLineThin } from 'react-icons/pi';
import { MdOutlineAreaChart, MdStackedBarChart } from 'react-icons/md';
import { GoDotFill } from 'react-icons/go';
import { AiOutlineRadarChart } from 'react-icons/ai';
import { CircleDot } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { toPng, toJpeg, toBlob, toPixelData, toSvg } from 'html-to-image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { Liveline } from 'liveline'  

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

/** Infer axis type from dataTypes or by sampling values. Returns 'number' | 'date' | 'string'. */
function getAxisType(key, dataTypes, data) {
  if (dataTypes && dataTypes[key]) {
    const t = dataTypes[key];
    if (t === 'number' || t === 'date') return t;
    return 'string';
  }
  if (!data || !data.length) return 'string';
  const v = data[0][key];
  if (v instanceof Date) return 'date';
  if (typeof v === 'number' && Number.isFinite(v)) return 'number';
  if (typeof v === 'string' && /^\d{4}-\d{2}/.test(v)) return 'date';
  const n = Number(v);
  if (v != null && v !== '' && !Number.isNaN(n) && Number.isFinite(n)) return 'number';
  return 'string';
}

/** Safe domain with padding; returns [0, 1] if min/max are NaN so Recharts/d3 never get undefined (non-iterable). */
function safeDomainWithPadding(dataMin, dataMax) {
  const min = Number(dataMin);
  const max = Number(dataMax);
  if (Number.isNaN(min) || Number.isNaN(max) || !Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  const pad = Math.max((max - min) * 0.05, 0.01);
  return [min - pad, max + pad];
}

/** Format date for chart tick - uses time (with seconds) for short ranges, date for long. */
function formatDateTick(value, dataMin, dataMax) {
  if (value == null) return "";
  const v = typeof value === "number" ? value : new Date(value).getTime();
  const range = (dataMax ?? v) - (dataMin ?? v);
  const d = new Date(v);
  if (range < 60000) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  if (range < 86400000) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString();
}

/** Get distinct values for a column (for categorical filter) */
function getDistinctValues(data, colKey) {
  const set = new Set();
  (data || []).forEach((row) => {
    const v = row[colKey];
    if (v != null && v !== "") set.add(String(v));
  });
  return Array.from(set).sort();
}

/** Apply chart filter: categorical (selectedValues), numeric (operator+value), date (from/to) */
function applyChartFilter(data, col, config, filterType) {
  if (!data?.length || !col || !config) return data;
  return data.filter((row) => {
    const v = row[col];
    if (filterType === "string") {
      const selected = config.selectedValues;
      if (!selected?.length) return true;
      const s = v != null ? String(v) : "";
      return selected.includes(s);
    }
    if (filterType === "number") {
      const n = Number(v);
      if (Number.isNaN(n)) return false;
      const { operator, value, value2 } = config;
      if (operator === "gt") return n > (value ?? 0);
      if (operator === "gte") return n >= (value ?? 0);
      if (operator === "lt") return n < (value ?? 0);
      if (operator === "lte") return n <= (value ?? 0);
      if (operator === "between" && value != null && value2 != null) return n >= value && n <= value2;
      return true;
    }
    if (filterType === "date") {
      const t = v instanceof Date ? v.getTime() : new Date(v).getTime();
      if (Number.isNaN(t)) return false;
      const { from, to } = config;
      if (from) {
        const fromT = new Date(from).getTime();
        if (t < fromT) return false;
      }
      if (to) {
        const toT = new Date(to).getTime();
        if (t > toT) return false;
      }
      return true;
    }
    return true;
  });
}

/** Compare two values for sorting by axis type. Returns negative, zero, or positive. */
function compareAxis(a, b, type) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (type === 'number') {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
  }
  if (type === 'date') {
    const ta = a instanceof Date ? a.getTime() : new Date(a).getTime();
    const tb = b instanceof Date ? b.getTime() : new Date(b).getTime();
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return ta - tb;
  }
  return String(a).localeCompare(String(b));
}

const ChartView = ({demo}) => {
    const contextStateV2 = useMyStateV2()
    const chartRef = useRef(null)
    let connectedCols = contextStateV2 && contextStateV2.connectedCols
    let connectedData = contextStateV2 && contextStateV2.connectedData
    let setViewing = contextStateV2 && contextStateV2?.setViewing
    let dataTypes = contextStateV2 && contextStateV2.dataTypes
    const chartDataOverride = contextStateV2?.chartDataOverride
    const setChartDataOverride = contextStateV2?.setChartDataOverride
    const setChartDataOverrideMeta = contextStateV2?.setChartDataOverrideMeta
    const chartDataOverrideMeta = contextStateV2?.chartDataOverrideMeta
    const polymarketWsState = contextStateV2?.polymarketWsState

    // When charting a summary table, use override data; else use main connectedData
    const effectiveData = chartDataOverride && Array.isArray(chartDataOverride) && chartDataOverride.length > 0
      ? chartDataOverride
      : connectedData
    const effectiveCols = chartDataOverride && chartDataOverride.length > 0
      ? Object.keys(chartDataOverride[0] || {}).map((field) => ({ field }))
      : connectedCols

    //chart is usable once data requirements are satisfied 
    const [chartUsable, setChartUsable] = useState()

    const [xOptions, setXOptions] = useState()
    const [yOptions, setYOptions] = useState()
    const [chartConfig, setChartConfig] = useState()

    //const chartTypes = ['bar', 'line', 'area', 'scatter', 'bubble', 'pie']
    //const chartTypes = ['area', 'bar', 'line', 'pie', 'radar'];

    const [selChartType, setSelChartType] = useState('area')
    const [selX, setSelX] = useState()
    const [availableYOptions, setAvailableYOptons] = useState(["desktop", "mobile", "other"])
    const [selY, setSelY] = useState(["desktop"])
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
    // Axis sort: 'asc' | 'desc' | null for X and Y
    const [sortXDir, setSortXDir] = useState(null)
    const [sortYDir, setSortYDir] = useState(null)
    // Numeric axis scale: 'linear' | 'log'
    const [scaleX, setScaleX] = useState('linear')
    const [scaleY, setScaleY] = useState('linear')
    const [scaleZ, setScaleZ] = useState('linear')
    // Bubble (scatter) chart: Z = bubble size, color = fill
    const [selZ, setSelZ] = useState(null)
    const [selColorCol, setSelColorCol] = useState(null)
    const BUBBLE_RADIUS_RANGE = [50, 400]

    // Liveline mode (only one of Liveline or Recharts is active at a time)
    const [useLiveline, setUseLiveline] = useState(false)

    // Chart filter by column value (for live WS: e.g. side=BUY/SELL; generic: categorical, numeric, date)
    const [chartFilterColumn, setChartFilterColumn] = useState(null)
    const [chartFilterConfig, setChartFilterConfig] = useState({})

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
        effectiveCols && effectiveCols.length ? extractData(effectiveCols) : setChartUsable(false)
    }, [effectiveCols])

    useEffect(() => {
        effectiveData && setFilteredData(effectiveData)
    }, [effectiveData])

    // Chart filter type for selected column
    const chartFilterType = useMemo(() => {
        if (!chartFilterColumn || !filteredData?.length) return null;
        return getAxisType(chartFilterColumn, dataTypes, filteredData);
    }, [chartFilterColumn, filteredData, dataTypes]);

    // Distinct values for categorical filter
    const chartFilterDistinct = useMemo(() => {
        if (!chartFilterColumn || !filteredData?.length || chartFilterType !== "string") return [];
        return getDistinctValues(filteredData, chartFilterColumn);
    }, [chartFilterColumn, filteredData, chartFilterType]);

    // Filtered then sorted data
    const sortedData = useMemo(() => {
        if (!filteredData || !filteredData.length) return filteredData;
        let out = applyChartFilter(filteredData, chartFilterColumn, chartFilterConfig, chartFilterType);
        if (!out?.length) out = out || [];
        const xKey = selX;
        const yKey = Array.isArray(selY) && selY.length ? selY[0] : null;
        const xType = getAxisType(xKey, dataTypes, out);
        const yType = yKey ? getAxisType(yKey, dataTypes, out) : 'string';
        if (sortYDir && yKey) {
            out.sort((a, b) => {
                const c = compareAxis(a[yKey], b[yKey], yType);
                return sortYDir === 'asc' ? c : -c;
            });
        }
        if (sortXDir && xKey) {
            out.sort((a, b) => {
                const c = compareAxis(a[xKey], b[xKey], xType);
                return sortXDir === 'asc' ? c : -c;
            });
        }
        return out;
    }, [filteredData, chartFilterColumn, chartFilterConfig, chartFilterType, selX, selY, sortXDir, sortYDir, dataTypes])

    // Chart-ready data: ensure numeric/date axes are proper types for Recharts (numbers; dates as timestamps or kept for category)
    const chartData = useMemo(() => {
        if (!sortedData || !sortedData.length) return sortedData;
        const xKey = selX;
        const yKeys = Array.isArray(selY) ? selY : [];
        const xType = getAxisType(xKey, dataTypes, sortedData);
        return sortedData.map((row) => {
            const r = { ...row };
            if (xKey && xType === 'number' && (typeof r[xKey] !== 'number' || Number.isNaN(r[xKey]))) {
                const n = Number(r[xKey]);
                r[xKey] = Number.isFinite(n) ? n : 0;
            }
            if (xKey && xType === 'date' && r[xKey] != null) {
                const d = r[xKey] instanceof Date ? r[xKey] : new Date(r[xKey]);
                r[xKey] = Number.isNaN(d.getTime()) ? r[xKey] : d.getTime();
            }
            yKeys.forEach((k) => {
                const yType = getAxisType(k, dataTypes, sortedData);
                if (yType === 'number' && (typeof r[k] !== 'number' || Number.isNaN(r[k]))) {
                    const n = Number(r[k]);
                    r[k] = Number.isFinite(n) ? n : 0;
                }
            });
            return r;
        });
    }, [sortedData, selX, selY, dataTypes])

    // Liveline-ready data: { time, value } derived from current X/Y selection and chartData
    const livelineData = useMemo(() => {
        if (!chartData || !chartData.length || !selX || !selY || !selY.length) return [];
        const valueKey = selY[0];
        const rows = chartData
          .map((row, idx) => {
            const rawT = row[selX];
            let t;
            if (typeof rawT === "number" && Number.isFinite(rawT)) {
              t = rawT;
            } else {
              const parsed = Date.parse(String(rawT));
              t = Number.isFinite(parsed) ? parsed : idx;
            }
            const vNum = Number(row[valueKey]);
            const value = Number.isFinite(vNum) ? vNum : 0;
            return { time: t, value };
          });
        return rows;
    }, [chartData, selX, selY])

    // X-axis min/max for date tick formatting (short range = time with seconds)
    const xAxisRange = useMemo(() => {
        if (!chartData?.length || !selX) return null;
        const xType = getAxisType(selX, dataTypes, chartData);
        if (xType !== "date" && xType !== "number") return null;
        const vals = chartData.map((r) => r[selX]).filter((v) => v != null && !Number.isNaN(Number(v)));
        if (!vals.length) return null;
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        return { min, max };
    }, [chartData, selX, dataTypes]);

    // Scatter/bubble chart: X, Y, Z (size), optional color column; nulls default to 0 for Z; optional log scale for Z
    const scatterChartData = useMemo(() => {
        if (!sortedData || !sortedData.length || !selX || !selY || !selY.length || !selZ) return [];
        const xKey = selX;
        const yKey = selY[0];
        const zKey = selZ;
        const xType = getAxisType(xKey, dataTypes, sortedData);
        const yType = getAxisType(yKey, dataTypes, sortedData);
        const out = [];
        for (const row of sortedData) {
            let xVal = row[xKey];
            let yVal = row[yKey];
            let zVal = row[zKey];
            if (xVal != null && xType === 'date') {
                const d = xVal instanceof Date ? xVal : new Date(xVal);
                xVal = Number.isNaN(d.getTime()) ? 0 : d.getTime();
            } else if (xVal != null && xType === 'number') {
                const n = Number(xVal);
                xVal = Number.isFinite(n) ? n : 0;
            } else if (xVal == null || xVal === '') xVal = 0;
            if (yVal != null && yType === 'date') {
                const d = yVal instanceof Date ? yVal : new Date(yVal);
                yVal = Number.isNaN(d.getTime()) ? 0 : d.getTime();
            } else if (yVal != null && yType === 'number') {
                const n = Number(yVal);
                yVal = Number.isFinite(n) ? n : 0;
            } else if (yVal == null || yVal === '') yVal = 0;
            let zNum = 0;
            if (zVal != null && zVal !== '') {
                zNum = Number(zVal);
                if (!Number.isFinite(zNum) || zNum < 0) zNum = 0;
                if (scaleZ === 'log') zNum = Math.log10(zNum + 1);
            }
            out.push({ ...row, [xKey]: xVal, [yKey]: yVal, [zKey]: zNum });
        }
        return out;
    }, [sortedData, selX, selY, selZ, dataTypes, scaleZ])

    // Color map for scatter: unique values of selColorCol -> palette color
    const scatterColorMap = useMemo(() => {
        if (!selColorCol || !scatterChartData.length) return {};
        const palette = selectedPalette && selectedPalette.length ? selectedPalette : ['hsl(142 88% 28%)', 'hsl(212 97% 87%)', 'hsl(347 77% 50%)'];
        const uniq = [...new Set(scatterChartData.map((d) => String(d[selColorCol] ?? '')))];
        const map = {};
        uniq.forEach((v, i) => { map[v] = palette[i % palette.length]; });
        return map;
    }, [scatterChartData, selColorCol, selectedPalette])

    //demo state
    useEffect(()=>{
        if(demo){
            setFilteredData(dfltChartData)
            setXOptions(['month'])
            setYOptions(['desktop', 'mobile', 'other'])
            setAvailableYOptons(['desktop', 'mobile', 'other'])
        }
    }, [demo])

    // Polymarket WebSocket chart preset: line chart with time (X) and price (Y)
    useEffect(() => {
        const preset = polymarketWsState?.chartPreset;
        if (preset && preset.type === 'line' && preset.xKey && preset.yKey && effectiveData?.length) {
            const keys = Object.keys(effectiveData[0] || {});
            if (keys.includes(preset.xKey) && keys.includes(preset.yKey)) {
                setSelChartType('line');
                setSelX(preset.xKey);
                setSelY([preset.yKey]);
                setSortXDir('asc');
                setDots(false); // Clean line for live data (no dot clutter)
                setChartConfig((prev) => ({ ...prev, [preset.yKey]: { label: 'Price', color: 'hsl(142 88% 28%)' } }));
            }
        }
    }, [polymarketWsState?.chartPreset, effectiveData]);

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
        !demo && setAvailableYOptons(checkYOptions())
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
    
    const wsStop = polymarketWsState?.stop;
    const wsStart = polymarketWsState?.start;
    const wsRunning = polymarketWsState?.isRunning;
    const showWsFeedControl = (wsStop || wsStart) && effectiveData?.length > 0;

    return(
        <div className={`gradualEffect relative xl:flex ${dark ? 'bg-black text-white': 'bg-slate-100 text-black' } p-10`}>
            {showWsFeedControl && (
                <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-lg border px-3 py-2 ${dark ? 'bg-slate-800/90 border-slate-600' : 'bg-white/95 border-slate-200'} shadow-lg`}>
                    <span className="text-xs font-medium">
                        {wsRunning ? (
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                Live feed
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <span className="h-2 w-2 rounded-full bg-slate-400" />
                                Feed paused
                            </span>
                        )}
                    </span>
                    {wsRunning && wsStop && (
                        <button
                            type="button"
                            onClick={wsStop}
                            className="flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/50"
                        >
                            <Square className="h-3 w-3" />
                            Stop feed
                        </button>
                    )}
                    {!wsRunning && wsStart && (
                        <button
                            type="button"
                            onClick={wsStart}
                            className="flex items-center gap-1.5 rounded-md border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300 dark:hover:bg-green-900/50"
                        >
                            <Radio className="h-3 w-3" />
                            Start feed
                        </button>
                    )}
                </div>
            )}
            <div className={`gradualEffect lg:py-10 lg:px-10`}>                    
                    <div className='gradualEffect py-12 px-12 rounded-xl' ref={chartRef} style={{backgroundColor: selectedPalette ? selectedPalette[0] : "#0064E6"}}>
                        <div className='py-4 px-4 rounded-xl shadow-xl backdrop-blur-xl bg-opacity-50' style={{backgroundColor: dark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)'}}>
                            <Card className={`py-4 border-0 ${dark ? 'text-white bg-black': ' text-black bg-white'}`}>
                            <CardHeader>
                                {
                                    titleHidden && <CardTitle>{title}</CardTitle>
                                }{
                                    subTitleHidden && <CardDescription className={`${dark && 'text-slate-200'}`}>
                                    {subTitle}
                                    </CardDescription>
                                }                                
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig ? chartConfig : dfltChartConfig} className={`h-[300px] lg:h-[500px] w-full ${dark && 'text-slate-200'}`}>
                                    { selChartType === 'area' &&
                                        <AreaChart
                                            accessibilityLayer
                                            data={chartData && chartData.length ? chartData : dfltChartData }
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
                                                type={selX && getAxisType(selX, dataTypes, chartData) === 'number' ? 'number' : getAxisType(selX, dataTypes, chartData) === 'date' ? 'number' : 'category'}
                                                scale={selX && getAxisType(selX, dataTypes, chartData) === 'number' ? scaleX : undefined}
                                                domain={chartData?.length && selX && (getAxisType(selX, dataTypes, chartData) === 'number' || getAxisType(selX, dataTypes, chartData) === 'date') ? ['dataMin', 'dataMax'] : undefined}
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={8}
                                                tickFormatter={selX && getAxisType(selX, dataTypes, chartData) === 'date' ? (v) => formatDateTick(v, xAxisRange?.min, xAxisRange?.max) : undefined}
                                                label={{ fill: dark ? '#fff' : '#000' }}
                                            />
                                            <YAxis
                                                type={scaleY === 'log' || (selY && selY[0] && getAxisType(selY[0], dataTypes, chartData) === 'number') ? 'number' : 'category'}
                                                scale={scaleY === 'log' ? 'log' : undefined}
                                                domain={chartData?.length && selY?.[0] && getAxisType(selY[0], dataTypes, chartData) === 'number' && scaleY !== 'log' ? safeDomainWithPadding : undefined}
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={8}
                                                tickCount={3}
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
                                                data={chartData && chartData.length ? chartData : dfltChartData }
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
                                                scale={scaleY === 'log' ? 'log' : undefined}
                                                domain={chartData?.length && scaleY !== 'log' ? safeDomainWithPadding : undefined}
                                                hide
                                                tick={{ fill: dark ? 'white' : 'black' }}
                                            />
                                                    <YAxis
                                                        dataKey={selX ? selX : "month"}
                                                        type={selX && getAxisType(selX, dataTypes, chartData) === 'number' ? 'number' : 'category'}
                                                        scale={selX && getAxisType(selX, dataTypes, chartData) === 'number' ? scaleX : undefined}
                                                        domain={chartData?.length && selX && (getAxisType(selX, dataTypes, chartData) === 'number' || getAxisType(selX, dataTypes, chartData) === 'date') ? ['dataMin', 'dataMax'] : undefined}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        tickMargin={8}
                                                        tick={{ fill: dark ? 'white' : 'black' }}
                                                    />
                                                    </>
                                                    :
                                                    <>
                                                    <XAxis
                                                        dataKey={selX ? selX : "month"}
                                                        type={selX && getAxisType(selX, dataTypes, chartData) === 'number' ? 'number' : getAxisType(selX, dataTypes, chartData) === 'date' ? 'number' : 'category'}
                                                        scale={selX && getAxisType(selX, dataTypes, chartData) === 'number' ? scaleX : undefined}
                                                        domain={chartData?.length && selX && (getAxisType(selX, dataTypes, chartData) === 'number' || getAxisType(selX, dataTypes, chartData) === 'date') ? ['dataMin', 'dataMax'] : undefined}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        tickMargin={8}
                                                        tickFormatter={selX && getAxisType(selX, dataTypes, chartData) === 'date' ? (v) => formatDateTick(v, xAxisRange?.min, xAxisRange?.max) : undefined}
                                                        tick={{ fill: dark ? 'white' : 'black' }}
                                                    />
                                                    <YAxis
                                                        type={scaleY === 'log' || (selY && selY[0] && getAxisType(selY[0], dataTypes, chartData) === 'number') ? 'number' : 'category'}
                                                        scale={scaleY === 'log' ? 'log' : undefined}
                                                        domain={chartData?.length && selY?.[0] && getAxisType(selY[0], dataTypes, chartData) === 'number' && scaleY !== 'log' ? safeDomainWithPadding : undefined}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        tickMargin={8}
                                                        tickCount={3}
                                                        tick={{ fill: dark ? 'white' : 'black' }}
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
                                                    {(chartData || []).map((item, idx) => (
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
                                            data={chartData && chartData.length ? chartData : dfltChartData }
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
                                                type={selX && getAxisType(selX, dataTypes, chartData) === 'number' ? 'number' : getAxisType(selX, dataTypes, chartData) === 'date' ? 'number' : 'category'}
                                                scale={selX && getAxisType(selX, dataTypes, chartData) === 'number' ? scaleX : undefined}
                                                domain={chartData?.length && selX && (getAxisType(selX, dataTypes, chartData) === 'number' || getAxisType(selX, dataTypes, chartData) === 'date') ? ['dataMin', 'dataMax'] : undefined}
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={8}
                                                tickFormatter={selX && getAxisType(selX, dataTypes, chartData) === 'date' ? (v) => formatDateTick(v, xAxisRange?.min, xAxisRange?.max) : undefined}
                                                tick={{ fill: dark ? 'white' : 'black' }}
                                            />
                                            <YAxis
                                                type={scaleY === 'log' || (selY && selY[0] && getAxisType(selY[0], dataTypes, chartData) === 'number') ? 'number' : 'category'}
                                                scale={scaleY === 'log' ? 'log' : undefined}
                                                domain={chartData?.length && selY?.[0] && getAxisType(selY[0], dataTypes, chartData) === 'number' && scaleY !== 'log' ? safeDomainWithPadding : undefined}
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
                                                    dot={dots && (!chartData || chartData.length <= 40)}
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
                                            data={chartData && chartData.length ? chartData : dfltChartData }
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
                                                                        {(chartData || []).reduce((acc, item) => acc + (item[selY[0]] ?? 0), 0)}
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
                                            data={chartData && chartData.length ? chartData : dfltChartData}
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
                                    {
                                        selChartType === 'scatter' && (
                                        scatterChartData.length > 0 && selX && selY && selY[0] && selZ ? (
                                        <ScatterChart
                                            margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis
                                                dataKey={selX}
                                                type="number"
                                                scale={getAxisType(selX, dataTypes, scatterChartData) === 'number' ? scaleX : undefined}
                                                domain={scatterChartData?.length && (getAxisType(selX, dataTypes, scatterChartData) === 'number' || getAxisType(selX, dataTypes, scatterChartData) === 'date') ? ['dataMin', 'dataMax'] : undefined}
                                                name={selX}
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={8}
                                                tickFormatter={getAxisType(selX, dataTypes, scatterChartData) === 'date' ? (v) => formatDateTick(v, xAxisRange?.min, xAxisRange?.max) : undefined}
                                                tick={{ fill: dark ? '#fff' : '#000' }}
                                            />
                                            <YAxis
                                                type="number"
                                                dataKey={selY[0]}
                                                name={selY[0]}
                                                scale={scaleY === 'log' ? 'log' : undefined}
                                                domain={scatterChartData?.length && scaleY !== 'log' ? safeDomainWithPadding : undefined}
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={8}
                                                tick={{ fill: dark ? '#fff' : '#000' }}
                                            />
                                            <ZAxis
                                                type="number"
                                                dataKey={selZ}
                                                range={BUBBLE_RADIUS_RANGE}
                                                name={selZ}
                                            />
                                            <ChartTooltip
                                                cursor={{ strokeDasharray: '3 3' }}
                                                content={({ active, payload }) => {
                                                    if (!active || !payload?.length) return null;
                                                    const p = payload[0].payload;
                                                    const keys = [selX, selY[0], selZ].filter(Boolean).concat(selColorCol ? [selColorCol] : []);
                                                    return (
                                                        <div className="grid min-w-[8rem] gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                            {keys.map((key) => (
                                                                <div key={key} className="flex justify-between gap-4">
                                                                    <span className="text-muted-foreground">{key}</span>
                                                                    <span className="font-medium">
                                                                        {p[key] != null && typeof p[key] === 'object' && typeof p[key].getTime === 'function'
                                                                            ? new Date(p[key]).toLocaleString()
                                                                            : typeof p[key] === 'number' ? p[key].toLocaleString() : String(p[key] ?? '')}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <Scatter
                                                name="Data Points"
                                                data={scatterChartData}
                                                shape="circle"
                                                fill={(entry) => (selColorCol && scatterColorMap[String(entry[selColorCol] ?? '')]) || (selectedPalette && selectedPalette[0]) || 'hsl(142 88% 28%)'}
                                                fillOpacity={0.7}
                                                stroke={(entry) => (selColorCol && scatterColorMap[String(entry[selColorCol] ?? '')]) || (selectedPalette && selectedPalette[0]) || 'hsl(142 88% 28%)'}
                                                strokeWidth={1}
                                                isAnimationActive
                                                animationDuration={400}
                                                animationEasing="ease-out"
                                            />
                                            {legendVisible && <ChartLegend content={<ChartLegendContent />} />}
                                        </ScatterChart>
                                        ) : (
                                        <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-muted-foreground">
                                            Select X, Y, and Bubble size (Z) to see the chart.
                                        </div>
                                        )
                                    )
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
            </div>
            <div className={`gradualEffect absolute right-10 rounded-xl flex flex-col ${ dark ? 'bg-slate-900/60' : 'bg-white'} shadow-lg px-10 py-5 ${editHidden ? 'bg-opacity-20 w-1/12 border-0 top-14 md:top-14' : 'top-1/4 md:top-14 w-9/12 md:w-2/5 xl:w-1/4'}`}   style={{ zIndex: 20 }}>
                <div className='flex gap-1 place-items-center place-content-center py-2'>
                    {
                        editHidden ? 
                        <Toggle area-label="Toggle edit close" onClick={()=>setEditHidden(false)} pressed={false} className="bg-slate-100/40 mr-10">
                         <EyeOpenIcon/>
                         </Toggle>                       
                         : 
                         <Toggle area-label="Toggle edit open"
                         onClick={()=>setEditHidden(true)} pressed={false} className="bg-slate-100/40 mr-10">
                            <EyeClosedIcon />
                        </Toggle>                        
                    }
                    <Toggle area-label="Toggle png"
                        onClick={()=>downloadChart('png')} pressed={false} className="bg-slate-100/40">
                        <div className='text-[10px] text-slate-800'>png</div>
                    </Toggle>
                    <Toggle area-label="Toggle svg" onClick={()=>downloadChart('svg')} pressed={false} className="bg-slate-100/40">
                        <div className='text-[10px] text-slate-800'>svg</div>
                    </Toggle>
                    <Toggle area-label="Toggle jpg" onClick={()=>downloadChart('jpg')} pressed={false} className="bg-slate-100/40">
                        <div className='text-[10px] text-slate-800'>jpeg</div>
                    </Toggle>
                </div>
                { !(editHidden) &&
                    <>
                    {!demo && !effectiveData && 
                        <div className='flex place-items-center text-xs gap-2 place-items-center bg-indigo-500/80 rounded-lg px-4 py-2 mx-8 mb-4'>
                            <div className='rounded-full bg-white h-2 w-2 mr-1 animate-bounce'></div>
                            <small className="text-xs text-white"> You haven't connected any data yet. 
                            </small>
                            <span className='flex place-items-center ml-2 text-[10px] rounded-md bg-white text-black cursor-pointer hover:bg-black hover:text-white px-2' onClick={()=>setViewing('dataStart')}>Fix<CaretRightIcon/></span>
                        </div>
                    }
                    {!demo && chartDataOverride && chartDataOverrideMeta && (
                        <div className='flex place-items-center text-xs gap-2 place-items-center bg-lychee_blue/80 rounded-lg px-4 py-2 mx-8 mb-4'>
                            <small className="text-xs text-white"> Viewing summary: {chartDataOverrideMeta.title}
                            </small>
                            <span className='flex place-items-center ml-2 text-[10px] rounded-md bg-white text-black cursor-pointer hover:bg-black hover:text-white px-2' onClick={() => { setChartDataOverride?.(null); setChartDataOverrideMeta?.(null); }}>Back to main data<CaretRightIcon/></span>
                        </div>
                    )}
                    
                    {
                        !(colorVisible) &&
                            <>
                                <div className="flex flex-wrap items-center gap-2">
                                  <ToggleGroup variant="outline" type="single" area-label="Chart Type"
                                      value={selChartType}
                                      onValueChange={(value) => {
                                          if (value) {
                                            setSelChartType(value);
                                            setUseLiveline(false);
                                          }
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
                                      <ToggleGroupItem value="scatter" aria-label="Toggle bubble (scatter)">
                                          <CircleDot className="h-4 w-4" />
                                      </ToggleGroupItem>
                                  </ToggleGroup>
                                  {/* Liveline button */}
                                  <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant={useLiveline ? "default" : "outline"}
                                          size="icon"
                                          type="button"
                                          onClick={() => setUseLiveline((v) => !v)}
                                        >
                                          <span className="relative inline-flex h-3 w-3">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                                            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                                          </span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="text-xs">
                                        Liveline chart
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <p className={`text-xs font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'} pt-2`}>Select your x-axis </p>
                                <p className="text-xs text-muted-foreground"></p>
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
                                {/* Scatter/bubble: Z (bubble size) and Color column */}
                                { selChartType === 'scatter' && (
                                    <>
                                        <div className="py-2">
                                            <p className={`text-xs font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'} pt-2`}>Bubble size (Z)</p>
                                            <p className={`text-xs ${dark ? 'text-slate-300' : 'text-muted-foreground'}`}>Numeric column for bubble radius</p>
                                            <Select value={selZ || ''} onValueChange={(v) => setSelZ(v || null)}>
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue placeholder="Select Z column" className="text-xs" />
                                                </SelectTrigger>
                                                <SelectContent className="text-xs">
                                                    {xOptions && xOptions.filter((k) => k !== selX).map((i) => (
                                                        <SelectItem key={i} value={i} className="text-xs">{i}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="py-2">
                                            <p className={`text-xs font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'} pt-2`}>Color by</p>
                                            <p className={`text-xs ${dark ? 'text-slate-300' : 'text-muted-foreground'}`}>Optional column for point color</p>
                                            <Select value={selColorCol ?? '__none__'} onValueChange={(v) => setSelColorCol(v === '__none__' ? null : v)}>
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue placeholder="None or select column" className="text-xs" />
                                                </SelectTrigger>
                                                <SelectContent className="text-xs">
                                                    <SelectItem value="__none__" className="text-xs">None</SelectItem>
                                                    {xOptions && xOptions.map((i) => (
                                                        <SelectItem key={i} value={i} className="text-xs">{i}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {/* Z scale: linear / log */}
                                        { selZ && (
                                            <div className="py-2 flex items-center gap-2">
                                                <span className={`text-xs ${dark ? 'text-slate-200' : 'text-muted-foreground'}`}>Z scale:</span>
                                                <TooltipProvider delayDuration={300}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                type="button"
                                                                className={`p-1.5 rounded border ${scaleZ === 'log' ? 'bg-muted' : 'bg-background'} border-border flex items-center gap-1`}
                                                                onClick={() => setScaleZ((s) => (s === 'log' ? 'linear' : 'log'))}
                                                            >
                                                                <LogIn className="h-4 w-4" />
                                                                <span className="text-[10px]">Z</span>
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                                                            {scaleZ === 'linear' ? 'Z: Linear scale.' : 'Z: Log scale (for large value ranges).'}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        )}
                                    </>
                                )}
                                { selChartType !== 'pie' && selChartType !== 'scatter' &&
                                    <button
                                        className="p-2 bg-black text-white rounded-md text-xs"
                                        onClick={() => handleSelectY(availableYOptions[0])}
                                        disabled={availableYOptions && availableYOptions.length === 0}
                                    >
                                        {availableYOptions && availableYOptions.length === 0 ? 'You have no more columns': '+ Stack Another Value'}
                                    </button>
                                }
                                {/* Filter by column value (e.g. side=BUY for WS; categorical, numeric, date) */}
                                {!demo && effectiveData?.length > 0 && xOptions?.length > 0 && (
                                    <div className="py-2 space-y-2">
                                        <p className={`text-xs font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'}`}>Filter by column</p>
                                        <p className={`text-xs ${dark ? 'text-slate-300' : 'text-muted-foreground'}`}>Plot only rows matching filter</p>
                                        <Select value={chartFilterColumn ?? "__none__"} onValueChange={(v) => { setChartFilterColumn(v === "__none__" ? null : v); setChartFilterConfig({}); }}>
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="No filter" />
                                            </SelectTrigger>
                                            <SelectContent className="text-xs">
                                                <SelectItem value="__none__" className="text-xs">No filter</SelectItem>
                                                {xOptions.map((k) => (
                                                    <SelectItem key={k} value={k} className="text-xs">{k}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {chartFilterColumn && chartFilterType === 'string' && (
                                            <div className="max-h-[100px] overflow-y-auto space-y-1">
                                                {chartFilterDistinct.slice(0, 20).map((v) => {
                                                    const selected = chartFilterConfig.selectedValues || [];
                                                    const checked = selected.length === 0 || selected.includes(v);
                                                    return (
                                                        <label key={v} className="flex items-center gap-2 text-xs cursor-pointer">
                                                            <Checkbox
                                                                checked={checked}
                                                                onCheckedChange={(c) => {
                                                                    const prev = chartFilterConfig.selectedValues || [];
                                                                    let next;
                                                                    if (c) {
                                                                        next = prev.length === 0 ? prev : (prev.includes(v) ? prev : [...prev, v]);
                                                                    } else {
                                                                        next = prev.length === 0 ? chartFilterDistinct.filter((x) => x !== v) : prev.filter((x) => x !== v);
                                                                    }
                                                                    setChartFilterConfig({ ...chartFilterConfig, selectedValues: next });
                                                                }}
                                                            />
                                                            <span className="truncate">{String(v).slice(0, 40)}{String(v).length > 40 ? '…' : ''}</span>
                                                        </label>
                                                    );
                                                })}
                                                {chartFilterDistinct.length > 20 && <p className="text-[10px] text-muted-foreground">+{chartFilterDistinct.length - 20} more</p>}
                                            </div>
                                        )}
                                        {chartFilterColumn && chartFilterType === 'number' && (
                                            <div className="space-y-1">
                                                <Select value={chartFilterConfig.operator ?? ""} onValueChange={(v) => setChartFilterConfig({ ...chartFilterConfig, operator: v })}>
                                                    <SelectTrigger className="h-7 text-xs">
                                                        <SelectValue placeholder="Operator" />
                                                    </SelectTrigger>
                                                    <SelectContent className="text-xs">
                                                        <SelectItem value="gt">&gt;</SelectItem>
                                                        <SelectItem value="gte">≥</SelectItem>
                                                        <SelectItem value="lt">&lt;</SelectItem>
                                                        <SelectItem value="lte">≤</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Input value={chartFilterConfig.value ?? ""} onChange={(e) => setChartFilterConfig({ ...chartFilterConfig, value: parseFloat(e.target.value) || 0 })} placeholder="Value" className="h-7 text-xs" type="number" />
                                            </div>
                                        )}
                                        {chartFilterColumn && chartFilterType === 'date' && (
                                            <div className="space-y-1">
                                                <Input value={chartFilterConfig.from ?? ""} onChange={(e) => setChartFilterConfig({ ...chartFilterConfig, from: e.target.value || undefined })} placeholder="From date" className="h-7 text-xs" type="date" />
                                                <Input value={chartFilterConfig.to ?? ""} onChange={(e) => setChartFilterConfig({ ...chartFilterConfig, to: e.target.value || undefined })} placeholder="To date" className="h-7 text-xs" type="date" />
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Axis sort: X and Y ascending/descending by type (number, date, string) */}
                                <div className="py-2 space-y-2">
                                    <p className={`text-xs font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'}`}>Sort axis</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className={`text-[10px] ${dark ? 'text-slate-400' : 'text-muted-foreground'}`}>X:</span>
                                        <button
                                            type="button"
                                            className={`text-xs px-2 py-1 rounded border ${sortXDir === 'asc' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border'}`}
                                            onClick={() => setSortXDir((d) => (d === 'asc' ? null : 'asc'))}
                                            title="X ascending (chronological / alphabetical / low→high)"
                                        >
                                            <ArrowUp className="h-3 w-3 inline mr-0.5" /> Asc
                                        </button>
                                        <button
                                            type="button"
                                            className={`text-xs px-2 py-1 rounded border ${sortXDir === 'desc' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border'}`}
                                            onClick={() => setSortXDir((d) => (d === 'desc' ? null : 'desc'))}
                                            title="X descending (reverse chronological / Z→A / high→low)"
                                        >
                                            <ArrowDown className="h-3 w-3 inline mr-0.5" /> Desc
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className={`text-[10px] ${dark ? 'text-slate-400' : 'text-muted-foreground'}`}>Y:</span>
                                        <button
                                            type="button"
                                            className={`text-xs px-2 py-1 rounded border ${sortYDir === 'asc' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border'}`}
                                            onClick={() => setSortYDir((d) => (d === 'asc' ? null : 'asc'))}
                                            title="Y ascending"
                                        >
                                            <ArrowUp className="h-3 w-3 inline mr-0.5" /> Asc
                                        </button>
                                        <button
                                            type="button"
                                            className={`text-xs px-2 py-1 rounded border ${sortYDir === 'desc' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border'}`}
                                            onClick={() => setSortYDir((d) => (d === 'desc' ? null : 'desc'))}
                                            title="Y descending"
                                        >
                                            <ArrowDown className="h-3 w-3 inline mr-0.5" /> Desc
                                        </button>
                                    </div>
                                </div>
                                {/* Numeric axis scale: Linear vs Log (only when axis is numeric) */}
                                {(selX && chartData && chartData.length && getAxisType(selX, dataTypes, chartData) === 'number') || (selY && selY[0] && chartData && chartData.length && getAxisType(selY[0], dataTypes, chartData) === 'number') ? (
                                    <div className="py-2 space-y-2">
                                        <p className={`text-xs font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'}`}>Axis scale</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selX && chartData && chartData.length && getAxisType(selX, dataTypes, chartData) === 'number' && (
                                                <TooltipProvider delayDuration={300}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                type="button"
                                                                className={`p-1.5 rounded border ${scaleX === 'log' ? 'bg-muted' : 'bg-background'} border-border`}
                                                                onClick={() => setScaleX((s) => (s === 'log' ? 'linear' : 'log'))}
                                                            >
                                                                <LogIn className="h-4 w-4" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                                                            {scaleX === 'linear' ? 'Linear scale: values map proportionally (equal spacing per unit).' : 'Log scale: for values spanning orders of magnitude (e.g. 1 → 1000).'}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                            {selY && selY[0] && chartData && chartData.length && getAxisType(selY[0], dataTypes, chartData) === 'number' && (
                                                <TooltipProvider delayDuration={300}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                type="button"
                                                                className={`p-1.5 rounded border ${scaleY === 'log' ? 'bg-muted' : 'bg-background'} border-border flex items-center gap-1`}
                                                                onClick={() => setScaleY((s) => (s === 'log' ? 'linear' : 'log'))}
                                                            >
                                                                <LogIn className="h-4 w-4" />
                                                                <span className="text-[10px]">Y</span>
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                                                            {scaleY === 'linear' ? 'Y: Linear scale.' : 'Y: Log scale (for large ranges).'}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </>
                    }
                    <div className='py-2'>                    
                        <p className={`text-xs font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'} pt-2`}>Paletter</p>
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
                    { (selChartType === 'area' || selChartType === 'line') && <div className='py-2'>
                        <p className={`text-xs font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'} pt-2`}>Line Style</p>
                        <p className={`text-xs ${dark ? 'text-slate-300' : 'text-muted-foreground'} pt-2`}>How do you want your line</p>
                        <Select className="text-black" value={lineStyle} onValueChange={(value) => setLineStyle(value)}>
                            <SelectTrigger className="text-black">
                                <SelectValue placeholder="y axis" className='text-xs'/>
                            </SelectTrigger>
                            <SelectContent className='text-xs text-black'>
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
                    <div className="flex gap-2 place-items-center pb-10">
                        <p className={`text-xs font-bold ${dark ? 'text-slate-200' : 'text-muted-foreground'} pt-2`}>Content</p>
                        <Input id="BodyContent" type="text" className="text-xs" placeholder="Add a Description" onChange={(e)=>setBodyContent(e.target.value)} />
                        <div
                        className="bg-yellow-400/30 p-2 w-6 h-6 rounded-full flex place-items-center place-content-center text-black cursor-pointer hover:bg-lychee_green/40 hover:text-slate-600"
                        onClick={() => setBodyContentHidden(!bodyContentHidden)}
                        >
                            { bodyContentHidden ? <EyeOpenIcon className="w-3 h-3" /> : <EyeClosedIcon className="w-3 h-3" /> }
                        </div>
                    </div>
                    <Link rel="noopener noreferrer" target="_blank" href="https://misterrpink.beehiiv.com/p/how-to-create-crarts-on-lychee">
                        <div className='bottom-0 flex place-items-center place-content-center w-5/6 py-3 bg-slate-200/40 rounded-t-md hover:bg-slate-300/30'>    
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