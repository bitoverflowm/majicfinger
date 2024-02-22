import React, { useEffect, useState } from 'react';

const Roadmap = () => {
    useEffect(async () => {
        try {
            const response = await fetch('api/features');
            const data = await response.json();
            setRoadmapData(data.data);
        } catch (error) {
            console.error(error);
        }
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