'use client';

import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';

// Create the state context
export const StateContext = createContext();

// Custom hook for using the created context
export function useMyState() {
  return useContext(StateContext);
}

// Create the state provider component
export const StateProvider = ({ children }) => {
  const [dflt, setDflt] = useState(true)
  const [working, setWorking] = useState(null);
  const [aiOpen, setAiOpen] = useState(null);
  const [xKey, setXKey] = useState('mission')
  const [yKey, setYKey] = useState('price')
  const [type, setType] = useState('bar')
  const [colDefs, setColDefs] = useState()
  const [rowData, setRowData] = useState()

  const [data, setData] = useState()

  const [fmtCols, setFmtCols] = useState()

  const [chartOptions, setChartOptions] = useState({ // Data: Data to be displayed in the chart
    data: data,
    // Series: Defines which chart type and data to use
    series: [{ type: 'bar', xKey: 'mission', yKey: 'price', direction: "horizontal", fill: '#BA0B31'}],
    // Background we will use Lychee BASS component instead of AGcharts
    background: {
      fill: "black",
    },
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
        },
  ]})

  const [xOptions, setXOptions] = useState()
  const [yOptions, setYOptions] = useState()
  const [chartTypes] = useState(['bar', 'line', 'area', 'scatter', 'bubble', 'pie', 'histogram', 'combination'])
  const [directions] = useState(['horizontal', 'vertical'])
  const [direction, setDirection] = useState('vertical')
  
  useEffect(()=> {
      if((data && fmtCols)){
          if(type === 'scatter'){
              setChartOptions({
                  series: [{
                          type: 'scatter',
                          data: data,
                          xKey: fmtCols[0].field,
                          yKey: fmtCols[1].field,
                      }
                    ],
                  background: {
                    fill: "black",
                  },
                  })
              }
          else{
              setChartOptions({
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
                  })
          }
          setXKey(fmtCols[0].field)
          setYKey(fmtCols[1].field)
      //}
    }
  }, [data, fmtCols])

  useEffect(() => {
      if(type === 'scatter'){
          setChartOptions({
              series: [{
                      type: 'scatter',
                      data: data,
                      xKey: xKey ? xKey : chartOptions.series[0].xKey,
                      yKey: yKey ? yKey : chartOptions.series[0].yKey,
                  }],
                  background: {
                    fill: "aliceblue",
                  },
              })
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
                fill: "aliceblue",
              },
          }))
      }
  }, [type, xKey, yKey, direction])

  const extractData = (cols) => {
    let arr = cols.map(items => items.field)
    setXOptions(arr)
    setYOptions(arr)
  }

  useEffect(() => {
    data && setRowData(data)
    fmtCols && setColDefs(fmtCols)
}, [data, fmtCols])

  useEffect(()=> {
    fmtCols && extractData(fmtCols)
  }, [fmtCols])

  useEffect(()=> {
    if(!dflt && data && data.length > 0){
        const keys = Object.keys(data[0])
        console.log('keys', keys)
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
    maxWidth: 120,
    editable: true,
    background: {visible: false},
  }))

  useEffect(()=>{
    if(!data){
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

        setChartOptions({
          data: rowData,
          // Series: Defines which chart type and data to use
          series: [{ type: 'bar', xKey: 'mission', yKey: 'price', direction: "horizontal", fill: '#BA0B31'}],
          // Background we will use Lychee BASS component instead of AGcharts
          background: {
            fill: "aliceblue",
          },
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
              }
            ]
        })
    }
  }, [])

  return (
    <StateContext.Provider value={{working, setWorking, aiOpen, setAiOpen, chartOptions, setChartOptions, dflt, setDflt, xKey, setXKey, yKey, setYKey, type, setType, data, setData, fmtCols, setFmtCols, xOptions, setXOptions, yOptions, setYOptions, chartTypes, directions, direction, setDirection, colDefs, rowData, defaultColDef}}>
      {children}
    </StateContext.Provider>
  );
};
