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
        "description": "Scrape, Upload, Integrate, Generate or Start With a fresh sheet ",
        "description_style": {
            'fontWeight': 500,
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
            'fontWeight': 500,
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
            'fontWeight': 500,
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
        "description": "Pull data from Twitter, WallSt Bets, Reddit, Stripe, SEC EDGAR...",
        "description_style": {
            'fontWeight': 500,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '30px',
        },
        "href": "",
        "cta": "Start",
        "navTo": "integrations",
        "className": "col-span-3 lg:col-span-2",
        "background": "globe",
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
            'fontWeight': 500,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '20px',
        },
        "className": "col-span-3 lg:col-span-1",
        "href": "https://twitter.com/misterrpink1",
        "cta": "Learn more",
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
            'fontWeight': 500,
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
            'fontWeight': 500,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '20px',
        },
        "href": "",
        "cta": "Go",
        "navTo": "gallery",
        "className": "col-span-1 lg:col-span-1",
        "background": "",
        "background_color": "",
    },
    ])
    const [bentoContainer, setBentoContainer] = useState({
        'background' : 'dotPattern',
        'background_color': ''
      })


    //data management
    const [dataSetName, setDataSetName] = useState()
    const [refetchData, setRefetchData] = useState()
    const [refetchChart, setRefetchChart] = useState()
    //all saved DataSets
    const [savedDataSets, setSavedDataSets] = useState()
    const [loadedDataMeta, setLoadedDataMeta] = useState()
    const [loadedDataId, setLoadedDataId] = useState()
    //all saved Charts
    const [savedCharts, setSavedCharts] = useState()
    const [loadedChartMeta, setLoadedChartMeta ] = useState()

    //multi sheet handler
    const [multiSheetFlag, setMultiSheetFlag] = useState()
    const [multiSheetData, setMultiSheetData] = useState()
    const [sheetNames, setSheetNames] = useState()

    //Connected Data is active working data. 
    const [dataConnected, setDataConnected] = useState() //boolean, do we have connected data or not
    const [connectedData, setConnectedData] = useState()
    const [connectedCols, setConnectedCols] = useState() //cols of fresh data
    const [tempData, setTempData] = useState() //holder state; whenver new data comes, tempData holds the previous state incase an action was a mistake

    //datatypes
    const [dataTypes, setDataTypes] = useState({});
    const [dataTypeMismatch, setDataTypeMismatch] = useState(false);

    // Memoize the context value to optimize performance
    const providerValue = useMemo(() => ({
        settings, setSettings, viewing, setViewing, connectedData, setConnectedData, connectedCols, setConnectedCols, dataTypes, setDataTypes, dataTypeMismatch, setDataTypeMismatch
    }), [settings, viewing, connectedCols, dataTypes, dataTypeMismatch]);
    

    useEffect(() => {
        if (connectedData && connectedData.length > 0) {
            // Check if data types are already set
            if (Object.keys(dataTypes).length === 0) {
                // Determine data types
                const detectedDataTypes = determineDataTypes(connectedData);
                setDataTypes(detectedDataTypes);
            } else {
                // Check for data type mismatches
                const detectedDataTypes = determineDataTypes(connectedData);
                const hasMismatch = checkDataTypeMismatch(detectedDataTypes, dataTypes);
                setDataTypeMismatch(hasMismatch);
            }

            // Update connectedCols based on detected or existing data types
            const keys = Object.keys(connectedData[0]);
            const columnsLabels = keys.map(key => ({
                field: key,
                cellDataType: dataTypes[key] || 'text'
            }));
    
            setConnectedCols(columnsLabels);
        }
    }, [connectedData, dataTypes]);

    const detectDataType = (value) => {
        if (typeof value === 'boolean') return 'boolean';
        //if (!isNaN(Date.parse(value))) return 'dateString';
        if (!isNaN(parseFloat(value)) && isFinite(value)) return 'number';
        if (typeof value === 'object' && value !== null) return 'object';
        return 'text';
    };

    const determineDataTypes = (data) => {
        const types = {};
        if (data.length > 0) {
            const sample = data[0];
            Object.keys(sample).forEach(key => {
                types[key] = detectDataType(sample[key]);
            });
        }
        return types;
    };

    const checkDataTypeMismatch = (detectedDataTypes, existingDataTypes) => {
        return Object.keys(detectedDataTypes).some(key => detectedDataTypes[key] !== existingDataTypes[key]);
    };

    //when we save we need to load meta; this is how we do it 
    useEffect(() => {
        savedDataSets && savedDataSets[loadedDataId] && setLoadedDataMeta(savedDataSets.loadedDataId) 
    }, [loadedDataId, savedDataSets])


    return (
        <StateContextV2.Provider value={{providerValue, dashData, setDashData, bentoContainer, setBentoContainer, viewing, setViewing, connectedData, setConnectedData, dataConnected, setDataConnected, tempData, setTempData, connectedCols, setConnectedCols, dataSetName, setDataSetName, savedDataSets, setSavedDataSets, loadedDataMeta, setLoadedDataMeta, savedCharts, setSavedCharts, loadedChartMeta, setLoadedChartMeta, refetchData, setRefetchData, refetchChart, setRefetchChart, loadedDataId ,setLoadedDataId, multiSheetFlag, setMultiSheetFlag, multiSheetData, setMultiSheetData, dataTypes, setDataTypes, dataTypeMismatch, setDataTypeMismatch, sheetNames, setSheetNames}}>
            {children}
        </StateContextV2.Provider>
    )
}

  