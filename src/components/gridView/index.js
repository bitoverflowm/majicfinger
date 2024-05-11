import { useMyState  } from '@/context/stateContext'

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme

import { Button } from "@/components/ui/button"

import { PlusIcon } from "@radix-ui/react-icons"
import { toast } from "@/components/ui/use-toast";

const GridView = ({sample = false}) => {

    const contextState = useMyState()
    
    // we expect the following columns to be present
    let colDefs = contextState?.colDefs || [];
    let rowData = contextState?.rowData || [];
    let defaultColDef = contextState?.defaultColDef || {};
    const setData = contextState?.setData;
    const data = contextState?.data;

    const updateCellData = (rowIndex, field, newValue) => {
        console.log('updating: ', rowIndex, field, newValue)
        setData(prevData => {
          // Create a new array with updated data
          const newData = prevData.map((item, index) => {
            if (index === rowIndex) {
              return { ...item, [field]: newValue }; // Update the specific field value
            }
            return item;
          });
          return newData;
        });
      };

      const handleAddRow = () => {
        let newRow = {}
        colDefs.forEach(colName => {
            newRow[colName] = ""; // Initialize each property to an empty string or any default value
        });
        setData([...data, newRow])
        toast({
            description: `New Row added!`,
        });
        
      }

    return (
        <div className="ag-theme-quartz sm:px-20 py-10" style={{ height: '90%', width: '90%' }}>
            <div className=' w-full py-2 flex justify-end' onClick={()=>handleAddRow()}>
                <Button variant="outline" size="icon">
                    <PlusIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <span className="sr-only">Add New Row</span>
                </Button>           
            </div>
            <AgGridReact 
                defaultColDef={defaultColDef} 
                rowData={sample  ? rowData.slice(0,3) : rowData} 
                columnDefs={colDefs} 
                pagination={true}
                onCellValueChanged={(event) => {
                    const rowIndex = event.rowIndex;
                    const field = event.colDef.field;
                    const newValue = event.newValue;
                    updateCellData(rowIndex, field, newValue);
                  }}
                //enableRangeSelection={true}

                />
        </div>
    )



}

export default GridView;