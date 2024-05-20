import React, { useEffect } from 'react';
import Image from 'next/image';
import { useState } from 'react';
import { Transition } from '@headlessui/react';
import "shepherd.js/dist/css/shepherd.css";
import { CountdownCircleTimer } from 'react-countdown-circle-timer';


import { AiOutlineLoading3Quarters, AiOutlineArrowLeft, AiTwotoneExclamationCircle } from "react-icons/ai";
import { IoSearch } from "react-icons/io5";
import { IoIosAddCircleOutline } from "react-icons/io";
import { PiUserSwitch } from "react-icons/pi";


import { useUser } from '@/lib/hooks';

import ParamToggles from './paramToggles';
import { params } from './params';
import twitterDemoData from './twitterDemoData';

const TwitterIntegration = ({ setData, setDflt, connecting, stepName, setStepName, setHelperOpen, setWorking}) => {
    const user = useUser();
    
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);

    const [handle, setHandle] = useState('elonmusk');
    const [editingHandle, setEditingHandle] = useState(false);
    const [originalVal, setOriginalVal] = useState('');

    //User search by handle and get ID
    const [userSearchOpen, setUserSearchOpen] = useState(true);
    const [userHandleId, setUserHandleId] = useState(27260086);
    
    const [expansions, setExpansions] = useState([]);
    const [userFields, setUserFields] = useState([]);
    const [tweetFields, setTweetFields] = useState([]);
    const [listFields, setListFields] = useState([]);
    const [showWarning, setShowWarning] = useState(false);

    const cancelHandler = (origin) => {
        if(origin === 'handle'){
            setSearchingUserName()
            setEditingHandle(false)
            setOriginalVal('')
        } /*else if(origin === 'subTitle'){
            setSubTitle(originalVal)
            setEditingSubTitle(false)
            setOriginalVal('')
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
        } else if(fieldType === 'listFields'){
            if(listFields.includes(value)){
                setListFields(listFields.filter(item => item !== value));
            } else {
                setListFields([...listFields, value]);
            }
        }
    }

    // staging data - this is twitter data being pulled before user submits for charting.
    const [stagingData, setStagingData] = useState(twitterDemoData.elonmusk);
    const [paramsOpen, setParamsOpen] = useState(false)
    
    const [searchingUserName, setSearchingUserName] = useState()
    const [rateInfo, setRateInfo] = useState()

    const queryHandler = (q) => {
        setParamsOpen(true)
        setStepName(q)
        setHelperOpen(true)
    }
    
    /* 
    *  username search handler
    */ 
    const triggerUserPull = async (e, username) => {
        if(username && demoUserNames.includes(username)){
            setHandle(username)
            setUserHandleId(twitterDemoData[username].userData.id)
            setStagingData(twitterDemoData[username])
            e.target.parentElement.parentElement.parentElement.removeAttribute('open');
        }else{
            setEditingHandle(false)
            if(!user){
                setShowWarning(true)
            }else{
                setHandle(searchingUserName)
                await fetchTwitterHandler('user_by_handle', searchingUserName)
            }
            //e.target.parentElement.parentElement.parentElement.removeAttribute('open');
        }     
    }

   


    
    {/*<Script type="module" src="shepherd.js/dist/shepherd.js" /> */}

    return (
        <div className='flex w-full p-10 h-full'>
            <div className='bg-white shadow-xl basis-3/12 h-fit'>
                <div className='dropdown w-full text-sm hover:bg-lychee-green/10 p-1 py-2'>
                    <div className='flex text-black place-items-center ' tabIndex={0} role="button"> 
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
                    <div tabIndex={0} className='z-[1] w-full p-3 bg-lychee-green/10 backdrop-blur-sm shadow-2xl mt-2 dropdown-content'>
                        <div className='bg-white/90 p-2'>
                            <div className="text-xs font-bold text-slate-500">
                                Available
                            </div>
                            <div className=''>
                                {demoUserNames.map((username) => (
                                    <div key={username} className='flex place-items-center cursor-pointer py-1 hover:bg-lychee-go/20' onClick={(e)=>triggerUserPull(e, username)}>
                                        <div className='rounded-full bg-slate-200 w-[25px] h-[25px] mx-1 flex place-items-center place-content-center' > 
                                            {twitterDemoData[username] 
                                                ? <Image src={twitterDemoData[username].userData.profile_image_url} width={25} height={25} className='rounded-full'/>
                                                : <AiOutlineLoading3Quarters className='animate-spin'/>}
                                        </div>
                                        <div className='mr-2 ml-1 font-bold'>
                                            {twitterDemoData[username] 
                                                ? twitterDemoData[username].userData.name
                                                : <progress className="progress w-56 progress-primary" />}
                                        </div>
                                        <div className='text-black flex-grow mr-4'>
                                            {username ? '@'+username : <AiOutlineLoading3Quarters className='animate-spin'/>}
                                        </div>
                                        <div className='hover:animate-spin hover:text-lychee-red text-lg'>
                                            <PiUserSwitch />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className='mt-2 p-2'> Add New Search </div>
                            <div className={`flex`}>
                                {
                                    editingHandle 
                                        ? <input className='px-3' type="text" autoFocus={true} value={searchingUserName} onChange={(e)=>setSearchingUserName(e.target.value)} style={{ outline: 'none' }}/>
                                        : <div className='w-full bg-lychee-go cursor-pointer hover:bg-lychee-white/60 text-black flex place-content-center py-1' onClick={()=>setEditingHandle(true)}>
                                            <IoSearch />
                                        </div>
                                }
                                {editingHandle &&
                                    <div className="w-full flex gap-1 place-content-end">
                                        <div className="py-1 px-2 bg-lychee-green text-white cursor-pointer hover:bg-lychee-black hover:text-white rounded-md" onClick={(e)=>triggerUserPull(e)}>Search</div>
                                        <div className="py-1 px-2 bg-slate-200 cursor-pointer hover:bg-lychee-black hover:text-white rounded-md" onClick={()=>cancelHandler('handle')}>Cancel</div>
                                    </div>
                                    }
                            </div>
                        </div>
                    </div>

                </div>
                <div className='pt-3'>
                    <div className='px-2 cursor-pointer text-slate-600 text-xs font-thin border-b'>Available actions</div>
                    <div className={`${stepName === 'user_pinned_tweet' ? 'bg-lychee-black text-white' : 'hover:bg-slate-100/30 cursor-pointer' } px-2 text-sm mt-1 py-2 flex gap-2 place-items-center border-b`} onClick={()=>queryHandler('user_pinned_tweet')}><div className='hover:animate-spin'><IoIosAddCircleOutline /></div> Get {handle}'s Pinned Tweet</div>
                    <div className={`${stepName === 'user_likes_by_id' ? 'bg-lychee-black text-white' : 'hover:bg-slate-100/30 cursor-pointer' } px-2 text-sm mt-1 py-2 flex gap-2 place-items-center border-b`} onClick={()=>queryHandler('user_likes_by_id')}><div className='hover:animate-spin'><IoIosAddCircleOutline /></div> Get tweets liked by {handle}</div>
                    <div className={`px-2 cursor-pointer hover:bg-lychee-red/10 text-sm mt-1 py-2 flex gap-2 place-items-center border-b`} onClick={()=>setWorking('getLychee')}><div className='hover:animate-spin'><AiTwotoneExclamationCircle /></div> Get {handle}'s followers<div className='ml-auto bg-lychee-go/30 px-2 border border-lychee-go rounded-xl'>Register and Vote to Activate</div></div>
                    <div className={`px-2 cursor-pointer hover:bg-lychee-red/10 text-sm mt-1 py-2 flex gap-2 place-items-center border-b`} onClick={()=>setWorking('getLychee')}><div className='hover:animate-spin'><AiTwotoneExclamationCircle /></div> Get user's followed by {handle}<div className='ml-auto bg-lychee-go/30 px-2 border border-lychee-go rounded-xl'>Register and Vote to Activate</div></div>
                    <div className={`${stepName === 'user_owned_lists_by_id' ? 'bg-lychee-black text-white' : 'hover:bg-slate-100/30 cursor-pointer' } px-2 text-sm mt-1 py-2 flex gap-2 place-items-center border-b`} onClick={()=>queryHandler('user_owned_lists_by_id')}><div className='hover:animate-spin'><IoIosAddCircleOutline /></div> Get lists owned by {handle}</div>
                </div>
                <div className='pt-3'>
                    <div className='text-slate-600 text-xs font-thin border-b pl-2 pb-1'>Inspo</div>
                    <div className='px-2 cursor-pointer hover:bg-soft/40 text-sm py-2 flex gap-2 place-items-center border-b'><div className='hover:animate-spin'><IoIosAddCircleOutline /></div> What are your competitor's most popular tweets?</div>
                    <div className='px-2 cursor-pointer hover:bg-soft/40 text-sm py-2 flex gap-2 place-items-center border-b'><div className='hover:animate-spin'><IoIosAddCircleOutline /></div> Who are your biggest fans?</div>
                    <div className='px-2 cursor-pointer hover:bg-soft/40 text-sm py-2 flex gap-2 place-items-center border-b'><div className='hover:animate-spin'><IoIosAddCircleOutline /></div> Who are your competitor's biggest followers?</div>
                    <div className='px-2 cursor-pointer hover:bg-soft/40 text-sm py-2 flex gap-2 place-items-center border-b'><div className='hover:animate-spin'><IoIosAddCircleOutline /></div> Make a list and start a contest?</div>
                </div>
                <Transition
                    show={stagingData && Boolean(stagingData.userData)}
                    enter="transition-opacity duration-1000"
                    enterFrom="opacity-0 basis-0/12"
                    enterTo="opacity-100 basis-3/12"
                    leave="transition-opacity duration-150"
                    leaveFrom="opacity-100 basis-3/12"
                    leaveTo="opacity-0 basis-0/12"
                    className={'bg-slate-100 pt-4 shadow-lg px-4 h-fit pb-4'}>
                        <div className='text-xs font-black'>{handle}'s User Data</div>
                        <div className='pt-2 grid grid-cols-2 text-xs'>
                            {stagingData.userData.id && <div> Id: {stagingData.userData.id}</div>}
                            {stagingData.userData.followers_count && <div> Followers: {stagingData.userData.followers_count}</div>}
                            {stagingData.userData.location && <div> location tag: {stagingData.userData.location} </div>}
                            {stagingData.userData.verified_type && <div> verified type: {stagingData.userData.verified_type} </div>}
                            {stagingData.userData.verified && <div> verified?  {stagingData.userData.verified} </div>}
                            {stagingData.userData.description && <div> description: {stagingData.userData.description} </div>}
                            {stagingData.userData.name && <div> name: {stagingData.userData.name} </div>}
                            {stagingData.userData.url && <div> url: {stagingData.userData.url} </div>}
                            {stagingData.userData.protected && <div> protected: {stagingData.userData.protected} </div>}
                            {stagingData.userData.followers_count && <div> followers count: {stagingData.userData.followers_count} </div>}
                            {stagingData.userData.following_count && <div> following count: {stagingData.userData.following_count} </div>}
                            {stagingData.userData.tweet_count && <div> tweet count: {stagingData.userData.tweet_count} </div>}
                            {stagingData.userData.listed_count && <div> listed count: {stagingData.userData.listed_count} </div>}
                            {stagingData.userData.like_count && <div> like count count: {stagingData.userData.like_count} </div>}
                        </div>
                </Transition>
                <Transition
                    show={Boolean(rateInfo)} //rateInfo && 
                    enter="transition-opacity duration-1000"
                    enterFrom="opacity-0 basis-0/12"
                    enterTo="opacity-100 basis-3/12"
                    leave="transition-opacity duration-150"
                    leaveFrom="opacity-100 basis-3/12"
                    leaveTo="opacity-0 basis-0/12"
                    className={'bg-slate-100 pt-4 shadow-lg px-4 h-fit pb-4'}>
                        <div className='text-xs font-black'>Community Rate Info</div>
                        <div className='pt-2 text-xs grid grid-cols-2'>
                            <div>
                                {rateInfo && rateInfo.limit && <div> {stepName} Community Limit: {rateInfo.limit}</div>}
                                {rateInfo && rateInfo.remaining && <div> Community pool's remaining requests for {stepName}: {rateInfo.remaining}</div>}                            
                            </div>
                            {rateInfo && rateInfo.reset && 
                                <div className='flex flex-col place-items-end'>
                                        <div> Resets in</div>
                                        <CountdownCircleTimer
                                            isPlaying
                                            size={45}
                                            duration={Math.floor(((Number(rateInfo.reset) * 1000) - Date.now()) / 1000)}
                                            colors={['#004777', '#F7B801', '#A30000', '#A30000']}
                                            colorsTime={[
                                                Math.floor(((Number(rateInfo.reset) * 1000) - Date.now()) / 1000),
                                                Math.floor((2/3) * Math.floor(((Number(rateInfo.reset) * 1000) - Date.now()) / 1000)),
                                                Math.floor((1/3) * Math.floor(((Number(rateInfo.reset) * 1000) - Date.now()) / 1000)),
                                                0
                                            ]}
                                        >
                                            {({ remainingTime }) => remainingTime}
                                        </CountdownCircleTimer>
                                </div>
                            }
                        </div>
                        <div className='text-xs'>
                              You can move to private request limits that are much higher when you register and connect your Twitter account
                        </div>
                </Transition>
            </div>
            {
                /* Parameter Slider */
            }
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
                                    {params[stepName].expansions.map((val) => (
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
                /* Grid View */
            }
            <Transition
                show={Boolean(userHandleId)}
                enter="transition-opacity duration-1000"
                enterFrom="opacity-0 basis-0/12"
                enterTo="opacity-100 basis-3/12"
                leave="transition-opacity duration-150"
                leaveFrom="opacity-100 basis-3/12"
                leaveTo="opacity-0 basis-0/12"
                className={'h-full flex-grow basis-7/12 h-fit flex place-content-center'}>
                    <GridView />
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