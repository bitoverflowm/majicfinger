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
    const [dashData, setDashData] = useState([{
        "Icon": 'RocketIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "17",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '96px',
            'animation': 'countUp',
        },
        "description": "years of startups",
        "description_style": {
            'fontWeight': 100,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '20px',
        },
        "href": "/",
        "cta": "Learn more",
        "className": "col-span-3 lg:col-span-1",
        "background":"",
        "background_color": "",
    },
    {
        "Icon": 'TwitterLogoIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "1,000",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '96px',
            'animation': 'countUp',
        },
        "description": "Followers on X",
        "description_style": {
            'fontWeight': 100,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '20px',
        },
        "href": "https://twitter.com/misterrpink1",
        "cta": "Learn more",
        "className": "col-span-3 lg:col-span-2",
        "background": "globe",
        "background_color": "",
    },
    {
        "Icon": 'SketchLogoIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "Katsu",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '160px',
            'animation': '',
        },
        "description": "Launching on Product Hunt",
        "description_style": {
            'fontWeight': 100,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '40px',
        },
        "href": "https://www.producthunt.com/posts/katsu?utm_source=badge-featured&utm_medium=badge&utm_source=badge-katsu",
        "cta": "Learn more",
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
        "href": "/",
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

    return (
        <StateContextV2.Provider value={{providerValue, dashData, setDashData, bentoContainer, setBentoContainer}}>
            {children}
        </StateContextV2.Provider>
    )
}

  