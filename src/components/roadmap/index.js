import React, { useEffect, useState } from 'react';

const Roadmap = () => {
    const [roadmapData, setRoadmapData] = useState([]);

    useEffect(() => {
        fetch('api/features')
            .then(response => response.json())
            .then(data => setRoadmapData(data.data))
            .catch(error => console.error(error));
    }, []);

    return (
        <div>
            {roadmapData && roadmapData.map(data => (
                <div key={data.id}>
                    <h2>{data.title}</h2>
                    <p>{data.description}</p>
                    <p>Votes: {data.votes}</p>
                </div>
            ))}
        </div>
    );
};

export default Roadmap;