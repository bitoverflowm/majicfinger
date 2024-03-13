'use client'

import React, { useState } from 'react';
import { useMyState } from '@/context/stateContext'

const staticProfiles = {
    'Sunset': ['#EEBD89', '#D13ABD', 'linear-gradient(to right, #EEBD89, #D13ABD)'],
    'Midnight': ['#9600FF', '#AEBAF8', 'linear-gradient(to right, #9600FF, #AEBAF8)'],
    'Sunrise': ['#F6EA41', '#F048C6', 'linear-gradient(to right, #F6EA41, #F048C6)'],
    'Piglet': ['#EE9CA7', '#FFDDE1', 'linear-gradient(to right, #EE9CA7, #FFDDE1)'],
    'Unicorn': ['#84FFC9', '#ECA0FF', 'linear-gradient(to right, #84FFC9, #ECA0FF)'],
    'Quick': ['#EBF4F5', '#B5C6E0', 'linear-gradient(to right, #EBF4F5, #B5C6E0)'],
    'Ocean': ['#61F4DE', '#6E78FF', 'linear-gradient(to right, #61F4DE, #6E78FF)'],
    'Cane': ['#F7EA60', '#F774BB', 'linear-gradient(to right, #F7EA60, #F774BB)'],
    'Mercury': ['#8399A2', '#EEF2F3', 'linear-gradient(to right, #8399A2, #EEF2F3)'],
    'Nuke': ['#6EEE87', '#5FC52E', 'linear-gradient(to right, #6EEE87, #5FC52E)'],
    'Hot': ['#63FDCA', '#FF6CB1', 'linear-gradient(to right, #63FDCA, #FF6CB1)'],
    'Balthazar': ['#0061FF', '#60EFFF', 'linear-gradient(to right, #0061FF, #60EFFF)'],
    'Oil': ['#0E1C26', '#294861', 'linear-gradient(to right, #0E1C26, #294861)'],
    'Aura': ['#FFFBBC', '#FFFBBC', 'linear-gradient(to right, #FFFBBC, #FFFBBC)'],
    'Galaxy': ['#331E3D', '#8E2DE2', 'linear-gradient(to right, #331E3D, #8E2DE2)'],
    'Tropic': ['#1FA2FF', '#12D8FA', 'linear-gradient(to right, #1FA2FF, #12D8FA)'],
    'Peachy': ['#FFD180', '#FF5370', 'linear-gradient(to right, #FFD180, #FF5370)'],
    'Space': ['#2B3760', '#1B2431', 'linear-gradient(to right, #2B3760, #1B2431)'],
    'Emerald': ['#50A684', '#A2CF6E', 'linear-gradient(to right, #50A684, #A2CF6E)'],
    'Mango': ['#FFDE45', '#FF9600', 'linear-gradient(to right, #FFDE45, #FF9600)'],
    'Horizon': ['#FF7E5F', '#EE9AE5', 'linear-gradient(to right, #FF7E5F, #EE9AE5)'],
    'Polar': ['#E5E5BE', '#003973', 'linear-gradient(to right, #E5E5BE, #003973)'],
    'Sapphire': ['#0A74DA', '#00316E', 'linear-gradient(to right, #0A74DA, #00316E)'],
    'Flame': ['#FF5E7E', '#FFC371', 'linear-gradient(to right, #FF5E7E, #FFC371)']
  }

const themes = {
    'default': ['ag-default', '#D13ABD', 'linear-gradient(to right, #EEBD89, #D13ABD)'],
    'dark': ['ag-default-dark', '#D13ABD', 'linear-gradient(to right, #EEBD89, #D13ABD)'],
    'sheets': ['ag-sheets', '#D13ABD', 'linear-gradient(to right, #EEBD89, #D13ABD)'],
    'sheets-dark': ['ag-sheets-dark', '#D13ABD', 'linear-gradient(to right, #EEBD89, #D13ABD)'],
    'polychroma': ['ag-polychroma', '#D13ABD', 'linear-gradient(to right, #EEBD89, #D13ABD)'],
    'polychroma-dark': ['ag-polychroma-dark', '#D13ABD', 'linear-gradient(to right, #EEBD89, #D13ABD)'],
    'vivid': ['ag-vivid', '#D13ABD', 'linear-gradient(to right, #EEBD89, #D13ABD)'],
    'vivid-dark': ['ag-vivid-dark', '#D13ABD', 'linear-gradient(to right, #EEBD89, #D13ABD)'],
    'material': ['ag-material', '#D13ABD', 'linear-gradient(to right, #EEBD89, #D13ABD)'],
    'material-dark': ['ag-material-dark', '#D13ABD', 'linear-gradient(to right, #EEBD89, #D13ABD)'],
}

const BgPanel = () => {
    const contextState = useMyState()

    const setBgColor = contextState?.setBgColor || '';
    const [colorId, setColorId] = useState()
    const setThemeColor = contextState?.setThemeColor || '';
    const [themeId, setThemeId] = useState()

    const handleStaticClick = (key) => {
        setColorId(key)
        setBgColor(staticProfiles[key][2])
    }

    const handleThemeClick = (key) => {
        setThemeId(key)
        setThemeColor(themes[key][0])
    }


    // Your component logic here

    return (
        <div>
            <div>
                Themes
                <div className='flex flex-wrap gap-1'>
                    {        
                        Object.entries(themes).map(([key, value]) => {
                            return (
                            <div key={key+'color'} className="cursor-pointer">
                                <div
                                key={key}
                                className={`p-2 my-1 place-content center place-items-center flex flex-col text-xxs font-bold w-16 ${(themeId === key) ? `bg-white text-black `: 'bg-black text-white border-black hover:bg-white hover:text-black hover:border-black'} rounded-lg`}
                                onClick={()=> handleThemeClick(key)}
                                >
                                <div className={`rounded-full shadow-xl p-4 w-8 border-2 border-transparent shadow-inner ${(themeId === key) ? 'border-black border-2': ''}`} style={{background: value[2]}}/> <div className="pt-2">{key}</div>
                                </div>
                            </div>
                            )
                        })
                    }
                </div>
            </div>
            <div className='flex flex-wrap gap-1'>
            {        
                Object.entries(staticProfiles).map(([key, value]) => {
                    return (
                    <div key={key+'color'} className="cursor-pointer">
                        <div
                        key={key}
                        className={`p-2 my-1 place-content center place-items-center flex flex-col text-xxs font-bold w-16 ${(colorId === key) ? `bg-white text-black `: 'bg-black text-white border-black hover:bg-white hover:text-black hover:border-black'} rounded-lg`}
                        onClick={()=> handleStaticClick(key)}
                        >
                        <div className={`rounded-full shadow-xl p-4 w-8 border-2 border-transparent shadow-inner ${(colorId === key) ? 'border-black border-2': ''}`} style={{background: value[2]}}/> <div className="pt-2">{key}</div>
                        </div>
                    </div>
                    )
                })
            }
            </div>
        </div>
    );
};

export default BgPanel;