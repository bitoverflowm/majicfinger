import { Bird, Paintbrush, Rabbit, Turtle } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"


import { useMyStateV2 } from "@/context/stateContextV2"

import Group from './ui/group'

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
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
    const setBgColor = contextStateV2?.setBgColor || {}
    const setCardColor = contextStateV2?.setCardColor || {}
    const setTextColor = contextStateV2?.setTextColor || {}
    const setChartTheme = contextStateV2?.setChartTheme || {}

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
          <div className="grid gap-3">
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
                <div className="border border-1 border-slate-200 flex place-content-center py-1 rounded-md cursor-pointer gap-2"><Paintbrush /> Chart Stroke Color</div>
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
    </div>
  )
}

export default ChartDataModsV2