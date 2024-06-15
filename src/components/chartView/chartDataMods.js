import { useState, useEffect } from "react"

import Group from './ui/group'
import { Input } from "@/components/ui/input"

import { Checkbox } from "@/components/ui/checkbox"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { BeanOff, CircleDashed, Trash } from "lucide-react"
import { Alert } from "../ui/alert"

import { colorPalettes } from '@/components/chartView/panels/colorPalette';


const ChartDataMods = ({connectedData, seriesConfigs, setSeriesConfigs, chartTypes, setChartTheme, setCardColor, setBgColor, setTextColor, xOptions, yOptions, directions, direction, setDirection, axesConfig, setAxesConfig, normalize, setNormalize, normalizeValue, setNormalizeValue }) => {

    //loading state
    const [loading, setLoading] = useState() 

    const addNewSeries = () => {
        setSeriesConfigs(prevConfigs => [
            ...prevConfigs,
            { type: prevConfigs[0].type, xKey: prevConfigs[0].xKey, yKey: prevConfigs[0].yKey, direction: direction }
        ]);
    };

    const handleSeriesConfigChange = (index, key, value) => {
        setSeriesConfigs(prevConfigs => {
            const newConfigs = [...prevConfigs];
            newConfigs[index] = { ...newConfigs[index], [key]: value };
            return newConfigs;
        });
    };

    const handleRoundBarToggle = (val) => {
      console.log("hello")
      setSeriesConfigs(prevConfigs => {
          const newConfigs = prevConfigs.map(config => ({
              ...config,
              cornerRadius: config.cornerRadius === 10 ? 0 : 10
          }));
          return newConfigs;
      });
    };


    const handleAxesConfigChange = (axisIndex, key, value) => {
      setAxesConfig(prevConfigs => {
          const newConfigs = [...prevConfigs];
          newConfigs[axisIndex] = { ...newConfigs[axisIndex], title: { ...newConfigs[axisIndex].title, [key]: value } };
          return newConfigs;
      });
    };

    const handleNormalizeChange = () => {
      setNormalize(!normalize);
    };

    const handleNormalizeValueChange = (e) => {
        const value = e.target.value;
        console.log(value)
        setNormalizeValue(value);
    };

    const handleDeleteSeries = (index) => {
      if(seriesConfigs.length <= 1){
        alert("You can't delete your only Series. Add a new one, then delete this one.")
      }else{
        setSeriesConfigs(prevConfigs => prevConfigs.filter((_, i) => i !== index));
      }
    };

    //color management
    const [selectedPalette, setSelectedPalette] = useState()
    const [colorVisible, setColorVisible] = useState(false);

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

    //helper to get random index in color pallate
    const getRandomIndex = (array) => {
      return Math.floor(Math.random() * array.length);
    }    

    const selectedPaletteHandler = (index) => {
      let newPalette = colorPalettes[index]
      setSelectedPalette(newPalette)
      
      //chart themes:
      handleColorSelection(newPalette[getRandomIndex(newPalette)])
      handleStrokeSelection(newPalette[getRandomIndex(newPalette)])

      // cards, and backgrounds
      setCardColor(newPalette[getRandomIndex(newPalette)])
      setBgColor(newPalette[getRandomIndex(newPalette)])
      setTextColor(newPalette[getRandomIndex(newPalette)])
    }

    return (
      <div className="grid gap-1 rounded-lg border p-4 w-full">
        {!connectedData && <Alert className="mb-2"><div className="place-items-center flex gap-1 place-items-center"><BeanOff className="w-5 h-5"/><small className="text-xs font-medium leading-none">No Data ConnectedConnect a data set to start charting</small></div></Alert> }

        {seriesConfigs.map((config, index) => (
            <div key={index}>
                <div className="flex place-items-center gap-3">
                  <small className="text-xs font-medium leading-none">Chart {index + 1}</small>
                  <div
                    className="bg-red-400/30 p-2 w-6 h-6 rounded-full flex place-items-center place-content-center text-black cursor-pointer hover:bg-lychee_green/40 hover:text-slate-600"
                    onClick={() => handleDeleteSeries(index)}
                  >
                    <Trash className="w-3 h-3" />
                  </div>
                </div>
                {chartTypes && chartTypes.length > 1 &&
                <div className="py-1">
                     <Group title={`Type`} options={chartTypes} val={config.type} call={value => handleSeriesConfigChange(index, 'type', value)} opened={true} />
                </div>}
                {xOptions && xOptions.length > 1 &&
                <div className="py-1">
                     <Group title={`X-axis`} options={xOptions} val={config.xKey} call={value => handleSeriesConfigChange(index, 'xKey', value)} opened={false} />
                </div>}
                {yOptions && yOptions.length > 1 &&            
                <div className="py-1">
                     <Group title={`Y-axis`} options={yOptions} val={config.yKey} call={value => handleSeriesConfigChange(index, 'yKey', value)} opened={false} />
                </div>}
            </div>
        ))}
        <div>
          <code className="relative rounded bg-lychee_blue/10 px-[0.3rem] py-[0.2rem] font-mono text-xs hover:bg-lychee_green/30 cursor-pointer" onClick={()=>addNewSeries()}>
              + Add Series
          </code>
        </div>
        <div className="flex place-items-center gap-2">
          <div>
            <label className="text-xs">X-axis Name</label>
            <Input default="x-axis" value={axesConfig[0].title.text} onChange={(e) => handleAxesConfigChange(0, 'text', e.target.value)} className="text-xs p-2 border rounded" />
          </div>
          <div>
            <label className="text-xs">Y-axis Name</label>
            <Input value={axesConfig[1].title.text} onChange={(e) => handleAxesConfigChange(1, 'text', e.target.value)} className="w-full text-xs p-2 border rounded" />
          </div>
        </div>
        <div className="flex place-items-center gap-2">
            <Checkbox id="normalize" checked={normalize} onCheckedChange={handleNormalizeChange} />
            <label htmlFor="normalize" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Normalize Values?
            </label>
        </div>
        {normalize && (
            <div className="py-1">
                <label className="text-xs">Normalize To</label>
                <Input value={normalizeValue} onChange={handleNormalizeValueChange} className="w-full text-xs p-2 border rounded" />
            </div>
        )}
        {
            seriesConfigs[0].type === 'bar' && (
              <div>
                <ToggleGroup type="single" className={"flex place-items-left place-content-left"} onValueChange={handleRoundBarToggle}>
                  <ToggleGroupItem value="roundBar" aria-label="Round Bar" pressed={seriesConfigs[0].cornerRadius === 10}>
                    <CircleDashed className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )
          }

        <div>
          {directions && directions.length > 1 && <Group title={'Direction'} options={directions} val={direction} call={setDirection} opened={false}/>}
        </div>
        <div>Aesthetics</div>
        <div className="flex" onClick={()=>setColorVisible(true)}>Pick a precreated Pallate <div className="flex">
            {
              selectedPalette && selectedPalette.map((color)=>
                <div className="p-2" style={{ backgroundColor: color}}> </div>
              )
            }
          </div>          
        </div>
        {
          colorVisible && <div className="grid gap-2 grid-cols-4">
              {colorPalettes.map((palette, index) => (
                <div key={index} className="cursor-pointer" onClick={() => selectedPaletteHandler(index)}>
                  {palette.map((color, colorIndex) => (
                    <div key={colorIndex} className="p-2" style={{ backgroundColor: color }}></div>
                  ))}
                </div>
              ))}
            </div>
        }
      </div>
    )
  }

export default ChartDataMods