const { useState, useEffect } = require('react')

import { FaSortDown } from "react-icons/fa"
import { HiOutlinePencilSquare } from "react-icons/hi2"
import { GoEyeClosed } from "react-icons/go"
import { Switch } from '@headlessui/react'

import { useMyState } from '@/context/stateContext'
import Group from './ui/group'
import ColorPanel from "./panels/colorPanel"

const ChartDataMods = () => {
    const contextState = useMyState()
    const [show, setShow] = useState(false)
    const [editingTitle, setEditingTitle] = useState(false)
    const [editingSubTitle, setEditingSubTitle] = useState(false)
    const [originalVal, setOriginalVal] = useState('')
    

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
    const gridLinesEnabled = contextState?.gridLinesEnabled || '';
    const setGridLinesEnabled = contextState?.setGridLinesEnabled || {};

    const cancelHandler = (origin) => {
        if(origin === 'title'){
            setTitle(originalVal)
            setEditingTitle(false)
            setOriginalVal('')
        } else if(origin === 'subTitle'){
            setSubTitle(originalVal)
            setEditingSubTitle(false)
            setOriginalVal('')
        }
        
    }

    const editHandler = (origin) => {
        if(origin === 'title'){
            setOriginalVal(title)
            setEditingTitle(true)                   
        }else if(origin === 'subTitle'){
            setOriginalVal(subTitle)
            setEditingSubTitle(true)                   
        }
        
    }

    
    return (
        <div className="text-xxs">
            <div className="pl-4 pr-2">
                <div className="px-1 flex gap-2 text-xs w-full border border-white" onClick={()=>!editingTitle && editHandler('title')}>
                    {
                    editingTitle ? 
                        <input type="text" className="w-full" autoFocus={true} value={title} onChange={(e)=>setTitle(e.target.value)}/>
                        : <div className="w-full">Title: {title}</div>
                    }
                    <div className="place-self-right cursor-pointer" >
                        {editingTitle ? <div className="flex gap-1">
                                <div className="py-1 px-2 bg-lychee-green hover:bg-lychee-black hover:text-white rounded-md" onClick={()=>setEditingTitle(false)}>Save</div>
                                <div className="py-1 px-2 bg-slate-200 hover:bg-lychee-black hover:text-white rounded-md" onClick={()=>cancelHandler('title')}>Cancel</div>
                                </div> :  <HiOutlinePencilSquare />}
                    </div>
                </div>
                <div className="px-1 flex gap-2 text-xs w-full border border-white" onClick={()=>!editingSubTitle && editHandler('subTitle')}>
                    {
                    editingSubTitle ? 
                        <input type="text" className="w-full" autoFocus={true} value={subTitle} onChange={(e)=>setSubTitle(e.target.value)}/>
                        : <div className="w-full">Sub Title: {subTitle}</div>
                    }
                    <div className="place-self-right cursor-pointer" >
                        {editingSubTitle ? <div className="flex gap-1">
                                <div className="py-1 px-2 bg-lychee-green hover:bg-lychee-black hover:text-white rounded-md" onClick={()=>setEditingSubTitle(false)}>Save</div>
                                <div className="py-1 px-2 bg-slate-200 hover:bg-lychee-black hover:text-white rounded-md" onClick={()=>cancelHandler('subTitle')}>Cancel</div>
                                </div> :  <HiOutlinePencilSquare />}
                    </div>
                </div>
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
            <div className="hidden">
                <Group title={'Direction'} options={directions} val={direction} call={setDirection} opened={false}/>
            </div>
            <div className="hidden">
                <div className="flex">Grid lines 
                    <Switch
                        checked={gridLinesEnabled}
                        onChange={()=>setGridLinesEnabled(!gridLinesEnabled)}
                        className={`${gridLinesEnabled ? 'bg-teal-900' : 'bg-teal-700'}
                        relative inline-flex h-[38px] w-[74px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white/75`}
                    >
                        <span className="sr-only">Use setting</span>
                        <span
                        aria-hidden="true"
                        className={`${gridLinesEnabled ? 'translate-x-9' : 'translate-x-0'}
                            pointer-events-none inline-block h-[34px] w-[34px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
                        />
                    </Switch> 
                </div>
            </div>
            <div>
                <ColorPanel />
            </div>
            <div className="text-xxs px-3 py-2">
                <div className="font-bold">Coming Soon:</div>
                <div>✨More charts, better charts, more colors, more control</div>
                <div onClick={()=>setWorking('getLychee')} className="cursor-pointer">* Become a <span className="underline">lifetime</span> member to vote on which features to accelerate</div>
                <div className="sm:hidden text-lychee-red">* If you are on mobile I apologize, mobile view and app coming soon</div>
            </div>       
        </div>
    )
    
}

export default ChartDataMods;