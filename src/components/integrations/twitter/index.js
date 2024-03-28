import React, { useEffect } from 'react';
import { useState } from 'react';
import { Transition } from '@headlessui/react';
import { useShepherdTour } from "react-shepherd";
import "shepherd.js/dist/css/shepherd.css";
import Script from 'next/script';

import steps from './tourSteps';

import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { HiOutlinePencilSquare } from "react-icons/hi2"
import { BiDownArrow, BiUpArrow } from "react-icons/bi";

import { useUser } from '@/lib/hooks';

import GridView from '../../gridView';

import ParamToggles from './paramToggles';
import { params } from './params';

const tourOptions = {
    defaultStepOptions: {
        scrollTo: true,
        cancelIcon: {
            enabled: true,
        },
    },
    useModalOverlay: true,
  };


const TwitterIntegration = ({ setData, setDflt, connecting}) => {
    const user = useUser();
    const tour = useShepherdTour({ tourOptions, steps: steps });
    
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);

    const [handle, setHandle] = useState('misterrpink1');
    const [editingHandle, setEditingHandle] = useState(false);
    const [originalVal, setOriginalVal] = useState('');

    //User search by handle and get ID
    const [userSearchOpen, setUserSearchOpen] = useState(true);
    const [userHandleId, setUserHandleId] = useState();
    
    //User likes by user Id
    const [userLikesOpen, setUserLikesOpen] = useState(false);
    
    const [expansions, setExpansions] = useState([]);
    const [userFields, setUserFields] = useState([]);
    const [tweetFields, setTweetFields] = useState([]);

    const detailOpenHandler = (section) => {
        setExpansions([]);
        setUserFields([]);
        setTweetFields([]);
        if(section === 'userSearch'){
            setUserSearchOpen(!userSearchOpen);
            userLikesOpen && setUserLikesOpen(!userLikesOpen);
        } else if(section === 'userLikes'){
            setUserLikesOpen(!userLikesOpen);
            userSearchOpen && setUserSearchOpen(!userSearchOpen);
        }
    }

    const cancelHandler = (origin) => {
        if(origin === 'handle'){
            setHandle(originalVal)
            setEditingHandle(false)
            setOriginalVal('')
        } /*else if(origin === 'subTitle'){
            setSubTitle(originalVal)
            setEditingSubTitle(false)
            setOriginalVal('')
        }*/
        
    }

    const editHandler = (origin) => {
        if(origin === 'handle'){
            setOriginalVal(handle)
            setEditingHandle(true)                   
        }/*else if(origin === 'subTitle'){
            setOriginalVal(subTitle)
            setEditingSubTitle(true)                   
        }*/
        
    }

    const toggleParams = (fieldType, value) => {
        if(fieldType === 'expansions'){
            if(expansions.includes(value)){
                setExpansions(expansions.filter(item => item !== value));
            } else {
                setExpansions([...expansions, value]);
            }
        } else if(fieldType === 'userFields'){
            if(userFields.includes(value)){
                setUserFields(userFields.filter(item => item !== value));
            } else {
                setUserFields([...userFields, value]);
            }
        } else if(fieldType === 'tweetFields'){
            if(tweetFields.includes(value)){
                setTweetFields(tweetFields.filter(item => item !== value));
            } else {
                setTweetFields([...tweetFields, value]);
            }
        }
    }


    const fetchTwitterHandler = async (ask) => {
        setLoading(true);

        try {
            // Append the handle as a query parameter in the URL
            if(ask === 'fetchUserByHandle'){
                const url = new URL('/api/integrations/twitter/userhandle', window.location.origin);
                url.searchParams.append('handle', handle);
                let res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ expansions, userFields, tweetFields}),
                });

                if (res.status === 200) {
                    let twitterUserData = await res.json();
                    console.log(twitterUserData);
                    setConnected(true);
                    setData([twitterUserData.userData]);
                    setDflt(false);
                    setUserHandleId(twitterUserData.userData.id);
                    setUserSearchOpen(false);
                } else {
                    console.error("Twitter User Data pull failed");
                }
            }else if(ask === 'fetchUserLikesById'){
                const url = new URL('/api/integrations/twitter/likes', window.location.origin);
                url.searchParams.append('handleId', userHandleId);
                let res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ expansions, userFields, tweetFields}),
                });

                if (res.status === 200) {
                    let userLikesData = await res.json();
                    console.log(userLikesData);
                    setConnected(true);
                    setData(userLikesData.userData);
                    setDflt(false);
                    //setUserHandleId(twitterUserData.userData.data.id);
                    setUserSearchOpen(false);
                } else {
                    console.error("Twitter User Data pull failed");
                }
            }
            
            
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    }    

    useEffect(()=> {
        if(connecting && connecting === 'twitter' && !(user)){
            tour.start()
        }
    }, [connecting])

    return (
        <div className='w-3/5 mx-auto text-sm'>
            <Script type="module" src="shepherd.js/dist/shepherd.js" />
            <div className='w-full py-10'>
                {/* Username pull */}
                <div className='flex gap-10 place-items-center'>
                    <div className='w-96'>Enter a username to analyze</div>
                    <div className='border border-slate-100 w-96 rounded-md py-2'>
                        <div className="px-1 flex gap-2 w-full twitter-handle-input" onClick={()=>!editingHandle && editHandler('handle')}>
                            {
                            editingHandle ? 
                                <input type="text" autoFocus={true} value={handle} onChange={(e)=>setHandle(e.target.value)}/>
                                : <div className="">@{handle}</div>
                            }
                            {editingHandle &&
                                <div className="w-full flex gap-1 place-content-end">
                                    <div className="py-1 px-2 bg-lychee-green cursor-pointer hover:bg-lychee-black hover:text-white rounded-md" onClick={()=>setEditingHandle(false)}>Save</div>
                                    <div className="py-1 px-2 bg-slate-200 cursor-pointer hover:bg-lychee-black hover:text-white rounded-md" onClick={()=>cancelHandler('handle')}>Cancel</div>
                                    </div>}
                        </div>
                    </div>
                    <div className='flex w-full gap-4 place-content-end'>
                        <div className='flex place-items-center place-content-center gap-2 cursor-pointer' onClick={()=>detailOpenHandler('userSearch')}>
                            {
                                userSearchOpen
                                    ? <><div className='text-xs' >Collapse </div>
                                        <div className='hover:animate-bounce'><BiUpArrow /></div></>
                                    : <><div className='text-xs'>Advanced </div>
                                        <div className='hover:animate-bounce'><BiDownArrow /></div></>
                            }
                        </div>
                        <div className=''>
                            <div className='px-3 py-1 bg-black text-white cursor-pointer hover:bg-lychee-peach rounded-md' onClick={()=>fetchTwitterHandler('fetchUserByHandle')}>Connect</div>
                        </div>

                    </div>
                </div>
                <Transition 
                    show={userSearchOpen && true}
                    enter="transition-opacity duration-1000"
                    enterFrom="opacity-0 h-0"
                    enterTo="opacity-100 h-auto"
                    leave="transition-opacity duration-150"
                    leaveFrom="opacity-100 h-auto"
                    leaveTo="opacity-0"
                    className={'grid grid-cols-3 pt-8'}>
                        <div className=''>
                            <div className='font-bold text-slate-600 text-xs'>Get user's pinned tweet?</div>
                            <div className='flex flex-wrap pinned_tweet_tour'>
                                {params.user_by_handle.expansions.map((val) => (
                                    <ParamToggles key={val} field_type="expansions" val={val} toggle={() => toggleParams('expansions', val)} arr={expansions}/>
                                ))}
                            </div>
                            {/*<ParamToggles field_type='expansions' val='pinned_tweet_id' toggle={toggleParams} arr={expansions}/>*/}
                        </div>
                        <div className='pinned_tweet_details_tour'>
                            <div className='font-bold text-slate-600 text-xs'>Pinned Tweet Details</div>
                            {/* For tweetFields */}
                            <div className='flex flex-wrap'>
                                {params.user_by_handle.tweetFields.map((val) => (
                                    <ParamToggles key={val} field_type="tweetFields" val={val} toggle={() => toggleParams('tweetFields', val)} arr={tweetFields}/>
                                ))}
                            </div>
                        </div>
                        <div className='user_details_tour'>
                            {/* For userFields */}
                            <div className='font-bold text-slate-600 text-xs'>User Details</div>
                            <div className='flex flex-wrap'>
                                {params.user_by_handle.userFields.map((val) => (
                                    <ParamToggles key={val} field_type="userFields" val={val} toggle={() => toggleParams('userFields', val)} arr={userFields}/>
                                ))}
                            </div>
                        </div>
                </Transition>
                
                {/* Get likes by user */}
                <div className='flex gap-10 place-items-center'>
                    <div className='w-96'>Get Likes By @{userHandleId && handle}</div>
                    <div className='flex w-full gap-4 place-content-end'>
                        <div className='flex place-items-center place-content-center gap-2 cursor-pointer' onClick={()=>detailOpenHandler('userLikes')}>
                            {
                                userLikesOpen
                                    ? <><div className='text-xs' >Collapse </div>
                                        <div className='hover:animate-bounce'><BiUpArrow /></div></>
                                    : <><div className='text-xs'>Advanced </div>
                                        <div className='hover:animate-bounce'><BiDownArrow /></div></>
                            }
                        </div>
                        <div className=''>
                            {
                                userHandleId ?
                                    <div className={`px-3 py-1 bg-black text-white cursor-pointer hover:bg-lychee-peach rounded-md `} disabled onClick={()=>fetchTwitterHandler('fetchUserLikesById')}>Connect</div>
                                    : <div>Connect username before using this feature</div>
                            }
                            
                        </div>
                    </div>
                </div>
                <Transition 
                    show={userLikesOpen && true}
                    enter="transition-opacity duration-1000"
                    enterFrom="opacity-0 h-0"
                    enterTo="opacity-100 h-auto"
                    leave="transition-opacity duration-150"
                    leaveFrom="opacity-100 h-auto"
                    leaveTo="opacity-0"
                    className={'grid grid-cols-3 pt-8'}>
                        <div className=''>
                            <div className='font-bold text-slate-600 text-xs'>Get general info</div>
                            <div className='flex flex-wrap'>
                                {params.likes_by_user.expansions.map((val) => (
                                    <ParamToggles key={val} field_type="expansions" val={val} toggle={() => toggleParams('expansions', val)} arr={expansions}/>
                                ))}
                            </div>
                            {/*<ParamToggles field_type='expansions' val='pinned_tweet_id' toggle={toggleParams} arr={expansions}/>*/}
                        </div>
                        <div className=''>
                            <div className='font-bold text-slate-600 text-xs'>Liked Tweet Details</div>
                            {/* For tweetFields */}
                            <div className='flex flex-wrap'>
                                {params.likes_by_user.tweetFields.map((val) => (
                                    <ParamToggles key={val} field_type="tweetFields" val={val} toggle={() => toggleParams('tweetFields', val)} arr={tweetFields}/>
                                ))}
                            </div>
                        </div>
                        <div>
                            {/* For userFields */}
                            <div className='font-bold text-slate-600 text-xs'>General User Details</div>
                            <div className='flex flex-wrap'>
                                {params.likes_by_user.userFields.map((val) => (
                                    <ParamToggles key={val} field_type="userFields" val={val} toggle={() => toggleParams('userFields', val)} arr={userFields}/>
                                ))}
                            </div>
                        </div>
                </Transition>
                <div>
                    <div></div>
                    <div>Get Followers of User</div>
                    <div>Get who User Follows</div>
                    <div>User's Lists</div>
                </div>
                
            </div>
            {loading &&
                <div className='flex place-items-center animate-pulse gap-2'>
                    <AiOutlineLoading3Quarters className='animate-spin'/>
                        Loading...
                </div>
            }
            {
                connected && <div>
                                <div>Twitter request successful!</div>
                                <div>Go to Table or Chart to view the full data set</div>
                                <div>Here is a preview:</div>
                                <div className='h-96 w-full'>
                                    <GridView sample={true}/>
                                </div>
                            </div>
            }                        
        </div>
    );
};

export default TwitterIntegration;