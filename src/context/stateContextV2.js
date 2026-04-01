'use client';

import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { coerceDataTypes } from '@/lib/coerceDataTypes';

// Create the state context
export const StateContextV2 = createContext();

// Custom hook for using the created context
export function useMyStateV2(){
    return useContext(StateContextV2);
}

export const StateProviderV2 = ({children, initialSettings}) => {
    /* Admin states */
    const [userHandle, setUserHandle] = useState()
    const [isLifeTimeMember, setIsLifeTimeMember] = useState()
    const [settings, setSettings] = useState(initialSettings)
    const [viewing, setViewing] = useState('dataStart')
    const [integrationSidebar, setIntegrationSidebar] = useState(null) // 'polymarket' | 'polymarketHistorical' | 'kalshiHistorical' | 'coinGecko' | etc.
    const [rightPanelOpen, setRightPanelOpen] = useState(false) // unified right-side panel (integrations/charts)
    const [rightPanelTab, setRightPanelTab] = useState('integrations') // 'integrations' | 'charts'

    
    /* Dashboard and bento state */
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
            'fontSize': '56px',
            'animation': '',
        },
        "description": "Upload, integrate, generate scrape or start With a blank slate ",
        "description_style": {
            'fontWeight': 500,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '16px',
        },
        "refType": "internal",
        "href": "",
        "cta": "Go",
        "navTo": "dataStart",
        "className": "col-span-3 lg:col-span-1",
        "background":"",
        "background_color": "",
    },
    {
        "Icon": 'TargetIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "Athena",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '56px',
            'animation': '',
        },
        "description": "Play with Lychee's AI",
        "description_style": {
            'fontWeight': 500,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '20px',
        },
        "className": "col-span-3 lg:col-span-1",
        "refType": "internal",
        "href": "",
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
            'fontSize': '56px',
            'animation': '',
        },
        "description": "Learn how to use Lychee",
        "description_style": {
            'fontWeight': 500,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '16px',
        },
        "refType": "external",
        "href": "https://misterrpink.beehiiv.com/",
        "cta": "Go",
        "navTo": "",
        "className": "col-span-1 lg:col-span-1",
        "background": "",
        "background_color": "",
    },
    {
        "Icon": 'MixIcon',
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
            'fontSize': '56px',
            'animation': '',
        },
        "description": "Pull data from CoinGecko, Twitter, Wall St Bets, Reddit, Stripe, SEC EDGAR...",
        "description_style": {
            'fontWeight': 500,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '16px',
        },
        "refType": "internal",
        "href": "",
        "cta": "Start",
        "navTo": "integrations",
        "className": "col-span-3 lg:col-span-2",
        "background": "globe",
        "background_color": "",
    },
    {
        "Icon": 'HeartFilledIcon',
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
        "refType": "external",
        "className": "col-span-3 lg:col-span-1",
        "href": "https://twitter.com/misterrpink1",
        "cta": "Learn more",
        "background": "",
        "background_color": "",
    },
    {
        "Icon": 'BarChartIcon',
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
        "description": "With Mind-blowing charts, visualizations and more",
        "description_style": {
            'fontWeight': 500,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '20px',
        },
        "className": "col-span-3 lg:col-span-2",
        "refType": "internal",
        "href": "/",
        "cta": "Learn more",
        "navTo": "charts",
        "background": "",
        "background_color": "",
    },
    {
        "Icon": 'RocketIcon',
        "icon_style": {
            'color': '#404040',
            'height': '48px',
            'width': '48px'
        },
        "heading": "85% Off",
        "heading_style": {
            'fontWeight': 900,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '56px',
            'animation': '',
        },
        "description": "Life Time Access Once Time Payment",
        "description_style": {
            'fontWeight': 500,
            'fontStyle': 'non-italic',
            'textAlign': 'left',
            'fontSize': '16px',
        },
        "refType": "external",
        "href": "https://buy.stripe.com/aEUaGYfkW9L04wgbJ3",
        "cta": "Go",
        "navTo": "charts",
        "className": "col-span-1 lg:col-span-1",
        "background": "",
        "background_color": "",
    },
    ])
    const [bentoContainer, setBentoContainer] = useState({
        'background' : 'dotPattern',
        'background_color': ''
    })

    /*data management*/
    const [dataSetName, setDataSetName] = useState()
    const [refetchData, setRefetchData] = useState()
    const [refetchChart, setRefetchChart] = useState()
    const [refetchPresentations, setRefetchPresentations] = useState()

    //all saved DataSets
    const [savedDataSets, setSavedDataSets] = useState()
    const [loadedDataMeta, setLoadedDataMeta] = useState()
    const [loadedDataId, setLoadedDataId] = useState()
    
    //all saved Charts
    const [savedCharts, setSavedCharts] = useState()
    const [loadedChartMeta, setLoadedChartMeta ] = useState()
    
    //all saved presentations
    const [savedPresentations, setSavedPresentations] = useState()
    const [loadedPresentationMeta, setLoadedPresentationMeta] = useState()
    const [connectedPresentation, setConnectedPresentation] = useState()

    // Data sheets: user can have multiple sheets (Sheet 1, Sheet 2, ...); each can have its own data and optional live stream
    // `provenance` stores the structured query that produced the sheet (so we can re-run it server-side as a CTE).
    const [dataSheets, setDataSheets] = useState(() => ({ 'sheet-1': { name: 'Sheet 1', data: [], provenance: null } }));
    const [activeSheetId, setActiveSheetId] = useState('sheet-1');

    //Connected Data is active working data (derived from active sheet)
    const [dataConnected, setDataConnected] = useState()
    const connectedData = useMemo(() => dataSheets[activeSheetId]?.data ?? [], [dataSheets, activeSheetId]);
    const setConnectedData = useCallback((value) => {
      setDataSheets((prev) => {
        const sheet = prev[activeSheetId] || { name: 'Sheet 1', data: [] };
        const raw = typeof value === 'function' ? value(sheet.data || []) : value;
        const data = Array.isArray(raw) ? coerceDataTypes(raw) : (raw != null && typeof raw === 'object' ? coerceDataTypes([raw]) : sheet.data || []);
        return { ...prev, [activeSheetId]: { ...sheet, data } };
      });
    }, [activeSheetId]);

    const addNewSheetAndActivate = useCallback((onNewSheet) => {
      setDataSheets((prev) => {
        const keys = Object.keys(prev);
        const nextNum = keys.length + 1;
        const newId = `sheet-${nextNum}`;
        setTimeout(() => {
          setActiveSheetId(newId);
          if (typeof onNewSheet === 'function') onNewSheet(newId);
        }, 0);
        return { ...prev, [newId]: { name: `Sheet ${nextNum}`, data: [] } };
      });
    }, []);

    const replaceCurrentSheetData = useCallback((data) => {
      const raw = Array.isArray(data) ? data : (data != null ? [data] : []);
      setDataSheets((prev) => ({
        ...prev,
        [activeSheetId]: { ...(prev[activeSheetId] || { name: 'Sheet 1' }), data: coerceDataTypes(raw) },
      }));
    }, [activeSheetId]);

    const setSheetData = useCallback((sheetId, value) => {
      setDataSheets((prev) => {
        const sheet = prev[sheetId] || { name: `Sheet ${sheetId}`, data: [] };
        const raw = typeof value === 'function' ? value(sheet.data || []) : value;
        const data = Array.isArray(raw) ? coerceDataTypes(raw) : (raw != null && typeof raw === 'object' ? coerceDataTypes([raw]) : sheet.data || []);
        return { ...prev, [sheetId]: { ...sheet, data } };
      });
    }, []);
    const [connectedCols, setConnectedCols] = useState() //cols of fresh data
    const [tempData, setTempData] = useState() //holder state; whenver new data comes, tempData holds the previous state incase an action was a mistake

    //datatypes
    const [dataTypes, setDataTypes] = useState({});
    const [dataTypeMismatch, setDataTypeMismatch] = useState(false);

    // Summarization: tables created from frequency count, contingency, etc. Kept in memory alongside main data.
    const [summarizationTables, setSummarizationTables] = useState([]);
    // When charting a summary table, ChartView uses this instead of connectedData. Does not override main data.
    const [chartDataOverride, setChartDataOverride] = useState(null);
    const [chartDataOverrideMeta, setChartDataOverrideMeta] = useState(null); // { type, title, summarizationId }

    // Polymarket WebSocket live price feed: controls and preset for line chart (time/price)
    const [polymarketWsState, setPolymarketWsState] = useState({
      isRunning: false,
      stop: null,
      start: null,
      assetIds: null,
      chartPreset: null, // { type: 'line', xKey: 'time', yKey: 'price' } when user clicks Chart
    });

    // Chainlink (RTDS crypto_prices_chainlink) live feed: keep sidebar mounted on Charts so WS stays alive
    const [chainlinkWsState, setChainlinkWsState] = useState({
      isRunning: false,
      stop: null,
      start: null,
      chartPreset: { type: 'line', xKey: 'time', yKey: 'value' },
    });

    // App-level live streams: multiple streams keyed by sheetId (streamsBySheetId)
    const [liveStreamState, setLiveStreamState] = useState({
      streamsBySheetId: {},
    });
    const noop = useCallback(() => {}, []);
    const [liveStreamActions, setLiveStreamActions] = useState({
      start: noop,
      stop: noop,
      pause: noop,
      resume: noop,
      restart: noop,
    });

    // Memoize the context value to optimize performance
    const providerValue = useMemo(() => ({
        settings, setSettings, viewing, setViewing, connectedData, setConnectedData, connectedCols, setConnectedCols, dataTypes, setDataTypes, dataTypeMismatch, setDataTypeMismatch
    }), [settings, viewing, connectedCols, dataTypes, dataTypeMismatch]);
    

    useEffect(() => {
        if (connectedData && connectedData.length > 0) {
            const detectedDataTypes = determineDataTypes(connectedData);
            if (Object.keys(dataTypes).length === 0) {
                setDataTypes(detectedDataTypes);
            } else {
                const hasMismatch = checkDataTypeMismatch(detectedDataTypes, dataTypes);
                setDataTypeMismatch(hasMismatch);
            }

            const keys = Object.keys(connectedData[0]);
            const columnsLabels = keys.map(key => ({
                field: key,
                cellDataType: dataTypes[key] || 'text'
            }));

            setConnectedCols(columnsLabels);
        }
    }, [connectedData, dataTypes]);

    const detectDataType = (value) => {
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'boolean') return 'boolean';
        if (value instanceof Date) return 'date';
        // If value is a long string representing a number, treat it as text
        if (typeof value === 'string' && value.length > 15 && !isNaN(parseFloat(value))) return 'text';
        if (typeof value === 'number' && !isNaN(value) && isFinite(value)) return 'number';
        if (typeof value === 'string' && value !== '' && !isNaN(parseFloat(value)) && isFinite(Number(value))) return 'number';
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
        <StateContextV2.Provider value={{providerValue, dashData, setDashData, bentoContainer, setBentoContainer, viewing, setViewing, integrationSidebar, setIntegrationSidebar, rightPanelOpen, setRightPanelOpen, rightPanelTab, setRightPanelTab, connectedData, setConnectedData, dataConnected, setDataConnected, tempData, setTempData, connectedCols, setConnectedCols, dataSetName, setDataSetName, savedDataSets, setSavedDataSets, loadedDataMeta, setLoadedDataMeta, savedCharts, setSavedCharts, loadedChartMeta, setLoadedChartMeta, savedPresentations, setSavedPresentations, loadedPresentationMeta, setLoadedPresentationMeta, connectedPresentation, setConnectedPresentation, refetchData, setRefetchData, refetchChart, setRefetchChart, refetchPresentations, setRefetchPresentations, loadedDataId ,setLoadedDataId, dataTypes, setDataTypes, dataTypeMismatch, setDataTypeMismatch, userHandle, setUserHandle, isLifeTimeMember, setIsLifeTimeMember, summarizationTables, setSummarizationTables, chartDataOverride, setChartDataOverride, chartDataOverrideMeta, setChartDataOverrideMeta, polymarketWsState, setPolymarketWsState, chainlinkWsState, setChainlinkWsState, liveStreamState, setLiveStreamState, liveStreamActions, setLiveStreamActions, dataSheets, setDataSheets, activeSheetId, setActiveSheetId, addNewSheetAndActivate, replaceCurrentSheetData, setSheetData}}>
            {children}
        </StateContextV2.Provider>
    )
}

  