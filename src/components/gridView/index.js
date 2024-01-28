import { useEffect, useState, useMemo } from 'react';

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme

const GridView = ({data, fmtCols}) => {
    // we expect the following columns to be present
    const [colDefs, setColDefs] = useState();
    
    const placeholder = [
        {field: 'athlete'},
        {field: 'age'},
        {field: 'country', /*cellRenderer: */},
        {field: 'year'},
        {field: 'date'},
        {field: 'sport'},
        {field: 'gold'},
        {field: 'silver'},
        {field: 'bronze'},
        {field: 'total'},
        {field: 'price', 
        // Return a formatted string for this column
        valueFormatter: params => { return '$' + params.value.toLocaleString(); }},
    ]
    
    const [rowData, setRowData] = useState()

    const placeHolderData = [
        {
            "athlete": "Gong Jinjie",
            "age": 25,
            "country": "China",
            "year": 2012,
            "date": 39789,
            "sport": "Cycling",
            "gold": 0,
            "silver": 1,
            "bronze": 0,
            "total": 1,
            "price": 99
        },
        {
            "athlete": "Olga Kaniskina",
            "age": 27,
            "country": "Russia",
            "year": 2012,
            "date": 39789,
            "sport": "Athletics",
            "gold": 0,
            "silver": 1,
            "bronze": 0,
            "total": 1,
            "price": 99
        },
        {
            "athlete": "Vavrinec Hradílek",
            "age": 25,
            "country": "Czech Republic",
            "year": 2012,
            "date": 39789,
            "sport": "Canoeing",
            "gold": 0,
            "silver": 1,
            "bronze": 0,
            "total": 1,
            "price": 99
        },
        {
            "athlete": "Jakov Fak",
            "age": 22,
            "country": "Croatia",
            "year": 2010,
            "date": "28/02/2010",
            "sport": "Biathlon",
            "gold": 0,
            "silver": 0,
            "bronze": 1,
            "total": 1,
            "price": 99
        },
        {
            "athlete": "Jesse Sergent",
            "age": 24,
            "country": "New Zealand",
            "year": 2012,
            "date": 39789,
            "sport": "Cycling",
            "gold": 0,
            "silver": 0,
            "bronze": 1,
            "total": 1,
            "price": 99
        },
        {
            "athlete": "Jeong Seong-Ryong",
            "age": 27,
            "country": "South Korea",
            "year": 2012,
            "date": 39789,
            "sport": "Football",
            "gold": 0,
            "silver": 0,
            "bronze": 1,
            "total": 1,
            "price": 99
        },
        {
            "athlete": "Fredrik Lööf",
            "age": 42,
            "country": "Sweden",
            "year": 2012,
            "date": 39789,
            "sport": "Sailing",
            "gold": 1,
            "silver": 0,
            "bronze": 0,
            "total": 1,
            "price": 99
        },
        {
            "athlete": "Jo In-Cheol",
            "age": 24,
            "country": "South Korea",
            "year": 2000,
            "date": 35073,
            "sport": "Judo",
            "gold": 0,
            "silver": 1,
            "bronze": 0,
            "total": 1,
            "price": 99
        },
        {
            "athlete": "William Lockwood",
            "age": 24,
            "country": "Australia",
            "year": 2012,
            "date": 39789,
            "sport": "Rowing",
            "gold": 0,
            "silver": 1,
            "bronze": 0,
            "total": 1,
            "price": 99
        }
    ]

    //Apply settings across all columns
    const defaultColDef = useMemo(() => ({
        filter: true, // Enable filtering on all columns
        maxWidth: 120,
        editable: true,
    }))

    useEffect(() => {
        data && setRowData(data)
        fmtCols && setColDefs(fmtCols)
    }, [data, fmtCols])




    return (
        <div className="ag-theme-quartz px-20 py-20" style={{ height: '90%', width: '90%' }}>
            <AgGridReact 
                defaultColDef={defaultColDef} 
                rowData={rowData} 
                columnDefs={colDefs} 
                pagination={true}
                onCellValueChanged={event => console.log(`New Cell Value: ${event.value}`)}
                enableRangeSelection={true}
                />
        </div>
    )



}

export default GridView;