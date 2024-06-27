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
        <div className={`ag-theme-quartz text-xs px-4 ${h ? h: 'h-[300px]'} ${ w ? w: 'w-[300px] min-[300px]:w-[370px] min-[510px]:w-[400px] min-[520px]:w-[480px] sm:w-[500px] min-[800px]:w-[520px] lg:w-[600px] xl:w-[800px] 2xl:w-[900px]'}`}>
            <AgGridReact 
                defaultColDef={defaultColDef}
                rowData={connectedData.slice(0, Math.min(connectedData.length, 4))} 
                columnDefs={connectedCols} 
                pagination={false}
                //enableRangeSelection={true}
                />
        </div>
    )



}

export default PreviewGrid;