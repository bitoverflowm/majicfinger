import React, {useState, useEffect} from 'react';
import { Transition } from '@headlessui/react';
import { FaSortDown } from 'react-icons/fa';
import { AiOutlineClose } from "react-icons/ai";

import { useMyState } from '@/context/stateContext'

import { colorPalettes } from './colorPalette';
import { bgPalette } from './bgPalette';

const ColorPanel = () => {
    // Your component logic goes here
    const contextState = useMyState()
    const bgColor = contextState?.bgColor || ''
    const setBgColor = contextState?.setBgColor || ''

    const chartTheme = contextState?.chartTheme || {};
    const setChartTheme = contextState?.setChartTheme || {};
    const bgType = contextState?.bgType || '';
    const setBgType = contextState?.setBgType || '';

    const [color0, setColor0] = useState('')
    const [color1, setColor1] = useState('')
    const [color2, setColor2] = useState('')
    const [color3, setColor3] = useState('')
    const [color4, setColor4] = useState('')
    const [color5, setColor5] = useState('')
    const [open, setOpen] = useState(false);
    const [bgOpen, setBgOpen] = useState(false);
    const [strokeOpen, setStrokeOpen] = useState(false);
    const [strokeColor, setStrokeColor] = useState('')

    useEffect(()=>{
        chartTheme &&
            setColor0(chartTheme.palette.fills[0])
            setColor1(chartTheme.palette.fills[1])
            setColor2(chartTheme.palette.fills[2])
            setColor3(chartTheme.palette.fills[3])
            setColor4(chartTheme.palette.fills[4])
            setColor5(chartTheme.palette.fills[5])
            setStrokeColor(chartTheme.palette.strokes)
    }), [chartTheme]

    const handleColorSelection = (key) => {
        setChartTheme(prevTheme => ({
            ...prevTheme,
            palette: {
                fills: colorPalettes[key],
                strokes: prevTheme.palette.strokes
            }
        }))
        setOpen(false)
    }

    const handleStrokeSelection = (key) => {
        setChartTheme(prevTheme => ({
            ...prevTheme,
            palette: {
                fills: prevTheme.palette.fills,
                strokes: [bgPalette.solids[key]]
            },
            overrides: {
                common: {
                    axes: {
                      number: {
                        tick: {
                            color: bgPalette.solids[key],
                        },
                        crosshair: {
                            stroke: bgPalette.solids[key],
                        },
                        line: {
                            color: bgPalette.solids[key],
                        },
                        gridLine: {
                            style: [
                                {
                                    stroke: bgPalette.solids[key],
                                }
                            ]
                        },
                        label: {
                            color: bgPalette.solids[key],
                        },
                        crossLines: {
                            stroke: bgPalette.solids[key],
                            label: {
                                color: bgPalette.solids[key],
                            }
                        }
                      },
                      log: {
                        tick: {
                            color: bgPalette.solids[key],
                        },
                        crosshair: {
                            stroke: bgPalette.solids[key],
                        },
                        line: {
                            color: bgPalette.solids[key],
                        },
                        gridLine: {
                            style: [
                                {
                                    stroke: bgPalette.solids[key],
                                }
                            ]
                        },
                        label: {
                            color: bgPalette.solids[key],
                        },
                        crossLines: {
                            stroke: bgPalette.solids[key],
                            label: {
                                color: bgPalette.solids[key],
                            }
                        }
                      },
                      category: {
                        tick: {
                            color: bgPalette.solids[key],
                        },
                        crosshair: {
                            stroke: bgPalette.solids[key],
                        },
                        line: {
                            color: bgPalette.solids[key],
                        },
                        gridLine: {
                            style: [
                                {
                                    stroke: bgPalette.solids[key],
                                }
                            ]
                        },
                        label: {
                            color: bgPalette.solids[key],
                        },
                        crossLines: {
                            stroke: bgPalette.solids[key],
                            label: {
                                color: bgPalette.solids[key],
                            }
                        }
                      },
                      time: {
                        tick: {
                            color: bgPalette.solids[key],
                        },
                        crosshair: {
                            stroke: bgPalette.solids[key],
                        },
                        line: {
                            color: bgPalette.solids[key],
                        },
                        gridLine: {
                            style: [
                                {
                                    stroke: bgPalette.solids[key],
                                }
                            ]
                        },
                        label: {
                            color: bgPalette.solids[key],
                        },
                        crossLines: {
                            stroke: bgPalette.solids[key],
                            label: {
                                color: bgPalette.solids[key],
                            }
                        }
                      },
                      'angle-category': {
                        tick: {
                            color: bgPalette.solids[key],
                        },
                        crosshair: {
                            stroke: bgPalette.solids[key],
                        },
                        line: {
                            color: bgPalette.solids[key],
                        },
                        gridLine: {
                            style: [
                                {
                                    stroke: bgPalette.solids[key],
                                }
                            ]
                        },
                        label: {
                            color: bgPalette.solids[key],
                        },
                        crossLines: {
                            stroke: bgPalette.solids[key],
                            label: {
                                color: bgPalette.solids[key],
                            }
                        }
                      },
                      'radius-category': {
                        tick: {
                            color: bgPalette.solids[key],
                        },
                        crosshair: {
                            stroke: bgPalette.solids[key],
                        },
                        line: {
                            color: bgPalette.solids[key],
                        },
                        gridLine: {
                            style: [
                                {
                                    stroke: bgPalette.solids[key],
                                }
                            ]
                        },
                        label: {
                            color: bgPalette.solids[key],
                        },
                        crossLines: {
                            stroke: bgPalette.solids[key],
                            label: {
                                color: bgPalette.solids[key],
                            }
                        }
                      },
                      'radius-number': {
                        tick: {
                            color: bgPalette.solids[key],
                        },
                        crosshair: {
                            stroke: bgPalette.solids[key],
                        },
                        line: {
                            color: bgPalette.solids[key],
                        },
                        gridLine: {
                            style: [
                                {
                                    stroke: bgPalette.solids[key],
                                }
                            ]
                        },
                        label: {
                            color: bgPalette.solids[key],
                        },
                        crossLines: {
                            stroke: bgPalette.solids[key],
                            label: {
                                color: bgPalette.solids[key],
                            }
                        }
                      },
                    },
                  },
            }
        }))
        setStrokeOpen(false)
    }

    const handleBgSelection = (key) => {
        console.log('key:', key)
        console.log('bgType:', bgType)
        setBgColor(bgPalette[bgType][key])
        setBgOpen(false)
    }



    return (
        // Your JSX code goes here
            chartTheme &&
                <div className='text-xs py-2 pl-5 pr-3 border-b'>
                    <div className='font-bold py-1'>Theme:</div>
                    <div>Palette:</div>
                    <div className='flex w-full place-content-center'>
                        <div className='flex w-5/6 h-8 rounded-md overflow-hidden'>
                            <div className={`w-1/6`} style={{background: color0}}/>
                            <div className={`w-1/6`} style={{background: color1}}/>
                            <div className={`w-1/6`} style={{background: color2}}/>
                            <div className={`w-1/6`} style={{background: color3}}/>
                            <div className={`w-1/6`} style={{background: color4}}/>
                            <div className={`w-1/6`} style={{background: color5}}/>
                        </div>
                        <div className='flex gap-2 w-1/6 place-content-end cursor-pointer' onClick={()=>setOpen(!open)}> {open ?  <AiOutlineClose /> : <FaSortDown />} </div>
                    </div>
                    <div className='pt-2 pb-1'>Background</div>
                    <div className='flex w-full place-content-center'>
                        <div className='flex w-5/6 h-8'>
                            <div className={`w-2/6 rounded-md`} style={bgType === 'gradients' ? {'background-image': bgColor}:{background: bgColor}}/>
                        </div>
                        <div className='flex gap-2 w-1/6 place-content-end cursor-pointer' onClick={()=>setBgOpen(!bgOpen)}> {bgOpen ?  <AiOutlineClose /> : <FaSortDown />} </div>
                    </div>
                    <div className='pt-2 pb-1'>Stroke</div>
                    <div className='flex w-full place-content-center'>
                        <div className='flex w-5/6 h-8'>
                            <div className={`w-2/6 rounded-md`} style={{'background': strokeColor}}/>
                        </div>
                        <div className='flex gap-2 w-1/6 place-content-end cursor-pointer' onClick={()=>setStrokeOpen(!strokeOpen)}> {strokeOpen ?  <AiOutlineClose /> : <FaSortDown />} </div>
                    </div>
                    <Transition 
                        show={open}
                        enter="transition-opacity duration-1000"
                        enterFrom="opacity-0 h-0"
                        enterTo="opacity-100 h-auto"
                        leave="transition-opacity duration-150"
                        leaveFrom="opacity-100 h-auto"
                        leaveTo="opacity-0">
                            <div className="grid grid-cols-2 gap-2 pr-2 pb-4 pl-2 py-2">
                                {
                                    colorPalettes && colorPalettes.map((colors, key) => (
                                        <div
                                            key={key}
                                            className={'flex rounded-md overflow-hidden h-6 cursor-pointer hover:border hover:border-black'}
                                            onClick={() => handleColorSelection(key)}
                                        >
                                            <div className={`w-1/6`} style={{background: colors[0]}}/>
                                            <div className={`w-1/6`} style={{background: colors[1]}}/>
                                            <div className={`w-1/6`} style={{background: colors[2]}}/>
                                            <div className={`w-1/6`} style={{background: colors[3]}}/>
                                            <div className={`w-1/6`} style={{background: colors[4]}}/>
                                            <div className={`w-1/6`} style={{background: colors.len > 5 ? colors[5] : color5}}/>
                                        </div>
                                    ))
                                }
                            </div>
                    </Transition>
                    <Transition 
                        show={bgOpen || strokeOpen}
                        enter="transition-opacity duration-1000"
                        enterFrom="opacity-0 h-0"
                        enterTo="opacity-100 h-auto"
                        leave="transition-opacity duration-150"
                        leaveFrom="opacity-100 h-auto"
                        leaveTo="opacity-0">
                            <div className={` ${strokeOpen && 'hidden'} flex gap-2 w-full place-content-center pr-2 pb-4 pl-2`}> 
                                <div 
                                    className={`px-2 py-1 border border-white rounded-lg shadow-sm text-xs cursor-pointer ${bgType === 'solids' ? 'bg-black text-white hover:bg-white hover:text-black': 'bg-white text-black hover:bg-black hover:text-white'}`}
                                    onClick={()=>setBgType('solids')}>Solid</div>
                                <div 
                                    className={`px-2 py-1 border border-white rounded-lg shadow-sm text-xs cursor-pointer ${bgType === 'gradients' ? 'bg-black text-white hover:bg-white hover:text-black': 'bg-white text-black hover:bg-black hover:text-white'}`}
                                    onClick={()=>setBgType('gradients')}>Gradient</div>
                            </div>
                            <Transition 
                                show={bgType === 'solids' || strokeOpen}
                                enter="transition-opacity duration-1000"
                                enterFrom="opacity-0 h-0"
                                enterTo="opacity-100 h-auto"
                                leave="transition-opacity duration-150"
                                leaveFrom="opacity-100 h-auto"
                                leaveTo="opacity-0">
                                    <div className="grid grid-cols-8 gap-2 pr-2 pb-4 pl-2 py-6">
                                        {
                                            bgPalette && bgPalette.solids.map((solid, key) => (
                                                <div
                                                    key={key}
                                                    className={'flex rounded-md h-6 cursor-pointer hover:border hover:border-black'}
                                                    onClick={() => strokeOpen ? handleStrokeSelection(key) : handleBgSelection(key)}
                                                    style={{background: solid}}/>
                                            ))
                                        }
                                    </div>
                            </Transition>
                            <Transition 
                                show={bgType === 'gradients'}
                                enter="transition-opacity duration-1000"
                                enterFrom="opacity-0 h-0"
                                enterTo="opacity-100 h-auto"
                                leave="transition-opacity duration-150"
                                leaveFrom="opacity-100 h-auto"
                                leaveTo="opacity-0">
                                    <div className="grid grid-cols-2 gap-2 pr-2 pb-4 pl-2 py-2">
                                        {
                                            bgPalette && bgPalette.gradients.map((gradient, key) => (
                                                <div
                                                    key={key}
                                                    className={'flex rounded-md h-6 cursor-pointer hover:border hover:border-black'}
                                                    onClick={() => handleBgSelection(key)}
                                                    style={{'background-image': gradient}}/>
                                            ))
                                        }
                                    </div>
                            </Transition>
                            
                    </Transition>
                </div>
    );
};

export default ColorPanel;