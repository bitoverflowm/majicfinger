import React, { useEffect } from 'react';
import Image from 'next/image';
import { useState } from 'react';
import { Transition } from '@headlessui/react';
import { useShepherdTour } from "react-shepherd";
import "shepherd.js/dist/css/shepherd.css";
import Script from 'next/script';

import steps from './tourSteps';

import { AiOutlineLoading3Quarters, AiOutlineArrowLeft } from "react-icons/ai";
import { BiDownArrow, BiUpArrow } from "react-icons/bi";
import { IoSearch } from "react-icons/io5";
import { IoIosAddCircleOutline } from "react-icons/io";



import { useUser } from '@/lib/hooks';

import GridView from '../../gridView';

import ParamToggles from './paramToggles';
import { params } from './params';
import twitterDemoData from './twitterDemoData';

const tourOptions = {
    defaultStepOptions: {
        scrollTo: true,
        cancelIcon: {
            enabled: true,
        },
    },
    useModalOverlay: true,
  };


const TwitterIntegration = ({ setData, setDflt, connecting, stepName, setStepName, setHelperOpen}) => {
    const user = useUser();
    const tour = useShepherdTour({ tourOptions, steps: steps });
    
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);

    const [handle, setHandle] = useState('elonmusk');
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
    const [listFields, setListFields] = useState([]);

    const detailOpenHandler = (section) => {
        setExpansions([])
        setUserFields([])
        setTweetFields([])
        setListFields([])
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
        } else if(fieldType === 'list.fields'){
            if(listFields.includes(value)){
                setListFields(listFields.filter(item => item !== value));
            } else {
                setListFields([...listFields, value]);
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
                    setStepName('userSearch1');
                    setExpansions([])
                    setUserFields([])
                    setTweetFields([])
                    setListFields([])
                } else {
                    console.error("Twitter User Data pull failed");
                }
            }else{
                const url = new URL(`/api/integrations/twitter/${ask}`, window.location.origin);
                url.searchParams.append('handleId', userHandleId);
                let thirdParam = tweetFields ? tweetFields : listFields
                let res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ expansions, userFields, thirdParam }),
                });

                if (res.status === 200) {
                    let userLikesData = await res.json();
                    console.log(userLikesData);
                    setConnected(true);
                    setData(userLikesData.userData);
                    setDflt(false);
                    //setUserHandleId(twitterUserData.userData.data.id);
                    setUserSearchOpen(false);
                    setExpansions([])
                    setUserFields([])
                    setTweetFields([])
                    setListFields([])
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

    
    // staging data - this is twitter data being pulled before user submits for charting.
    const [stagingData, setStagingData] = useState(twitterDemoData.elonmusk);
    const [paramsOpen, setParamsOpen] = useState(false)

    const queryHandler = (q) => {
        setParamsOpen(true)
        setStepName(q)
        setHelperOpen(true)
    }


    
    {/*<Script type="module" src="shepherd.js/dist/shepherd.js" /> */}

    return (
        <div className='flex w-full p-10 h-full'>
            <div className='bg-white shadow-xl basis-3/12 px-2 h-fit'>
                <div className='dropdown w-full text-sm'>
                    <div className='flex text-black place-items-center' tabIndex={0} role="button"> 
                        <div className='rounded-full bg-slate-200 w-[25px] h-[25px] mx-1' > 
                            {stagingData 
                                ? <Image src={stagingData.userData.profile_image_url} width={25} height={25} className='rounded-full'/>
                                : <AiOutlineLoading3Quarters className='animate-spin'/>}
                        </div>
                        <div className='mr-2 ml-1 font-bold'>
                            {stagingData
                                ? stagingData.userData.name
                                : <AiOutlineLoading3Quarters className='animate-spin'/>}
                        </div>
                        <div className='text-black flex-grow mr-4'>
                            {handle ? '@'+handle : <AiOutlineLoading3Quarters className='animate-spin'/>}
                        </div>
                        <div className='pr-2'>
                            <IoSearch />                        
                        </div>
                    </div>
                    <div tabIndex={0} className="dropdown-content z-[1] card card-compact w-64 p-2 shadow bg-primary text-primary-content">
                        <div className="card-body">
                        <h3 className="card-title">Card title!</h3>
                        <p>you can use any element as a dropdown.</p>
                        </div>
                    </div>

                </div>
                <div className='pt-3'>
                    <div className='px-2 cursor-pointer text-slate-600 text-xs font-thin'>Available actions</div>
                    <div className='px-2 cursor-pointer hover:bg-slate-100/30 text-sm mt-1 py-2 flex gap-2 place-items-center border-y' onClick={()=>queryHandler('user_pinned_tweet')}><div className='hover:animate-spin'><IoIosAddCircleOutline /></div> Get {handle}'s Pinned Tweet</div>
                    <div className='px-2 cursor-pointer hover:bg-slate-100/30 text-sm mt-1 py-2 flex gap-2 place-items-center' onClick={()=>queryHandler('user_likes_by_id')}><div className='hover:animate-spin'><IoIosAddCircleOutline /></div> Get tweets liked by {handle}</div>
                    <div className='px-2 cursor-pointer hover:bg-slate-100/30 text-sm mt-1 py-2 flex gap-2 place-items-center border-y' onClick={()=>queryHandler('user_followers_by_id')}><div className='hover:animate-spin'><IoIosAddCircleOutline /></div> Get {handle}'s followers</div>
                    <div className='px-2 cursor-pointer hover:bg-slate-100/30 text-sm mt-1 py-2 flex gap-2 place-items-center' onClick={()=>queryHandler('user_follows_by_id')}><div className='hover:animate-spin'><IoIosAddCircleOutline /></div> Get user's followed by {handle}</div>
                    <div className='px-2 cursor-pointer hover:bg-slate-100/30 text-sm mt-1 py-2 flex gap-2 place-items-center border-y' onClick={()=>queryHandler('user_owned_lists_by_id')}><div className='hover:animate-spin'><IoIosAddCircleOutline /></div> Get lists owned by {handle}</div>
                </div>
                <div className='pt-3'>
                    <div className='text-slate-600 text-xs font-thin border-b'>Inspiration</div>
                    <div className='px-2 cursor-pointer hover:bg-soft/40 text-sm py-2 flex gap-2 place-items-center border-b'><div className='hover:animate-spin'><IoIosAddCircleOutline /></div> What are your competitor's most popular tweets?</div>
                    <div className='px-2 cursor-pointer hover:bg-soft/40 text-sm py-2 flex gap-2 place-items-center border-b'><div className='hover:animate-spin'><IoIosAddCircleOutline /></div> Who are your biggest fans?</div>
                    <div className='px-2 cursor-pointer hover:bg-soft/40 text-sm py-2 flex gap-2 place-items-center border-b'><div className='hover:animate-spin'><IoIosAddCircleOutline /></div> Who are your competitor's biggest followers?</div>
                    <div className='px-2 cursor-pointer hover:bg-soft/40 text-sm py-2 flex gap-2 place-items-center border-b'><div className='hover:animate-spin'><IoIosAddCircleOutline /></div> Make a list and start a contest?</div>
                </div>                
            </div>
            <Transition
                show={!(stepName) === false && paramsOpen}
                enter="transition-opacity duration-1000"
                enterFrom="opacity-0 basis-0/12"
                enterTo="opacity-100 basis-3/12"
                leave="transition-opacity duration-150"
                leaveFrom="opacity-100 basis-3/12"
                leaveTo="opacity-0 basis-0/12"
                className={'ml-2 bg-white shadow-lg basis-3/12 px-4 h-fit pb-4'}>
                    <div className='flex cursor-pointer hover:text-lychee-red text-xs ' onClick={()=>setParamsOpen(false)}> <AiOutlineArrowLeft /> Close </div>
                    <div className='pt-2'>
                        <div className='text-sm font-bold text-slate-500'>Select the data points you want to examine</div>
                        <div className='text-xs pt-1'>These will be your "columns"</div>
                    </div>
                    {
                        stepName && params[stepName].expansions &&
                            <>
                                <div className='font-bold text-slate-600 text-xs'></div>
                                <div className='flex flex-wrap pinned_tweet_tour'>
                                    {params.user_by_handle.expansions.map((val) => (
                                        <ParamToggles key={val} field_type="expansions" val={val} toggle={() => toggleParams('expansions', val)} arr={expansions}/>
                                    ))}
                                </div>
                            </>
                    }
                    {
                        stepName && params[stepName].tweetFields &&
                            <div className=''>
                                <div className='font-bold text-slate-600 text-xs'>Tweet Details</div>
                                {/* For tweetFields */}
                                <div className='flex flex-wrap'>
                                    {params[stepName].tweetFields.map((val) => (
                                        <ParamToggles key={val} field_type="tweetFields" val={val} toggle={() => toggleParams('tweetFields', val)} arr={tweetFields}/>
                                    ))}
                                </div>
                            </div>
                    }
                    {
                        stepName && params[stepName].userFields &&
                            <div className=''>
                                <div className='font-bold text-slate-600 text-xs'>User Details</div>
                                {/* For tweetFields */}
                                <div className='flex flex-wrap'>
                                    {params[stepName].userFields.map((val) => (
                                        <ParamToggles key={val} field_type="userFields" val={val} toggle={() => toggleParams('userFields', val)} arr={userFields}/>
                                    ))}
                                </div>
                            </div>
                    }
                    {
                        stepName && params[stepName]['list.fields'] &&
                            <div className=''>
                                <div className='font-bold text-slate-600 text-xs'>List Details</div>
                                {/* For tweetFields */}
                                <div className='flex flex-wrap'>
                                    {params[stepName]['list.fields'].map((val) => (
                                        <ParamToggles key={val} field_type="listFields" val={val} toggle={() => toggleParams('listFields', val)} arr={listFields}/>
                                    ))}
                                </div>
                            </div>
                    }
                    <div className='flex place-content-end gap-4 text-xs'>
                        <div className='px-3 py-1 bg-white text-lychee-red border border-lychee-red cursor-pointer hover:bg-lychee-red hover:text-white rounded-md' onClick={()=>clearHandler()}>Clear</div>
                        <div className='shadow-sm px-3 py-1 bg-lychee-go text-lychee-black border border-lychee-go cursor-pointer hover:bg-lychee-green hover:text-white hover:border-lychee-green rounded-md hover:shadow-lychee-green hover:shadow-2xl' onClick={()=>fetchTwitterHandler(stepName)}>Connect</div>
                    </div>
            </Transition>



            {
                connected && <div className='w-5/6'>
                                <div className='font-black text-slate-600'>Your data preview...</div>
                                <div className='h-96 w-[1800px] -ml-16'>
                                    <GridView sample={true}/>
                                </div>
                                <div className='px-10 -mt-10 text-sm pb-10'>
                                    <div className='font-bold text-slate-800'>What's Next?</div>
                                    <div>Go to Table to view your data set</div>
                                    <div>Go to Chart to visualize your data</div>
                                    <div>Or you can... </div>
                                </div>
                            </div>
            }
            {
                stepName === 'twitterStart' &&
                    <div className='flex gap-4 py-20'>
                        <div>
                            <div className='max-w-64 mx-auto bg-lychee-blue/60 p-2 px-3 rounded-md hover:bg-black hover:text-white cursor-pointer' onClick={()=>setStepName('userSearch')}>Username</div>
                            <div className='px-10 py-4'>
                                <div className='font-black text-slate-600'>get userdata:</div>
                                <div className='px-2'>
                                    <div>followers and follwing</div>
                                    <div>pinned tweet</div>
                                    <div>engagement stats</div>
                                    <div>liked tweets</div>
                                    <div>tweets</div>
                                    <div>tweet stats</div>
                                    <div>Lists and lists stats</div>
                                    <div>follwer and follower data</div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className='max-w-64 mx-auto bg-lychee-black text-white p-2 px-3 rounded-md hover:bg-lychee-blue/60 hover:text-black cursor-pointer' onClick={()=>setStepName('tweetSearch')}>Tweets</div>
                            <div className='px-10 py-4'>
                                <div className='font-black text-slate-600'>get general tweetdata:</div>
                                <div className='px-2'>
                                    <div>get the most recent tweets</div>
                                    <div>query tweets by keywords</div>
                                    <div>engagement stats</div>
                                    <div>liked tweets</div>
                                    <div>tweet stats</div>
                                </div>
                            </div>
                        </div>
                    </div>
            }
            {
                stepName === 'userSearch' &&
                    <>
                    {/* Username pull */}
                    <div className='flex gap-10 place-items-center'>
                        <div className='font-black text-slate-600'>Enter a username</div>
                        <div className={`border w-96 rounded-md py-2 ${handle === '' ? 'border-lychee-red border-2' : 'border-slate-100 border-0'}`}>
                            <div className="px-1 flex gap-2 w-full twitter-handle-input" onClick={()=>!editingHandle && editHandler('handle')}>
                                {
                                editingHandle ? 
                                    <input type="text" autoFocus={true} value={handle} onChange={(e)=>setHandle(e.target.value)} style={{ outline: 'none' }}/>
                                    : <div className=''>@{handle}</div>
                                }
                                {editingHandle &&
                                    <div className="w-full flex gap-1 place-content-end">
                                        <div className="py-1 px-2 bg-lychee-green text-white cursor-pointer hover:bg-lychee-black hover:text-white rounded-md" onClick={()=>setEditingHandle(false)}>Save</div>
                                        <div className="py-1 px-2 bg-slate-200 cursor-pointer hover:bg-lychee-black hover:text-white rounded-md" onClick={()=>cancelHandler('handle')}>Cancel</div>
                                        </div>}
                            </div>
                        </div>
                    </div>
                    <Transition 
                        show={!(handle==='')}
                        enter="transition-opacity duration-1000"
                        enterFrom="opacity-0 h-0"
                        enterTo="opacity-100 h-auto"
                        leave="transition-opacity duration-150"
                        leaveFrom="opacity-100 h-auto"
                        leaveTo="opacity-0"
                        className={'pt-8'}>
                        <div className='flex gap-4'>
                            <div className='flex place-items-center place-content-center gap-2 cursor-pointer' onClick={()=>detailOpenHandler('userSearch')}>
                                {
                                    userSearchOpen
                                        ? <><div className='text-xs' >Collapse </div>
                                            <div className='hover:animate-bounce'><BiUpArrow /></div></>
                                        : <><div className='text-xs'>Data Options </div>
                                            <div className='hover:animate-bounce'><BiDownArrow /></div></>
                                }
                            </div>
                        </div>
                    </Transition>
                    <Transition 
                        show={!(handle==='') && userSearchOpen }
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
                    <Transition 
                        show={!(handle==='')}
                        enter="transition-opacity duration-1000"
                        enterFrom="opacity-0 h-0"
                        enterTo="opacity-100 h-auto"
                        leave="transition-opacity duration-150"
                        leaveFrom="opacity-100 h-auto"
                        leaveTo="opacity-0"
                        className={'pt-8'}>
                        <div className='flex place-content-center gap-4'>
                            <div className='px-3 py-1 bg-black text-white cursor-pointer hover:bg-lychee-peach rounded-md' onClick={()=>fetchTwitterHandler('fetchUserByHandle')}>Connect</div>
                        </div>
                    </Transition>
                    </>
            }
            {
                stepName === 'userSearch1' &&
                    <div className='gap-10 place-items-center'>
                        go deeper, and select one of the following options:
                        <div className='flex gap-2'>
                            <div className='bg-lychee-blue/70 hover:bg-black hover:text-white cursor-pointer px-3 py-1' onClick={()=>setStepName('userLikesById')}>Tweets Liked by @{userHandleId && handle}</div>
                            <div className='bg-lychee-blue/70 hover:bg-black hover:text-white cursor-pointer px-3 py-1' onClick={()=>setStepName('userFollowersById')}>Who follows @{userHandleId && handle}</div>
                            <div className='bg-lychee-blue/70 hover:bg-black hover:text-white cursor-pointer px-3 py-1' onClick={()=>setStepName('userFollowsById')}>Who does @{userHandleId && handle} follow</div>
                            <div className='bg-lychee-blue/70 hover:bg-black hover:text-white cursor-pointer px-3 py-1' onClick={()=>setStepName('userOwnedListsById')}>Lists owned by @{userHandleId && handle}</div>
                        </div>
                    </div>
            }
            <Transition 
                show={['userLikesById', 'userFollowersById', 'userFollowingById', 'userOwnedListsById'].includes(stepName)}
                enter="transition-opacity duration-1000"
                enterFrom="opacity-0 h-0"
                enterTo="opacity-100 h-auto"
                leave="transition-opacity duration-150"
                leaveFrom="opacity-100 h-auto"
                leaveTo="opacity-0"
                className={'px-56'}>                            
                {/* Get likes by user */}
                <div className='flex gap-10 place-items-center'>
                    <div className='w-96 font-bold text-slate-500 py-5'>Geting  
                        {stepName === 'userLikesById' && ' Tweets Liked By'} 
                        {stepName === 'userFollowersById' && ' Users Following'}
                        {stepName === 'userFollowingById' && ' Users Followed by'}
                        {stepName === 'userOwnedListsById' && ' Lists owned by'}
                            @{userHandleId && handle}</div>
                </div>

                <div className='flex'>
                    <div>
                        <div className='font-bold text-slate-600 text-xs'>Get general info</div>
                        <div className='flex flex-wrap'>
                            {params[stepName] && params[stepName].expansions.map((val) => (
                                <ParamToggles key={val} field_type="expansions" val={val} toggle={() => toggleParams('expansions', val)} arr={expansions}/>
                            ))}
                        </div>

                    </div>
                    {
                        params[stepName] && params[stepName].tweetFields &&
                        <div className=''>
                            <div className='font-bold text-slate-600 text-xs'>Liked Tweet Details</div>
                            {/* For tweetFields */}
                            <div className='flex flex-wrap'>
                                {params[stepName].tweetFields.map((val) => (
                                    <ParamToggles key={val} field_type="tweetFields" val={val} toggle={() => toggleParams('tweetFields', val)} arr={tweetFields}/>
                                ))}
                            </div>
                        </div>
                    }
                    {
                        params[stepName] && params[stepName].userFields &&
                            <div>
                                {/* For userFields */}
                                <div className='font-bold text-slate-600 text-xs'>General User Details</div>
                                <div className='flex flex-wrap'>
                                    {params[stepName].userFields.map((val) => (
                                        <ParamToggles key={val} field_type="userFields" val={val} toggle={() => toggleParams('userFields', val)} arr={userFields}/>
                                    ))}
                                </div>
                            </div>
                    }
                    {
                        params[stepName] && params[stepName]['list.fields'] &&
                            <div>
                                {/* For userFields */}
                                <div className='font-bold text-slate-600 text-xs'>List Details</div>
                                <div className='flex flex-wrap'>
                                    {params[stepName]['list.fields'].map((val) => (
                                        <ParamToggles key={val} field_type='list.fields' val={val} toggle={() => toggleParams('list.fields', val)} arr={userFields}/>
                                    ))}
                                </div>
                            </div>
                    }
                </div>
                
                
                <div className='flex mx-auto'>
                    {
                        userHandleId ?
                            <div className={`px-3 py-1 bg-black text-white cursor-pointer hover:bg-lychee-peach rounded-md `} disabled onClick={()=>fetchTwitterHandler(stepName)}>Connect</div>
                            : <div>Connect username before using this feature</div>
                    }
                    
                </div>
            </Transition>
            {loading &&
            <div className='flex place-items-center animate-pulse gap-2'>
                <AiOutlineLoading3Quarters className='animate-spin'/>
                    Loading...
            </div>
            }
                
        </div>
    );
};

export default TwitterIntegration;