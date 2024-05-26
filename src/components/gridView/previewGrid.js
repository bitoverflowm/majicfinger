import { useMyStateV2  } from '@/context/stateContextV2'

import { useMemo }  from 'react'

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme


const PreviewGrid = ({h, w}) => {

    const contextStateV2 = useMyStateV2()
    
    // we expect the following columns to be present
    let connectedCols = contextStateV2?.connectedCols || [];
    let connectedData = contextStateV2?.connectedData || [];

    //Apply settings across all columns
    const defaultColDef = useMemo(() => ({
        filter: false, // Enable filtering on all columns
        //maxWidth: 120,
        editable: false,
        background: {visible: false},
        resizable: true,
        singleClickEdit: false,
    }))

    return (
        <div className={`ag-theme-quartz px-4 ${h ? h: 'h-[300px]'} ${ w ? w: 'w-[800px]'}`}>
            <AgGridReact 
                defaultColDef = {defaultColDef}
                rowData={connectedData.slice(0,4)} 
                columnDefs={connectedCols} 
                pagination={true}
                //enableRangeSelection={true}
                />
        </div>
    )



}

export default PreviewGrid;