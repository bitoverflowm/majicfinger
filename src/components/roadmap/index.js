'use Client';

import React, { useEffect, useState } from 'react';

import { useUser } from '@/lib/hooks';
import { useMyState  } from '@/context/stateContext'

const Roadmap = () => {

    const user = useUser();

    const{ working, setWorking } = useMyState()
    
    const [roadmapData, setRoadmapData] = useState();
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState([]);

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

    useEffect(() => {
        if (!roadmapData || roadmapData.length === 0) {
            setLoading(true);
        } else {
            setLoading(false);
        }
    }, [roadmapData]);

    const backgroundColor = (val) => {
        switch (val) {
            case 'ai':
                return 'bg-lychee-black';
            case 'analysis':
                return 'bg-lychee-peach';
            case 'finance':
                return 'bg-lychee-green';
            case 'roadmap':
                return 'bg-blue-300';
            default:
                return 'bg-lychee-red';
        }
    }

    const handleFilterClick = (value) => {
        if(value === 'all') setFilter([])        
        else if (filter.includes(value)) {
            setFilter(filter.filter(item => item !== value));
        } else {
            setFilter([...filter, value]);
        }
    };

    return (
        <div>
            <div className='flex flex-wrap gap-1 place-content-center max-w-96 mx-auto bg-slate-100/10 rounded-xl shadow-2xl px-5 py-8 my-10 '>
                {['all', 'ai', 'analysis', 'stats', 'data processing', 'presentation', 'data creation', 'export', 'integration', 'mathematics', 'finance', 'schedules', 'roadmap', 'charts'].map((filterOption) => (
                    <div
                    key={filterOption}
                    onClick={() => handleFilterClick(filterOption)}
                    className={`px-2 py-1 border border-slate-400 rounded-xl text-xxs cursor-pointer ${
                        filter.includes(filterOption) ? 'bg-lychee-black text-lychee-white' : ''
                    } ${
                        filter.length === 0 && filterOption === 'all' ? 'bg-lychee-black text-lychee-white' : ''
                    }`}
                    >
                    {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                    </div>
                ))}
            </div>
            {loading ? <div className='flex gap-2'><svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24"></svg>Loading...</div>
                    :
                    <>
                        <div className='flex flex-wrap'>
                            <div className='w-full px-20 xl:w-1/3 xl:px-20'>
                                <div className='font-black underline'>Backlog Pending Votes</div>
                                {roadmapData && roadmapData.filter(data => data.status === 'polling votes' && (filter.length === 0 || data.tag.some(tag => filter.includes(tag)))).map(data => (
                                        <div className='p-6 bg-white shadow-xl my-3 rounded-xl' key={data._id}>
                                            <div className='text-xs'>{data.title}</div>
                                            <div className='flex flex-wrap text-xxs py-2 gap-1'>
                                            {data.tag && data.tag.map(tag => (
                                                <div className={`px-2 py-1 ${backgroundColor(tag)} text-white shadow-2xl rounded-lg`} key={tag}>{tag}</div>
                                            ))}
                                            </div>
                                            <div className='text-xxs py-2'>{data.description}</div>
                                            <div className='flex gap-1 text-xxs place-items-center place-content-end'>Votes <div className='bg-lychee-red text-lychee-white text-center text-xxs px-2 py-1 rounded-full'>{data.votes}</div></div>
                                            <div className='flex place-content-end'>
                                                {
                                                    user ?
                                                        <div>Up vote (coming soon)</div>
                                                        : <div className='text-xxs underline cursor-pointer' onClick={()=>setWorking('getLychee')}>Become lifetime member to vote</div>
                                                }
                                            </div>
                                        </div>
                                ))}
                            </div>
                            <div className='w-full px-20 xl:w-1/3 xl:px-20'>
                                <div className='font-black underline'>In Progress</div>
                                {roadmapData && roadmapData.filter(data => data.status === 'in progress' && (filter.length === 0 || data.tag.some(tag => filter.includes(tag)))).map(data => (
                                        <div className='p-6 bg-white shadow-xl my-3 rounded-xl' key={data._id}>
                                            <div className='text-xs'>{data.title}</div>
                                            <div className='flex flex-wrap text-xxs py-2 gap-1'>
                                            {data.tag && data.tag.map(tag => (
                                                <div className={`px-2 py-1 ${backgroundColor(tag)} text-white shadow-2xl rounded-lg`} key={tag}>{tag}</div>
                                            ))}
                                            </div>
                                            <div className='text-xxs py-2'>{data.description}</div>
                                            <div className='flex gap-1 text-xxs place-items-center place-content-end'>Votes <div className='bg-lychee-peach text-lychee-white text-center text-xxs px-2 py-1 rounded-full'>{data.votes}</div></div>
                                            <div className='flex place-content-end'>
                                                {
                                                    user ?
                                                        <div>Up vote (coming soon)</div>
                                                        : <div className='text-xxs underline cursor-pointer' onClick={()=>setWorking('getLychee')}>Become lifetime member to vote</div>
                                                }
                                            </div>
                                        </div>
                                ))}
                            </div>
                            <div className='w-full px-20 xl:w-1/3 xl:px-20'>
                                <div className='font-black underline'>Complete</div>
                                {roadmapData && roadmapData.filter(data => data.status === 'complete' && (filter.length === 0 || data.tag.some(tag => filter.includes(tag)))).map(data => (
                                        <div className='p-6 bg-white shadow-xl my-3 rounded-xl' key={data._id}>
                                            <div className='text-xs'>{data.title}</div>
                                            <div className='flex flex-wrap text-xxs py-2 gap-1'>
                                            {data.tag && data.tag.map(tag => (
                                                <div className={`px-2 py-1 ${backgroundColor(tag)} text-white shadow-2xl rounded-lg`} key={tag}>{tag}</div>
                                            ))}
                                            </div>
                                            <div className='text-xxs py-2'>{data.description}</div>
                                            <div className='flex gap-1 text-xxs place-items-center place-content-end'>Votes <div className='bg-lychee-peach text-lychee-white text-center text-xxs px-2 py-1 rounded-full'>{data.votes}</div></div>
                                            <div className='flex place-content-end'>
                                                {
                                                    user ?
                                                        <div>Up vote</div>
                                                        : <div className='text-xxs underline cursor-pointer' onClick={()=>setWorking('getLychee')}>Become lifetime member to vote</div>
                                                }
                                            </div>
                                        </div>
                                ))}
                            </div>
                        </div>
                    </>
            }
        </div>
    );
};

export default Roadmap;