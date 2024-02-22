'use Client';

import React, { useEffect, useState } from 'react';


const Roadmap = () => {
    const [roadmapData, setRoadmapData] = useState();

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch('api/features');
                const data = await response.json();
                setRoadmapData(data.data);
            } catch (error) {
                console.error(error);
            }
        }
        fetchData();
    }, []);

    return (
        <div>
            {roadmapData && roadmapData.map(data => (
                <div key={data._id}>
                    <h2>{data.title}</h2>
                    <p>{data.description}</p>
                    <p>Votes: {data.votes}</p>
                </div>
            ))}
        </div>
    );
};

export default Roadmap;