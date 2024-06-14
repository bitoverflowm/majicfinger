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

    const [previewChartOptions, setPreviewChartOptions] = useState()

    // Memoize the context value to optimize performance
    const providerValue = useMemo(() => ({
        settings, setSettings, viewing, setViewing, connectedData, setConnectedData, connectedCols, setConnectedCols, dataTypes, setDataTypes, dataTypeMismatch, setDataTypeMismatch
    }), [settings, viewing, connectedData, connectedCols, dataTypes, dataTypeMismatch]);

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
            setPreviewChartOptions({
                data: connectedData,
                series: [{
                    type: 'bar',
                    xKey: columnsLabels && columnsLabels[0].field,
                    yKey: columnsLabels && columnsLabels[1] && columnsLabels[1].field,
                    direction: 'vertical'
                }]
            });
        }
    }, [connectedData, dataTypes]);

    const detectDataType = (value) => {
        if (typeof value === 'boolean') return 'boolean';
        if (!isNaN(Date.parse(value))) return 'dateString';
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

    //charts
    const extractData = (cols) => {
        let arr = cols.map(items => items.field)
        setXOptions(arr)
        setYOptions(arr)
    }

    //charts
    useEffect(()=> {
        connectedCols && extractData(connectedCols)
    }, [connectedCols])

    //chart specifics
    const [titleHidden, setTitleHidden] = useState()
    const [title, setTitle] = useState()
    const [subTitle, setSubTitle] = useState()
    const [titleFont, setTitleFont] = useState("inter")
    const [chartTypes] = useState(['bar', 'line', 'area', 'scatter', 'bubble', 'pie'])
    const [type, setType] = useState('bar')
    const [xOptions, setXOptions] = useState()
    const [yOptions, setYOptions] = useState()
    
    /* Themes and colors */
    const [chartTheme, setChartTheme] = useState({
        baseTheme: "ag-default",
        palette: {
            fills: ["#cdb4db"],
            strokes: ["#000"],
        },
    })

    const [chartOptions, setChartOptions] = useState({ // Data: Data to be displayed in the chart
        theme: chartTheme,
        data: connectedData,
        // Series: Defines which chart type and data to use
        series: [{ type: 'bar', xKey: '', yKey: '', direction: "vertical"}],
        //animation TODO: fix not working
        //animation: [{enabled: true, duration: 0.1}],
        //labeling x, y, and even other axers
        axes: [
            {
              type: "category",
              position: "bottom",
              title: {
                text: '',
              },
            },
            {
              type: "number",
              position: "left",
              title: {
                text: '',
              },
              label: {
                formatter: ({ value }) => formatNumber(value),
              },
              gridLine: {
                enabled: false
              }
            },
    ]})

    const [xKey, setXKey] = useState('')
    const [yKey, setYKey] = useState('')
    const [gridLinesEnabled, setGridLinesEnabled] = useState(false)
    const [directions] = useState(['horizontal', 'vertical'])
    const [direction, setDirection] = useState('vertical')
    const [themeColor, setThemeColor] = useState()

    const [seriesConfigs, setSeriesConfigs] = useState([{
        type: 'bar',
        xKey: '',
        yKey: '',
        direction: 'vertical'
      }, {
        type: 'bar',
        xKey: '',
        yKey: '',
        direction: 'vertical'
      }]);

    useEffect(()=>{
        const newSeries = seriesConfigs.map((config, index) => ({
            type: config.type,
            xKey: config.xKey,
            yKey: config.yKey,
            direction: direction,
        }));

        if(type === 'scatter'){
            setChartOptions(prevOptions => ({
                ...prevOptions,
                series: [{
                        type: 'scatter',
                        data: connectedData,
                        xKey: xKey ? xKey : chartOptions.series[0].xKey,
                        yKey: yKey ? yKey : chartOptions.series[0].yKey,
                    }],
                background: {
                  visible: false,
                },
                axes: [
                  {
                    type: "category",
                    position: "bottom",
                    title: {
                      text: xKey,
                    },
                  },
                  {
                    type: "number",
                    position: "left",
                    title: {
                      text: yKey,
                    },
                    label: {
                      formatter: ({ value }) => formatNumber(value),
                    },
                    gridLine: {
                      enabled: gridLinesEnabled
                    }
                  },
            ]
                }))
        }else{
            setChartOptions(prevOptions => ({
                ...prevOptions,
                data: connectedData,
                series: newSeries,
                background: { visible: false, },
                }))
            }
    }, [connectedData, type, xKey, yKey, direction, themeColor, seriesConfigs])

    
    const [bgColor, setBgColor] = useState()
    const [textColor, setTextColor] = useState()
    const [cardColor, setCardColor] = useState()

    useEffect(()=>{
        chartOptions &&
          setChartOptions(prevOptions => ({
              ...prevOptions,
              theme: chartTheme
            }))
      }, [chartTheme])

 

    return (
        <StateContextV2.Provider value={{providerValue, dashData, setDashData, bentoContainer, setBentoContainer, viewing, setViewing, connectedData, setConnectedData, dataConnected, setDataConnected, tempData, setTempData, connectedCols, setConnectedCols, previewChartOptions, title, setTitle, subTitle, setSubTitle, chartTypes, type, setType, chartOptions, setChartOptions, xKey, setXKey, yKey, setYKey, gridLinesEnabled, setGridLinesEnabled, directions, direction, setDirection, chartTheme, setChartTheme, xOptions, setXOptions, yOptions, setYOptions, dataSetName, setDataSetName, savedDataSets, setSavedDataSets, loadedDataMeta, setLoadedDataMeta, bgColor, setBgColor, textColor, setTextColor, cardColor, setCardColor, savedCharts, setSavedCharts, loadedChartMeta, setLoadedChartMeta, refetchData, setRefetchData, refetchChart, setRefetchChart, loadedDataId ,setLoadedDataId, multiSheetFlag, setMultiSheetFlag, multiSheetData, setMultiSheetData, dataTypes, setDataTypes, dataTypeMismatch, setDataTypeMismatch, sheetNames, setSheetNames, titleHidden, setTitleHidden, titleFont, setTitleFont, seriesConfigs, setSeriesConfigs}}>
            {children}
        </StateContextV2.Provider>
    )
}

  