import { useMemo } from 'react';

import { useMyStateV2  } from '@/context/stateContextV2'

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme

import { Button } from "@/components/ui/button"

import { PlusIcon } from "@radix-ui/react-icons"
import { toast } from "@/components/ui/use-toast";

const GridViewV2 = () => {

    const contextStateV2 = useMyStateV2()

    // we expect the following columns to be present
    let connectedCols = contextStateV2?.connectedCols || [];
    let connectedData = contextStateV2?.connectedData || [];
    let setConnectedData = contextStateV2?.setConnectedData || [];
    
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

    const autoSizeStrategy = {
        type: 'fitGridWidth',
        defaultMinWidth: 100,
    };

    const gridOptions = useMemo(()=> ({
        onCellClicked: (e) => toast({description: 'Hit Enter to accept change'}),
    }))

    const updateCellData = (rowIndex, field, newValue) => {
        console.log('updating: ', rowIndex, field, newValue)
        setConnectedData(prevData => {
          // Create a new array with updated data
          const newData = prevData.map((item, index) => {
            if (index === rowIndex) {
              return { ...item, [field]: newValue }; // Update the specific field value
            }
            return item;
          });
          return newData;
        });
        toast({
            description: `Data updated. Also reflected in Chart!`,
        });  
    };

    const handleAddRow = () => {
        let newRow = {}
        connectedCols.forEach(colName => {
            newRow[colName] = ""; // Initialize each property to an empty string or any default value
        });
        setConnectedData([...connectedData, newRow])
        toast({
            description: `New Row added!`,
        });        
    }

    return (
        <div className="ag-theme-quartz" style={{ height: '100%', width: '100%' }}>
            <div className='w-full py-2 flex justify-end' onClick={()=>handleAddRow()}>
                <Button variant="outline" size="icon">
                    <PlusIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <span className="sr-only">Add New Row</span>
                </Button>           
            </div>
            <div className='h-[900px]'>
                <AgGridReact 
                    defaultColDef={defaultColDef} 
                    rowData={connectedData} 
                    columnDefs={connectedCols} 
                    pagination={true}
                    onCellValueChanged={(event) => {
                        const rowIndex = event.rowIndex;
                        const field = event.colDef.field;
                        const newValue = event.newValue;
                        updateCellData(rowIndex, field, newValue);
                    }}
                    gridOptions={gridOptions}
                    autoSizeStrategy={autoSizeStrategy}
                    //enableRangeSelection={true}

                    />

            </div>
        </div>
    )



}

export default GridViewV2;