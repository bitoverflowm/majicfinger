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
        chartTheme && (
            <div className="text-xs py-2 pl-5 pr-3 border-b">
                <div className="font-bold py-1">Theme</div>
                <div className="text-[11px] text-muted-foreground">
                    Chart colors are applied automatically. Color palette options are currently hidden.
                </div>
            </div>
        )
    );
};

export default ColorPanel;