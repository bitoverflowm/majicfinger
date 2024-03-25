const { useState } = require('react');

import { FaSortDown } from "react-icons/fa";
import { HiOutlinePencilSquare } from "react-icons/hi2";


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
    const title = contextState?.title || '';
    const setTitle = contextState?.setTitle || {};
    const subTitle = contextState?.subTitle || '';
    const setSubTitle = contextState?.setSubTitle || {};

    
    return (
        <div className="">
            <div className="pl-5 pr-3">
                <div className="flex gap-2 text-xxs w-full">Title: <div className="w-full">{title}</div> <div className="place-self-right"><HiOutlinePencilSquare /></div></div>
            </div>
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
            <div className="text-xxs px-3 py-2">
                <div className="font-bold">Coming Soon:</div>
                <div>✨More charts, better charts, more colors</div>
                <div onClick={()=>setWorking('getLychee')} className="cursor-pointer">* Become a <span className="underline">lifetime</span> member to vote on which features to accelerate</div>
                <div className="sm:hidden text-lychee-red">* If you are on mobile I apologize, mobile view and app coming soon</div>
            </div>       
        </div>
    )
    
}

export default ChartDataMods;