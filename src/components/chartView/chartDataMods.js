const { useState } = require('react');

import { FaSortDown } from "react-icons/fa";

import { useMyState } from '@/context/stateContext'
import Group from './ui/group';
import ColorPanel from "./panels/colorPanel";

const ChartDataMods = () => {
    const contextState = useMyState()
    const [show, setShow] = useState(false)

    const xKey = contextState?.xKey || '';
    const setXKey = contextState?.setXKey || {};
    const yKey = contextState?.yKey || '';
    const setYKey = contextState?.setYKey || {};
    const xOptions = contextState?.xOptions || {};
    const yOptions = contextState?.yOptions || {};
    const chartTypes = contextState?.chartTypes || {};
    const directions = contextState?.directions || {};
    const direction = contextState?.direction || '';
    const setDirection = contextState?.setDirection || {};
    const type = contextState?.type || '';
    const setType = contextState?.setType || {};

    
    return (
        <div className="">
            <div>
                <Group title={'Select your chart type'} options={chartTypes} val={type} call={setType} opened={true}/>
            </div>
            <div>
                <Group title={'Set X-axis'} options={xOptions} val={xKey} call={setXKey} opened={false}/>
            </div>
            <div>
                <Group title={'Set Y-axis'} options={yOptions} val={yKey} call={setYKey} opened={false}/>
            </div>
            <div>
                <Group title={'Direction'} options={directions} val={direction} call={setDirection} opened={false}/>
            </div>
            <div>
                <ColorPanel />
            </div>            
        </div>
    )
    
}

export default ChartDataMods;