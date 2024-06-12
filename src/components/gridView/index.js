import { useEffect, useMemo, useState } from 'react';

import { useMyStateV2  } from '@/context/stateContextV2'

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme


import { PlusIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"

import { Menu } from './menu'

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
import { Alert } from '@/components/ui/alert'
import { TrafficCone } from 'lucide-react';


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
        onCellClicked: (e) => toast(`Hit Enter to accept change`, {
            duration: 5000
        }),
    }))

    const updateCellData = (rowIndex, field, newValue) => {
        setConnectedData(prevData => {
          // Create a new array with updated data
          const newData = prevData.map((item, index) => {
            if (index === rowIndex) {
              return { ...item, [field]: newValue }; // Update the specific field value
            }
            return item;
          });
          return newData;
        })

        toast(`Data updated. Chart updated!`, {
            duration: 5000
        })
    };

    const handleAddRow = () => {
        let newRow = {}
        connectedCols.forEach(colName => {
            newRow[colName] = ""; // Initialize each property to an empty string or any default value
        });
        
        setConnectedData([...connectedData, newRow])

        toast(`New Row added!`, {
            duration: 5000
        })   
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

        toast(`New Column added!`, {
            duration: 5000
        })   
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
            <Alert className="mt-4 sm:hidden">
                <div className="flex gap-2 place-items-center"><TrafficCone className="w-8 h-8"/>
                    <div className="">
                        <p className="text-xs">Looks like you're on-the-go!</p>
                        <p className="text-xs text-muted-foreground">I tried to keep it mobile-friendly, but Lychee really flexes its muscles on bigger screens.</p>
                    </div>
                </div>
            </Alert>  
            <div className='pt-6 pb-2 flex place-items-center gap-2' >
                <div className=''>
                    <Menu />
                </div>
                <div className='ml-auto flex place-items-center gap-2'>
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
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                            handleSubmit(columnName);
                                            }
                                        }}
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