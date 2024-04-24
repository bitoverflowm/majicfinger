"use client"

import { useMyState  } from '@/context/stateContext'

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme
import { useEffect } from 'react';

const BentoView = () => {

    const contextState = useMyState()
    
    // we expect the following columns to be present
    let colDefs = contextState?.colDefs || [];
    let rowData = contextState?.rowData || [];
    let defaultColDef = contextState?.defaultColDef || {};

    useEffect(() => {
        return null
    }, [colDefs, defaultColDef, rowData]);

    return (
        <div className="flex flex-wrap justify-center gap-4 p-4">
            {rowData && rowData.map((row, index) => (
                // Check if the primary_link property exists
                row.primary_link ? (
                    <Link key={index} href={row.primary_link} passHref>
                        <a className="card w-96 bg-base-100 shadow-xl">
                        <figure>
                            {/* Example placeholder image, replace src with your image logic */}
                            <img src="https://daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.jpg" alt={row.mission} />
                        </figure>
                        <div className="card-body">
                            <h2 className="card-title">{row.mission}</h2>
                            {/* Example content, modify as needed */}
                            <p>{row.company} launched on {row.date} from {row.location}</p>
                            <p>Rocket: {row.rocket}</p>
                            <p>Price: ${row.price.toLocaleString()}</p>
                            <p>Was successful? {row.successful ? 'Yes' : 'No'}</p>
                            <div className="card-actions justify-end">
                                <button className="btn btn-primary">More Details</button>
                            </div>
                        </div>
                        </a>
                    </Link>
                ) :(
                    <div key={index} className="card w-96 bg-base-100 shadow-xl">
                        <figure>
                            {/* Example placeholder image, replace src with your image logic */}
                            <img src="https://daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.jpg" alt={row.mission} />
                        </figure>
                        <div className="card-body">
                            <h2 className="card-title">{row.mission}</h2>
                            {/* Example content, modify as needed */}
                            <p>{row.company} launched on {row.date} from {row.location}</p>
                            <p>Rocket: {row.rocket}</p>
                            <p>Price: ${row.price.toLocaleString()}</p>
                            <p>Was successful? {row.successful ? 'Yes' : 'No'}</p>
                            <div className="card-actions justify-end">
                                <button className="btn btn-primary">More Details</button>
                            </div>
                        </div>
                    </div>
                )
            ))}
        </div>
    );



}

export default BentoView;