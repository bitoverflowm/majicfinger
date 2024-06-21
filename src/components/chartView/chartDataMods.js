import { useState, useEffect } from "react"

import Group from './ui/group'
import { Input } from "@/components/ui/input"

import { Checkbox } from "@/components/ui/checkbox"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { Label } from "@radix-ui/react-context-menu"
import { CircleDashed, Trash, EyeOff, Eye, Shuffle } from "lucide-react"


import { masterPalette } from '@/components/chartView/panels/masterPalette';
import { bgPalette } from '@/components/chartView/panels/bgPalette';
import FontSelector from "./utility/fontSelector"

const ChartDataMods = ({seriesConfigs, setSeriesConfigs, chartTypes, setChartTheme, cardColor, setCardColor, bgColor, setBgColor, textColor, setTextColor, xOptions, yOptions, directions, direction, setDirection, axesConfig, setAxesConfig, normalize, setNormalize, normalizeValue, setNormalizeValue, titleHidden, setTitleHidden, titleFont, setTitleFont, title, setTitle, subTitle, setSubTitle, subTitleHidden, setSubTitleHidden, subTitleFont, setSubTitleFont }) => {

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
    const [selectedCategory, setSelectedCategory] = useState(null);
    const categories = Object.keys(masterPalette);

    const handleColorSelection = (key) => {
        setColorPick(key)
        setChartTheme(prevTheme => ({
            ...prevTheme,
            palette: {
                fills: [key],
                strokes: prevTheme.palette.strokes
            }
        }))
    }

    const handleStrokeSelection = (key) => {
        setStrokePick(key)
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
      let newPalette = masterPalette[selectedCategory][index]
      setSelectedPalette(newPalette)
      
      //chart themes:
      let colorSel = newPalette[4]
      handleColorSelection(colorSel)
      setColorPick(colorSel)
      let strokeSel = newPalette[3]
      setStrokePick(strokeSel)
      handleStrokeSelection(strokeSel)

      // cards, and backgrounds
      setCardColor(newPalette[2])
      setBgColor(newPalette[1])
      setTextColor(newPalette[0])
      setColorVisible(false)
    }

    const [colorPick, setColorPick] = useState()
    const [strokePick, setStrokePick] = useState()

    const shufflePalette = () => {
        if(selectedPalette){
            //chart themes:
            let colorSel = selectedPalette[getRandomIndex(selectedPalette)]
            handleColorSelection(colorSel)
            setColorPick(colorSel)
            let strokeSel = selectedPalette[getRandomIndex(selectedPalette)]
            setStrokePick(strokeSel)
            handleStrokeSelection(strokeSel)

            // cards, and backgrounds
            setCardColor(selectedPalette[getRandomIndex(selectedPalette)])
            setBgColor(selectedPalette[getRandomIndex(selectedPalette)])
            setTextColor(selectedPalette[getRandomIndex(selectedPalette)])
        }else{
            alert('Select a palette first')
        }
      }
    
    const [granularColorsVisible, setGranularColorsVisible] = useState()
    const [colorTarget, setColorTarget] = useState()
    
    const granularColorHandler = (target) => {
        setGranularColorsVisible(true)
        setColorTarget(target)
    }

    const updateGranularColorHandler = (key) => {
        colorTarget === 'background' && setBgColor(key)
        colorTarget === 'foreground' && setCardColor(key)
        colorTarget === 'text' && setTextColor(key)
        colorTarget === 'chart' && handleColorSelection(key)
        colorTarget === 'stroke' && handleStrokeSelection(key)
        setGranularColorsVisible(false)
        setColorTarget()
    }

    return (
    <div className="grid gap-2">
      <div className={`grid gap-1 rounded-lg border p-4 w-full ${colorVisible && 'hidden'}`}>
        <div className="flex place-items-center gap-3 text-xs">
            <Label htmlFor="title" className="text-xs">Title</Label>
            <Input id="title" type="text" placeholder="Give Your Chart a Title" className="text-xs" onChange={(e)=>setTitle(e.target.value)} />
            <div
            className="bg-yellow-400/30 p-2 w-6 h-6 rounded-full flex place-items-center place-content-center text-black cursor-pointer hover:bg-lychee_green/40 hover:text-slate-600"
            onClick={() => setTitleHidden(!titleHidden)}
            >
            {titleHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" /> }
            </div>
        </div>
        <div className="flex gap-2 place-items-center">
            <Label htmlFor="subTitle" className="text-xs">Desc</Label>
            <Input id="subTitle" type="text" className="text-xs" placeholder="Add a Description" onChange={(e)=>setSubTitle(e.target.value)} />
            <div
            className="bg-yellow-400/30 p-2 w-6 h-6 rounded-full flex place-items-center place-content-center text-black cursor-pointer hover:bg-lychee_green/40 hover:text-slate-600"
            onClick={() => setSubTitleHidden(!subTitleHidden)}
            >
                { subTitleHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" /> }
            </div>
        </div>
        <div className="flex place-items-center gap-3 text-xs pb-2">
            <Label htmlFor="font" className="text-xs">Font</Label>
            <FontSelector id="font" titleFont={titleFont} setFont={setTitleFont}/>
        </div>
        {seriesConfigs.map((config, index) => (
            <div key={index}>                
                {chartTypes && chartTypes.length > 1 &&
                <div className="flex place-items-center">
                    <div className="w-full">
                        <Group title={`Chart ${index + 1}`} options={chartTypes} val={config.type} call={value => handleSeriesConfigChange(index, 'type', value)} opened={true} />
                    </div>
                     <div
                        className="bg-red-400/30 p-2 w-6 h-6 rounded-full flex place-items-center place-content-center text-black cursor-pointer hover:bg-lychee_green/40 hover:text-slate-600"
                        onClick={() => handleDeleteSeries(index)}
                    >
                        <Trash className="w-3 h-3" />
                    </div>
                </div>}
                {xOptions && xOptions.length > 1 &&
                <div className="py-1">
                     <Group title={`x-axis`} options={xOptions} val={config.xKey} call={value => handleSeriesConfigChange(index, 'xKey', value)} opened={false} />
                </div>}
                {yOptions && yOptions.length > 1 &&            
                <div className="py-1">
                     <Group title={`y-axis`} options={yOptions} val={config.yKey} call={value => handleSeriesConfigChange(index, 'yKey', value)} opened={false} />
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
        <div className="flex place-items-center gap-2 py-2 pl-3">
            <Checkbox id="normalize" checked={normalize} onCheckedChange={handleNormalizeChange} className="border-slate-400"/>
            <label htmlFor="normalize" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Normalize
            </label>
        </div>
        {normalize && (
            <div className="">
                <label className="text-xs">Normalize To</label>
                <Input value={normalizeValue} onChange={handleNormalizeValueChange} className="w-full text-xs p-2 border rounded" />
            </div>
        )}
        {
            seriesConfigs[0].type === 'bar' && (
              <div>
                <ToggleGroup type="single" className={""} onValueChange={handleRoundBarToggle}>
                  <ToggleGroupItem value="roundBar" aria-label="Round Bar" pressed={seriesConfigs[0].cornerRadius === 10}>
                    <div className="flex place-items-center gap-2 text-xs">
                        <CircleDashed className="h-4 w-4" />  Round Border
                    </div>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )
        }

        <div>
          {directions && directions.length > 1 && <Group title={'Direction'} options={directions} val={direction} call={setDirection} opened={false}/>}
        </div>
      </div>
      <div>
        <form className="grid w-full items-start gap-6">
            <fieldset className="grid gap-2 rounded-lg border p-4">
                <legend className="-ml-1 px-1 text-xs">
                    Make your work stand out
                </legend>
                <div className="flex w-full place-items-center gap-2">
                    <div className="flex w-full text-xs border border-slate-200 rounded-md p-2 cursor-pointer" onClick={()=>setColorVisible(true)}>
                        <div className="w-3/4">Select one of world's most beautiful pallates</div>
                        <div className="flex border border-slate-200 rounded-md w-1/4">
                            {
                                selectedPalette && selectedPalette.map((color)=>
                                    <div className="p-2" style={{ backgroundColor: color}}> </div>
                                )
                            }
                        </div>
                    </div>
                    <div onClick={()=>shufflePalette()} className="border rounded-full bg-lychee_blue/20 cursor-pointer hover:bg-lychee_green/50"><Shuffle className="w-5 h-5"/></div>   
                </div>
                <div className="flex flex-wrap gap-4 place-items-center place-content-center text-xs pt-1">
                    <div className="grid place-content-center place-items-center gap-1">
                        <div>Background</div> 
                        <div className="w-6 h-5 rounded-md border border-slate-400 cursor-pointer" style={{ backgroundColor: bgColor }} onClick={()=>granularColorHandler('background')}> </div>
                    </div>
                    <div className="grid place-content-center place-items-center gap-1">
                        <div>Foregrond</div> 
                        <div className="w-6 h-5 rounded-md border border-slate-400 cursor-pointer" style={{ backgroundColor: cardColor }} onClick={()=>granularColorHandler('foreground')}> </div></div>
                    <div className="grid place-content-center place-items-center gap-1">
                        <div>Text</div> 
                        <div className="w-6 h-5 rounded-md border border-slate-400 cursor-pointer" style={{ backgroundColor: textColor }} onClick={()=>granularColorHandler('text')}> </div></div>
                    <div className="grid place-content-center place-items-center gap-1">
                        <div>Stroke</div> 
                        <div className="w-6 h-5 rounded-md border border-slate-400 cursor-pointer" style={{ backgroundColor: strokePick }} onClick={()=>granularColorHandler('stroke')}> </div></div>
                    <div className="grid place-content-center place-items-center gap-1">
                        <div>Chart</div> 
                        <div className="w-6 h-5 rounded-md border border-slate-400 cursor-pointer" style={{ backgroundColor: colorPick}} onClick={()=>granularColorHandler('chart')}> </div></div>
                </div>
                {
                colorVisible && <div className="">
                                    <div className="cursor-pointer bg-yellow-300/40 w-16 hover:bg-slate-300/40  text-xs pl-1 my-2 float-right" onClick={()=>setColorVisible(false)}>close</div>
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
                                                        <div key={colorIndex} className="p-3 rounded-full" style={{ backgroundColor: color }}></div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    </div>
                }{
                    granularColorsVisible && <>
                    <div className="cursor-pointer bg-yellow-300/40 w-16 hover:bg-slate-300/40  text-xs pl-1" onClick={()=>setGranularColorsVisible(false)}>close</div>
                    <div className="flex flex-wrap gap-2 p-2">
                    {
                        bgPalette && bgPalette.solids.map((solid, key) => (
                            <div
                                key={key}
                                className={'flex rounded-md h-6 w-6 cursor-pointer hover:border hover:border-black'}
                                onClick={()=>updateGranularColorHandler(solid)}
                                style={{background: solid}}/>
                        ))
                    }
                    </div></>
                }
            </fieldset>
        </form>
      </div>
    </div>
    )
  }

export default ChartDataMods