import React, { useEffect, useState } from 'react';

const Roadmap = () => {
    const [roadmapData, setRoadmapData] = useState([]);

    useEffect(() => {
        const featuresUrl = process.env.NODE_ENV === 'development' 
                      ? 'http://localhost:3000/api/features/' 
                      : 'https://www.lych3e.com/api/features/';

        fetch(featuresUrl)
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