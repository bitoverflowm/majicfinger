import { useEffect, useMemo, useState } from 'react';

import { useMyStateV2  } from '@/context/stateContextV2'

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme


import { PlusIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const GridView = ({startNew}) => {

    const contextStateV2 = useMyStateV2()

    // we expect the following columns to be present
    let connectedCols = contextStateV2?.connectedCols || []
    let setConnectedCols = contextStateV2?.setConnectedCols || []
    let connectedData = contextStateV2?.connectedData || []
    let setConnectedData = contextStateV2?.setConnectedData || []
    
    const [columnName, setColumnName] = useState('');
    const [colAddOpen, setColAddOpen] = useState()
    
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

    const handleAddColumn = (name) => {
        let newCols = [...connectedCols, { field: name }];
        setConnectedCols(newCols);
        //adding col to data as well
        if(connectedData.length > 0){
            setConnectedData(prevData => {
                // Create a new array with updated data
                const newData = prevData.map((item, index) => {
                    return { ...item, [name]: '' }; // Update the specific field value
                });
                return newData;
              });
        }else{
            setConnectedData(prevData => {
                return prevData.map(item => {
                  return { ...item, [name]: '' };
                }).concat([{ [name]: '' }]);
              });
        }
        setColAddOpen(false)
        toast({
            description: `New Column added!`,
        });        
    }

    const handleInputChange = (event) => {
        setColumnName(event.target.value);
      };
    
    const handleSubmit = () => {
        handleAddColumn(columnName);
        setColumnName(''); // Clear the input field
    };
    

    useEffect(()=>{
        startNew && setConnectedData([])
    }, [startNew])

    return (
        <div className="ag-theme-quartz" style={{ height: '100%', width: '100%' }}>           
            <div className='w-full py-2 flex justify-end place-items-center gap-2' >
                <Dialog open={colAddOpen} onOpenChange={setColAddOpen}>
                    <Label className="text-black text-xs">Add Column</Label>
                    <DialogTrigger asChild>    
                        <Button variant="outline" size="icon">
                            <PlusIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add Column</DialogTitle>
                            <DialogDescription>
                                Name your column
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Name
                                </Label>
                                <Input
                                    id="name"
                                    defaultValue="Placeholder"
                                    value={columnName}
                                    onChange={handleInputChange}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" onClick={()=>handleSubmit(columnName)}>Save changes</Button>
                        </DialogFooter>                        
                    </DialogContent>
                </Dialog>                
                
                <Label className="text-black text-xs">Add Row</Label>
                <Button variant="outline" size="icon" onClick={()=>handleAddRow()}>
                    <PlusIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
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

export default GridView;