import { useMyState  } from '@/context/stateContext'

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme

const GridView = () => {

    const contextState = useMyState()
    
    // we expect the following columns to be present
    let colDefs = contextState?.colDefs || [];
    let rowData = contextState?.rowData || [];
    let defaultColDef = contextState?.defaultColDef || {};

    return (
        <div className="ag-theme-quartz sm:px-20 py-10" style={{ height: '90%', width: '90%' }}>
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