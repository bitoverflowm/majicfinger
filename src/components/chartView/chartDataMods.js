import { useState, useEffect } from "react"

import Group from './ui/group'
import { Button } from "../ui/button";


const ChartDataMods = ({seriesConfigs, setSeriesConfigs, chartTypes, setChartTheme, setCardColor, setBgColor, setTextColor, xOptions, yOptions, directions, direction, setDirection }) => {

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
            console.log("new configs: ", newConfigs)
            return newConfigs;
        });
    };

    return (
      <div className="grid gap-3 rounded-lg border p-4 w-full">
        {seriesConfigs.map((config, index) => (
            <div key={index}>
                <div className="flex">
                  <small className="text-xs font-medium leading-none">Chart {index + 1}</small>
                </div>
                <div className="py-1">
                    {chartTypes && chartTypes.length > 1 && <Group title={`Type`} options={chartTypes} val={config.type} call={value => handleSeriesConfigChange(index, 'type', value)} opened={true} />}
                </div>
                <div className="py-1">
                    {xOptions && xOptions.length > 1 && <Group title={`X-axis`} options={xOptions} val={config.xKey} call={value => handleSeriesConfigChange(index, 'xKey', value)} opened={false} />}
                </div>
                <div className="py-1">
                    {yOptions && yOptions.length > 1 && <Group title={`Y-axis`} options={yOptions} val={config.yKey} call={value => handleSeriesConfigChange(index, 'yKey', value)} opened={false} />}
                </div>
            </div>
        ))}
        <div>
          <code className="relative rounded bg-lychee_blue/10 px-[0.3rem] py-[0.2rem] font-mono text-xs hover:bg-lychee_green/30 cursor-pointer" onClick={()=>addNewSeries()}>
              + Add Series
          </code>
        </div>

        <div>
          {directions && directions.length > 1 && <Group title={'Direction'} options={directions} val={direction} call={setDirection} opened={false}/>}
        </div>
      </div>
    )
  }

export default ChartDataMods