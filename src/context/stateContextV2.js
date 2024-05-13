'use client';

import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';

// Create the state context
export const StateContextV2 = createContext();

// Custom hook for using the created context
export function useMyStateV2(){
    return useContext(StateContextV2);
}


export const StateProviderV2 = ({children, initialSettings}) => {
    const [settings, setSettings] = useState(initialSettings)
    const [viewing, setViewing] = useState('dashboard')
    const [dashData, setDashData] = useState([{
        "Icon": 'CubeIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "Data",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '96px',
            'animation': '',
        },
        "description": "Start with some data",
        "description_style": {
            'fontWeight': 100,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '20px',
        },
        "href": "",
        "cta": "Go",
        "navTo": "dataStart",
        "className": "col-span-3 lg:col-span-1",
        "background":"",
        "background_color": "",
    },
    {
        "Icon": 'SketchLogoIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "Gallery",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '96px',
            'animation': '',
        },
        "description": "Beautiful charts and visualizations in action",
        "description_style": {
            'fontWeight': 100,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '20px',
        },
        "href": "",
        "cta": "Go",
        "navTo": "gallery",
        "className": "col-span-1 lg:col-span-1",
        "background": "globe",
        "background_color": "",
    },
    {
        "Icon": 'QuestionMarkIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "How To's",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '96px',
            'animation': '',
        },
        "description": "Unleash the full power of your data with Lychee University",
        "description_style": {
            'fontWeight': 100,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '20px',
        },
        "href": "/lychee_university",
        "cta": "Go",
        "navTo": "",
        "className": "col-span-1 lg:col-span-1",
        "background": "",
        "background_color": "",
    },
    {
        "Icon": 'LinkNone2Icon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "Integrate",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '160px',
            'animation': '',
        },
        "description": "with your favorite data sources",
        "description_style": {
            'fontWeight': 100,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '30px',
        },
        "href": "",
        "cta": "Start",
        "navTo": "integrations",
        "className": "col-span-3 lg:col-span-2",
        "background": "",
        "background_color": "",
    },
    {
        "Icon": 'MagicWandIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "AI",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '160px',
            'animation': '',
        },
        "description": "Play with Athena (Lychee's AI)",
        "description_style": {
            'fontWeight': 100,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '20px',
        },
        "className": "col-span-3 lg:col-span-1",
        "href": "/",
        "cta": "Go",
        "navTo": "ai",
        "background": "",
        "background_color": "",
    },
    {
        "Icon": 'CameraIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "Present your Findings",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '24px',
            'animation': '',
        },
        "description": "Impress your boss with mind blowing presentations",
        "description_style": {
            'fontWeight': 100,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '20px',
        },
        "className": "col-span-3 lg:col-span-2",
        "href": "/",
        "cta": "Learn more",
        "navTo": "presentation",
        "background": "",
        "background_color": "",
    },
    {
        "Icon": 'HeartIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "Created By",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '24px',
            'animation': '',
        },
        "description": "@misterrpink1",
        "description_style": {
            'fontWeight': 100,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '20px',
        },
        "className": "col-span-3 lg:col-span-1",
        "href": "https://twitter.com/misterrpink1",
        "cta": "Learn more",
        "background": "",
        "background_color": "",
    }])
    const [bentoContainer, setBentoContainer] = useState({
        'background' : 'dotPattern',
        'background_color': ''
      })

    // Memoize the context value to optimize performance
    const providerValue = useMemo(() => ({ settings, setSettings }), [settings]);


    //data management
    
    //Connected Data is active working data. 
    const [dataConnected, setDataConnected] = useState() //boolean, do we have connected data or not
    const [connectedData, setConnectedData] = useState()
    const [connectedCols, setConnectedCols] = useState() //cols of fresh data
    const [tempData, setTempData] = useState() //holder state; whenver new data comes, tempData holds the previous state incase an action was a mistake

    const [previewChartOptions, setPreviewChartOptions] = useState()

    useEffect(()=> {
        if(connectedData && connectedData.length > 0){
            const keys = Object.keys(connectedData[0])
            const columnsLabels = keys.map(key => {
                // Handle any price headings
                /*if (key === 'price') {
                    return { field: key, valueFormatter: params => '$' + params.value.toLocaleString() }
                }*/
                return { field: key }
            })
            setConnectedCols(columnsLabels)
            setPreviewChartOptions({
                data: connectedData,
                series: [{
                    type: 'bar',
                    xKey: columnsLabels && columnsLabels[0].field,
                    yKey: columnsLabels && columnsLabels[1].field,
                    direction: 'vertical'
                }]
            })
        }
    }, [connectedData])

    



    return (
        <StateContextV2.Provider value={{providerValue, dashData, setDashData, bentoContainer, setBentoContainer, viewing, setViewing, connectedData, setConnectedData, dataConnected, setDataConnected, tempData, setTempData, connectedCols, previewChartOptions}}>
            {children}
        </StateContextV2.Provider>
    )
}

  