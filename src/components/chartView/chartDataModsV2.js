import { useState, useEffect } from "react"

import { Paintbrush } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"


import { useMyStateV2 } from "@/context/stateContextV2"

import { colorPalettes } from '@/components/chartView/panels/colorPalette';

import Group from './ui/group'

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTrigger,
} from "@/components/ui/drawer"
import KatsuColors from "../panels/katsu_colors"

const ChartDataModsV2 = () => {
    const contextStateV2 = useMyStateV2()

    const title = contextStateV2?.setTitle || {};
    const setTitle = contextStateV2?.setTitle || {};
    const subTitle = contextStateV2?.subTitle || '';
    const setSubTitle = contextStateV2?.setSubTitle || {};
    const chartTypes = contextStateV2?.chartTypes || '';
    const type = contextStateV2?.type || ''; 
    const setType = contextStateV2?.setType || '';
    const xKey = contextStateV2?.xKey || '';
    const setXKey = contextStateV2?.setXKey || {};
    const yKey = contextStateV2?.yKey || '';
    const setYKey = contextStateV2?.setYKey || {};
    const xOptions = contextStateV2?.xOptions || {};
    const yOptions = contextStateV2?.yOptions || {};
    const directions = contextStateV2?.directions || {};
    const direction = contextStateV2?.direction || '';
    const setDirection = contextStateV2?.setDirection || {};

    //aesthetics
    const setBgColor = contextStateV2?.setBgColor || {}
    const setCardColor = contextStateV2?.setCardColor || {}
    const setTextColor = contextStateV2?.setTextColor || {}
    const setChartTheme = contextStateV2?.setChartTheme || {}

    //randomize color pallate
    const [pause, setPause] = useState()
    const [selectedPalette, setSelectedPalette] = useState()

    //loading state
    const [loading, setLoading] = useState()


    const handleColorSelection = (key) => {
      setChartTheme(prevTheme => ({
          ...prevTheme,
          palette: {
              fills: [key],
              strokes: prevTheme.palette.strokes
          }
      }))
    }

    const handleStrokeSelection = (key) => {
        setChartTheme(prevTheme => ({
            ...prevTheme,
            palette: {
                fills: prevTheme.palette.fills,
                strokes: [key]
            },
            overrides: {
                common: {
                    axes: {
                      number: {
                        tick: {
                            color: key,
                        },
                        crosshair: {
                            stroke: key,
                        },
                        line: {
                            color: key,
                        },
                        gridLine: {
                            style: [
                                {
                                    stroke: key,
                                }
                            ]
                        },
                        label: {
                            color: key,
                        },
                        crossLines: {
                            stroke: key,
                            label: {
                                color: key,
                            }
                        }
                      },
                      log: {
                        tick: {
                            color: key,
                        },
                        crosshair: {
                            stroke: key,
                        },
                        line: {
                            color: key,
                        },
                        gridLine: {
                            style: [
                                {
                                    stroke: key,
                                }
                            ]
                        },
                        label: {
                            color: key,
                        },
                        crossLines: {
                            stroke: key,
                            label: {
                                color: key,
                            }
                        }
                      },
                      category: {
                        tick: {
                            color: key,
                        },
                        crosshair: {
                            stroke: key,
                        },
                        line: {
                            color: key,
                        },
                        gridLine: {
                            style: [
                                {
                                    stroke: key,
                                }
                            ]
                        },
                        label: {
                            color: key,
                        },
                        crossLines: {
                            stroke: key,
                            label: {
                                color: key,
                            }
                        }
                      },
                      time: {
                        tick: {
                            color: key,
                        },
                        crosshair: {
                            stroke: key,
                        },
                        line: {
                            color: key,
                        },
                        gridLine: {
                            style: [
                                {
                                    stroke: key,
                                }
                            ]
                        },
                        label: {
                            color: key,
                        },
                        crossLines: {
                            stroke: key,
                            label: {
                                color: key,
                            }
                        }
                      },
                      'angle-category': {
                        tick: {
                            color: key,
                        },
                        crosshair: {
                            stroke: key,
                        },
                        line: {
                            color: key,
                        },
                        gridLine: {
                            style: [
                                {
                                    stroke: key,
                                }
                            ]
                        },
                        label: {
                            color: key,
                        },
                        crossLines: {
                            stroke: key,
                            label: {
                                color: key,
                            }
                        }
                      },
                      'radius-category': {
                        tick: {
                            color: key,
                        },
                        crosshair: {
                            stroke: key,
                        },
                        line: {
                            color: key,
                        },
                        gridLine: {
                            style: [
                                {
                                    stroke: key,
                                }
                            ]
                        },
                        label: {
                            color: key,
                        },
                        crossLines: {
                            stroke: key,
                            label: {
                                color: key,
                            }
                        }
                      },
                      'radius-number': {
                        tick: {
                            color: key,
                        },
                        crosshair: {
                            stroke: key,
                        },
                        line: {
                            color: key,
                        },
                        gridLine: {
                            style: [
                                {
                                    stroke: key,
                                }
                            ]
                        },
                        label: {
                            color: key,
                        },
                        crossLines: {
                            stroke: key,
                            label: {
                                color: key,
                            }
                        }
                      },
                    },
                  },
            }
        }))
    }

    const ramdomColorHandler = () => {
      const randomIndex = Math.floor(Math.random() * colorPalettes.length) // Random index from 0 to length-1
      let newPalette = colorPalettes[randomIndex]
      setSelectedPalette(newPalette)
      
      //chart themes:
      handleColorSelection(newPalette[getRandomIndex(newPalette)])
      handleStrokeSelection(newPalette[getRandomIndex(newPalette)])

      // cards, and backgrounds
      setCardColor(newPalette[getRandomIndex(newPalette)])
      setBgColor(newPalette[getRandomIndex(newPalette)])
      setTextColor(newPalette[getRandomIndex(newPalette)])
    }

    const shufflePalette = () => {
      setLoading(true)  
      if (!selectedPalette) {
          console.error("Selected palette is not defined. Please run randomColorHandler first.");
          return;
      }
  
      // Chart themes:
      handleColorSelection(selectedPalette[getRandomIndex(selectedPalette)]);
      handleStrokeSelection(selectedPalette[getRandomIndex(selectedPalette)]);
  
      // Cards, and backgrounds
      setCardColor(selectedPalette[getRandomIndex(selectedPalette)]);
      setBgColor(selectedPalette[getRandomIndex(selectedPalette)]);
      setTextColor(selectedPalette[getRandomIndex(selectedPalette)]);
      setLoading(false)
    }

    useEffect(() => {
      let intervalId;

      if (!pause) {
        intervalId = setInterval(() => {
          ramdomColorHandler();
        }, 2000); //2000 // Runs every 3 seconds
      }

      // Cleanup function to clear the interval when the component unmounts or the `demo` prop changes
      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }, [pause]);

    //helper to get random index in color pallate
    const getRandomIndex = (array) => {
      return Math.floor(Math.random() * array.length);
    }

    return (
      <div
        className="relative hidden flex-col items-start gap-8 md:flex"
      >
        <form className="grid w-full items-start gap-6">
          <fieldset className="grid gap-6 rounded-lg border p-4">
            <legend className="-ml-1 px-1 text-sm font-medium">Text</legend>
            <div className="flex place-items-center gap-3">
              <Label htmlFor="temperature">Title</Label>
              <Input id="title" type="text" placeholder="What do you want to call your chart?" onChange={(e)=>setTitle(e.target.value)} />
            </div>
            <div className="flex gap-3 place-items-center">
              <Label htmlFor="temperature">Desc</Label>
              <Input id="subTitle" type="text" placeholder="A brief description of your chart?" onChange={(e)=>setSubTitle(e.target.value)} />
            </div>
            <div>            
              {chartTypes && chartTypes.length > 1 && <Group title={'Select your chart type'} options={chartTypes} val={type} call={setType} opened={true}/>}
            </div>
            <div>
              {xOptions && xOptions.length > 1 && <Group title={'Set X-axis'} options={xOptions} val={xKey} call={setXKey} opened={false}/>}
            </div>
            <div>
              {yOptions && yOptions.length > 1 && <Group title={'Set Y-axis'} options={yOptions} val={yKey} call={setYKey} opened={false}/>}
            </div>
            <div>
              {directions && directions.length > 1 && <Group title={'Direction'} options={directions} val={direction} call={setDirection} opened={false}/>}
            </div>
          </fieldset>
          <fieldset className="grid gap-6 rounded-lg border p-4">
            <legend className="-ml-1 px-1 text-sm font-medium">Aesthetics</legend>
            <div className="grid gap-3 grid-cols-2">
              <Drawer>
                <DrawerTrigger>
                  <div className="border border-1 border-slate-200 flex place-content-center py-1 rounded-md cursor-pointer gap-2"><Paintbrush /> Background</div>
                </DrawerTrigger>
                <DrawerContent>
                  <KatsuColors updateBgColor={setBgColor}/>
                  <DrawerFooter>
                    <DrawerClose>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
              <Drawer>
                <DrawerTrigger>
                  <div className="border border-1 border-slate-200 flex place-content-center py-1 rounded-md cursor-pointer gap-2"><Paintbrush /> Card Color</div>
                </DrawerTrigger>
                <DrawerContent>
                  <KatsuColors updateBgColor={setCardColor}/>
                  <DrawerFooter>
                    <DrawerClose>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
              <Drawer>
                <DrawerTrigger>
                  <div className="border border-1 border-slate-200 flex place-content-center py-1 rounded-md cursor-pointer gap-2"><Paintbrush /> Text Color</div>
                </DrawerTrigger>
                <DrawerContent>
                  <KatsuColors updateBgColor={setTextColor}/>
                  <DrawerFooter>
                    <DrawerClose>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
              <Drawer>
                <DrawerTrigger>
                  <div className="border border-1 border-slate-200 flex place-content-center py-1 rounded-md cursor-pointer gap-2"><Paintbrush /> Chart Color</div>
                </DrawerTrigger>
                <DrawerContent>
                  <KatsuColors updateBgColor={handleColorSelection}/>
                  <DrawerFooter>
                    <DrawerClose>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
              <Drawer>
                <DrawerTrigger>
                  <div className="border border-1 border-slate-200 flex place-content-center py-1 rounded-md cursor-pointer gap-2"><Paintbrush /> Stroke Color</div>
                </DrawerTrigger>
                <DrawerContent>
                  <KatsuColors updateBgColor={handleStrokeSelection}/>
                  <DrawerFooter>
                    <DrawerClose>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>
          </fieldset>
        </form>
        <div className="flex gap-2">
          <Button onClick={()=>setPause(!pause)}>{pause ? 'Start Color Wheel' : 'Stop Color Wheel'}</Button>
          <Button onClick={()=>shufflePalette()}>{loading ? 'Loading...' : 'Shuffle'}</Button>
        </div>        
      </div>
    )
  }

export default ChartDataModsV2