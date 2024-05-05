import { useState, useEffect } from "react";

import { GalleryCard } from "./galleryCard"

import { prepareChartData } from './prepareChartData'


export function ChartGallery() {
    const [charts, setChart] = useState(null);

    useEffect(() => {
        prepareChartData().then(setChart); // Fetch and set chart data when component mounts
    }, []);

    if (!charts) {
        return <div>Loading...</div>; // Render a loading state or similar
    }

    return (
        <div className="grid grid-cols-3 gap-4 p-20">
            {charts.map((chart, idx) => (
                <GalleryCard key={idx} title={chart.title} description={chart.description} data ={chart.data} footnote={chart.footnote} series={chart.series} axes={chart.axes} theme={chart.theme}/>
            ))}
        </div>
    )
}
