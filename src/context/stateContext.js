'use client';

import React, { createContext, useState, useContext, useEffect, useMemo, use } from 'react';

// Create the state context
export const StateContext = createContext();

// Custom hook for using the created context
export function useMyState() {
  return useContext(StateContext);
}

// Create the state provider component
export const StateProvider = ({ children, bento=false }) => {
  const [dflt, setDflt] = useState(true)
  const [working, setWorking] = useState(null);
  const [aiOpen, setAiOpen] = useState(null);
  const [xKey, setXKey] = useState('mission')
  const [yKey, setYKey] = useState('price')
  const [type, setType] = useState('bar')
  const [colDefs, setColDefs] = useState()
  const [rowData, setRowData] = useState()
  const [bgColor, setBgColor] = useState()
  const [bgType, setBgType] = useState('solid')
  const [themeColor, setThemeColor] = useState()
  const [strokeColor, setStrokeColor] = useState('#000')

  const [title, setTitle] = useState('Space Missions')
  const [subTitle, setSubTitle] = useState('Space Missions by Price')

  const [data, setData] = useState()

  const [fmtCols, setFmtCols] = useState()

  /* Themes and colors */
  const [chartTheme, setChartTheme] = useState({
    baseTheme: "ag-default",
    palette: {
      fills: ["#cdb4db", "#ffc8dd", "#ffafcc", "#bde0fe", "#a2d2ff", "#fff"],
      strokes: ["#000"],
    },
  })

  useEffect(()=>{
    chartOptions &&
      setChartOptions(prevOptions => ({
          ...prevOptions,
          theme: chartTheme
        }))
  }, [chartTheme])

  const [gridLinesEnabled, setGridLinesEnabled] = useState(false)

  useEffect(()=> {
    chartOptions && chartOptions.theme.overrides && 
      setChartOptions(prevOptions => ({
          ...prevOptions,
          axes: [
            ...prevOptions.axes[0],
            {
              ...prevOptions.axes[1],
              gridLine: {
                enabled: gridLinesEnabled
              }
            }
          ]
        }))
  }, [gridLinesEnabled])

  const [chartOptions, setChartOptions] = useState({ // Data: Data to be displayed in the chart
    theme: chartTheme,
    data: data,
    // Series: Defines which chart type and data to use
    series: [{ type: 'bar', xKey: 'mission', yKey: 'price', direction: "horizontal"}],
    //animation TODO: fix not working
    animation: [{enabled: true, duration: 0.1}],
    //labeling x, y, and even other axers
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
  ]})

  const [xOptions, setXOptions] = useState()
  const [yOptions, setYOptions] = useState()
  const [chartTypes] = useState(['bar', 'line', 'area', 'scatter', 'bubble', 'pie'])
  const [directions] = useState(['horizontal', 'vertical'])
  const [direction, setDirection] = useState('vertical')
  
  useEffect(()=> {
    data && setRowData(data)
    fmtCols && setColDefs(fmtCols)
    if(data && fmtCols){
      if(type === 'scatter'){
          setChartOptions(prevOptions => ({
              ...prevOptions,
              series: [{
                      type: 'scatter',
                      data: data,
                      xKey: fmtCols[0].field,
                      yKey: fmtCols[1].field,
                  }
                ],
              }))
          }
      else{
          setChartOptions(prevOptions => ({
              ...prevOptions,
              data: data,
              series: [{
                      type: chartOptions.series[0].type,
                      xKey: fmtCols[0].field,
                      yKey: fmtCols[1].field,
                  }
                ],
                  background: {
                    visible: false,
                  },
              }))
      }
      setXKey(fmtCols[0].field)
      setYKey(fmtCols[1].field)
  }
  }, [data, fmtCols])

  useEffect(() => {
      if(type === 'scatter'){
          setChartOptions(prevOptions => ({
              ...prevOptions,
              series: [{
                      type: 'scatter',
                      data: data,
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
              series: [{
                      type: type ? type : chartOptions.series[0].type,
                      xKey: xKey ? xKey : chartOptions.series[0].xKey,
                      yKey: yKey ? yKey : chartOptions.series[0].yKey,
                      direction: direction ? direction: chartOptions.series[0].direction,
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
      }
  }, [type, xKey, yKey, direction, themeColor])

  const extractData = (cols) => {
    let arr = cols.map(items => items.field)
    setXOptions(arr)
    setYOptions(arr)
  }


  useEffect(()=> {
    fmtCols && extractData(fmtCols)
  }, [fmtCols])

  useEffect(()=> {
    if(!dflt && data && data.length > 0){
        const keys = Object.keys(data[0])
        const columnsLabels = keys.map(key => {
            // Handle any price headings
            /*if (key === 'price') {
                return { field: key, valueFormatter: params => '$' + params.value.toLocaleString() }
            }*/
            return { field: key }
        })
        
        setFmtCols(columnsLabels)           
    }
  }, [data])

  //Apply settings across all columns
  const defaultColDef = useMemo(() => ({
    filter: true, // Enable filtering on all columns
    //maxWidth: 120,
    editable: true,
    background: {visible: false},
    resizable: true,
    singleClickEdit: true,
    stopEditingWhenCellsLoseFocus : true,
  }))

  useEffect(()=>{
    if(!data && !bento){
        setDflt(true)
        fetch('https://www.ag-grid.com/example-assets/space-mission-data.json') // fetch default data
        .then(result => result.json()) // Convert to JSON
        .then(rowData => setData(rowData)); // Update state of `rowData`

        setFmtCols([
            { field: "mission" },
            { field: "price" },
            { field: "company" },
            { field: "location" },
            { field: "date" },            
            { field: "successful" },
            { field: "rocket" }
          ])

        setChartOptions(prevOptions => ({
          ...prevOptions,
          data: rowData,
          // Series: Defines which chart type and data to use
          series: [{ type: 'bar', xKey: 'mission', yKey: 'price', direction: "horizontal"}],
          //animation TODO: fix not working
          animation: [{enabled: true, duration: 0.1}],
          //labeling x, y, and even other axers
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
              }
            ]
        }))
    }
  }, [])

  /*
   * Bento Specific states
   */

  const [bentoContainer, setBentoContainer] = useState({
    'background' : 'dotPattern',
    'background_color': ''
  })

  return (
    <StateContext.Provider value={{working, setWorking, aiOpen, setAiOpen, chartOptions, setChartOptions, dflt, setDflt, xKey, setXKey, yKey, setYKey, type, setType, data, setData, fmtCols, setFmtCols, xOptions, setXOptions, yOptions, setYOptions, chartTypes, directions, direction, setDirection, colDefs, rowData, defaultColDef, bgColor, setBgColor, bgType, setBgType, chartTheme, setChartTheme, strokeColor, setStrokeColor, title, setTitle, subTitle, setSubTitle, gridLinesEnabled, setGridLinesEnabled, bentoContainer, setBentoContainer}}>
      {children}
    </StateContext.Provider>
  );
};
