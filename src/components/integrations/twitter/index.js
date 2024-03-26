import React from 'react';
import { useState } from 'react';
import { Transition } from '@headlessui/react';

import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { HiOutlinePencilSquare } from "react-icons/hi2"

import GridView from '../../gridView';

import ParamToggles from './paramToggles';
import { params } from './params';


const TwitterIntegration = ({ setData, setDflt}) => {
    // Your component logic goes here
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);

    const [handle, setHandle] = useState('misterrpink1');
    const [editingHandle, setEditingHandle] = useState(false);
    const [originalVal, setOriginalVal] = useState('');

    const [userSearchOpen, setUserSearchOpen] = useState(true);

    const [userId, setUserId] = useState();
    const [expansions, setExpansions] = useState([]);
    const [userFields, setUserFields] = useState([]);
    const [tweetFields, setTweetFields] = useState([]);


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
        // Append the handle as a query parameter in the URL
        const url = new URL('/api/integrations/twitter', window.location.origin);
        url.searchParams.append('handle', handle);

        try {
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
                setData([twitterUserData.userData.data]);
                setDflt(false);
                setUserId(twitterUserData.userData.data.id);
                setUserSearchOpen(false);
            } else {
                console.error("Twitter User Data pull failed");
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        // Your JSX code goes here
        <div>
            <div className='text-xs gap-2 py-10 place-items-center place-content-center'>
                <div className='flex'>
                    <div>
                        <div>Start by entering a username to analyze:</div>
                    </div>
                    <div className=''>
                        <div className="px-1 flex gap-2 text-xs w-full border border-white" onClick={()=>!editingHandle && editHandler('handle')}>
                            {
                            editingHandle ? 
                                <input type="text" className="w-full" autoFocus={true} value={handle} onChange={(e)=>setHandle(e.target.value)}/>
                                : <div className="w-full">@{handle}</div>
                            }
                            <div className="place-self-right cursor-pointer" >
                                {editingHandle ? <div className="flex gap-1">
                                        <div className="py-1 px-2 bg-lychee-green hover:bg-lychee-black hover:text-white rounded-md" onClick={()=>setEditingHandle(false)}>Save</div>
                                        <div className="py-1 px-2 bg-slate-200 hover:bg-lychee-black hover:text-white rounded-md" onClick={()=>cancelHandler('handle')}>Cancel</div>
                                        </div> :  <HiOutlinePencilSquare />}
                            </div>
                        </div>
                    </div>
                    <div className=''>
                        <div className='px-3 py-1 bg-black text-white cursor-pointer hover:bg-lychee-peach rounded-md' onClick={()=>fetchTwitterHandler('fetchUserByHandle')}>Connect</div>
                    </div>
                </div>
                <div className='' onClick={()=>setUserSearchOpen(true)}>Set param Details</div>
                <Transition 
                    show={userSearchOpen && true}
                    enter="transition-opacity duration-1000"
                    enterFrom="opacity-0 h-0"
                    enterTo="opacity-100 h-auto"
                    leave="transition-opacity duration-150"
                    leaveFrom="opacity-100 h-auto"
                    leaveTo="opacity-0">
                        <div className=''>
                            <div className='py-1'>Select the data you want:</div>
                            <div onClick={()=>setUserSearchOpen(false)}>close</div>
                            <div className='flex gap-2'>
                                <div className=''>
                                    {params.user_by_handle.expansions.map((val) => (
                                        <ParamToggles key={val} field_type="expansions" val={val} toggle={() => toggleParams('expansions', val)} arr={expansions}/>
                                    ))}
                                    {/*<ParamToggles field_type='expansions' val='pinned_tweet_id' toggle={toggleParams} arr={expansions}/>*/}
                                </div>
                                <div>
                                    {/* For tweetFields */}
                                    {params.user_by_handle.tweetFields.map((val) => (
                                        <ParamToggles key={val} field_type="tweetFields" val={val} toggle={() => toggleParams('tweetFields', val)} arr={tweetFields}/>
                                    ))}
                                </div>
                                <div>
                                    {/* For userFields */}
                                    {params.user_by_handle.userFields.map((val) => (
                                        <ParamToggles key={val} field_type="userFields" val={val} toggle={() => toggleParams('userFields', val)} arr={userFields}/>
                                    ))}
                                </div>
                            </div>

                        </div>
                </Transition>
                
                <div>
                    
                    <div>Get Likes By User</div>
                    <div>Get Followers of User</div>
                    <div>Get who User Follows</div>
                    <div>User's Lists</div>
                </div>
                
            </div>

            <div className='px-2 py-1 bg-black text-white hover:bg-white hover:text-black ' onClick={()=>fetchTwitterHandler('misterrpink1')}>Get</div>
            
                {   loading &&
                    <div className='flex place-items-center animate-pulse gap-2'>
                        <AiOutlineLoading3Quarters className='animate-spin'/>
                            Loading...
                    </div>
            }
            {
                connected && <div>
                                <div>Twitter has been connected. </div>
                                <div>Go to Table or Chart to view the full data set</div>
                                <div>The data below is just a preview</div>
                            </div>
            }
            {
                connected && <div className='h-96 w-full'>
                                <GridView sample={true}/>
                            </div>
                            }
                        
        </div>
    );
};

export default TwitterIntegration;