import { useState } from "react"

import {
  ArrowLeft,
    Bird,
    Rabbit,
    Turtle,
  } from "lucide-react"
  
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { useMyStateV2  } from '@/context/stateContextV2'


//static data
import { params } from '@/components/integrations/twitter/params';
import twitterDemoData from '@/components/integrations/twitter/twitterDemoData';

import ParamToggles from "@/components/integrations/twitter/paramToggles"
import PreviewGrid from "@/components/gridView/previewGrid"
import WallStreetBets from "./integrations/wallStreetBets"
import CoinGecko from "./integrations/coinGecko"
import Twitter from "./integrations/twitter"
  
const IntegrationPlayground = ({playView, setPlayView}) => {
    const contextStateV2 = useMyStateV2()

    const connectedData = contextStateV2?.connectedData || [];
    const setConnectedData = contextStateV2?.setConnectedData || [];
    const setViewing = contextStateV2?.setViewing
    /* Step Names:  */
    const [stepName, setStepName] = useState('')
    const [expansions, setExpansions] = useState([]);
    const [userFields, setUserFields] = useState([]);
    const [tweetFields, setTweetFields] = useState([]);
    const [listFields, setListFields] = useState([]);

    const [loading, setLoading] = useState()
    const [prevData, setPrevData] = useState()
    const [userHandleIds, setUserHandleIds] = useState([{}])
    const [rateInfo, setRateInfo] = useState()
    const [searchingUserName, setSearchingUserName] = useState()

    const [demoUserNames] = useState(['elonmusk', 'justinbieber', 'christiano', 'jack', 'lychee_xyz', 'spaceX', 'misterrpink1'])// 'kanyewest', 'BarackObama', 'lychee_xyz', 'spaceX'])

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

    const fetchTwitterHandler = async (ask) => {
        setLoading(true);

        try {
            // Append the handle as a query parameter in the URL
            if(ask === 'user_by_handle' ){
                if(demoUserNames.includes(searchingUserName)){
                    let newHandle = {
                        searchingUserName: {
                            id: twitterDemoData[searchingUserName].userData.id
                        }
                    }
                    setUserHandleIds(prevUserHandles => [...prevUserHandles, newHandle]);
                    setConnectedData([twitterDemoData[searchingUserName].userData])
                }else{
                    const url = new URL('/api/integrations/twitter/userhandle', window.location.origin);
                    url.searchParams.append('handle', searchingUserName);
                    let allExpansions = params['user_by_handle'].expansions
                    let allUserFields = params['user_by_handle'].userFields
                    let allTweetFields = params['user_by_handle'].tweetFields
                    let res = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ expansions: allExpansions, userFields: allUserFields, tweetFields: allTweetFields}),
                    });

                    if (res.status === 200) {
                        let resUserData = await res.json();
                        console.log(resUserData);
                        setConnectedData([resUserData.userData]);
                        //setStagingData(resUserData)
                        let newHandle = {
                            userHandle: {
                                id: resUserData.userData.id
                            }
                        }
                        setUserHandleIds(prevUserHandles => [...prevUserHandles, newHandle]);
                        setRateInfo(resUserData.rateLimit)
                    } else {
                        console.error("Twitter User Data pull failed");
                    }
                }
            }else{
                if(demoUserNames.includes(searchingUserName)){
                    //let thirdParam = tweetFields.length > 0 ? tweetFields : listFields
                    if(ask === 'user_likes_by_id'){
                        setConnectedData(twitterDemoData[searchingUserName].liked_tweets)                     
                    }else if(ask === 'user_owned_lists_by_id'){
                        setConnectedData(twitterDemoData[searchingUserName].owned_lists)
                    } else if(ask === 'user_pinned_tweet'){
                        console.log("user pimnmed tweet", twitterDemoData[searchingUserName].userData)
                        setConnectedData([twitterDemoData[searchingUserName].userData])
                    }
                }else{
                    const url = new URL(`/api/integrations/twitter/${ask}`, window.location.origin);
                    url.searchParams.append('handleId', userHandleIds[searchingUserName]);
                    let thirdParam = tweetFields.length > 0 ? tweetFields : listFields
                    let res = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ expansions, userFields, thirdParam }),
                    });

                    if (res.status === 200) {
                        let resData = await res.json();
                        console.log(resData);
                        //setPrevData(resData.userData);
                        setConnectedData(resData.userData)
                        setRateInfo(resData.rateLimit)
                    } else {
                        console.error("Twitter User Data pull failed");
                    }
                }                
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
            setExpansions([])
            setUserFields([])
            setTweetFields([])
            setListFields([])
        }
    }

    return (
      <div className="py-3 px-2 sm:px-5">
          <div className="w-48 text-[10px] sm:text-xs hover:bg-lychee_green/40 cursor-pointer flex place-item-center gap-2 py-2 px-2" onClick={()=>setPlayView()}> <ArrowLeft className="h-4 w-4"/> Go Back</div>
          <main className="grid grid-cols-1 pl-2 md:grid-cols-3 gap-4 sm:w-full">
              <div className="relative flex-col items-start gap-8 md:flex" x-chunk="dashboard-03-chunk-0">
                <form className="w-full">
                  <fieldset className="rounded-lg border px-4 py-2">
                    <legend className="-ml-1 px-1 text-xs font-medium">Select an action</legend>
                    {
                      playView === "x" &&
                        <>
                          <div className="grid gap-3">
                            <Label htmlFor="temperature">Filter</Label>
                            <div className="flex gap-2">
                                <Badge className="text-xs" variant="secondary">
                                    All
                                </Badge>
                                <Badge className="text-xs" variant="secondary">
                                    Users
                                </Badge>
                                <Badge className="text-xs" variant="secondary">
                                    Tweets
                                </Badge>
                                <Badge className="text-xs" variant="secondary">
                                    Trends
                                </Badge>
                                <Badge className="text-xs" variant="secondary">
                                    Spaces
                                </Badge>
                                <Badge className="text-xs" variant="secondary">
                                    Lists
                                </Badge>
                            </div>
                          </div>
                          <div className="grid gap-3">
                            <Label htmlFor="model">Search</Label>
                            <Select onValueChange={(e)=>setStepName(e)}>
                              <SelectTrigger
                                id="model"
                                className="items-start [&_[data-description]]:hidden"
                              >
                                <SelectValue placeholder="Pick an option to search for?" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user_by_handle">
                                  <div className="flex items-start gap-3 text-muted-foreground">
                                    <Rabbit className="size-5" />
                                    <div className="grid gap-0.5">
                                      <p>
                                        <span className="font-medium text-foreground">
                                          User
                                        </span>
                                        {" "}by Handle
                                      </p>
                                      <p className="text-xs" data-description>
                                        -
                                      </p>
                                    </div>
                                  </div>
                                </SelectItem>
                                <SelectItem value="user_pinned_tweet">
                                  <div className="flex items-start gap-3 text-muted-foreground">
                                    <Rabbit className="size-5" />
                                    <div className="grid gap-0.5">
                                      <p>
                                        <span className="font-medium text-foreground">
                                          User's
                                        </span>
                                        {" "}Pinned Tweet by handle
                                      </p>
                                      <p className="text-xs" data-description>
                                        -
                                      </p>
                                    </div>
                                  </div>
                                </SelectItem>
                                <SelectItem value="user_owned_lists_by_id">
                                  <div className="flex items-start gap-3 text-muted-foreground">
                                    <Rabbit className="size-5" />
                                    <div className="grid gap-0.5">
                                      <p>
                                        <span className="font-medium text-foreground">
                                          User's
                                        </span>
                                        {" "} Lists by handle
                                      </p>
                                      <p className="text-xs" data-description>
                                        -
                                      </p>
                                    </div>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {
                            stepName === 'user_by_handle'
                            && <div className="grid gap-3">
                                    <Label htmlFor="userhandle">User Handle</Label>
                                    <Input id="userHandle" type="text" placeholder="enter userhandle without @" onChange={(e)=>setSearchingUserName(e.target.value)} />
                                </div>
                          }
                          <div className=''>
                            <div className='text-sm text-muted-foreground'>Select the granular data points you want to examine</div>
                            <div className='text-sm text-muted-foreground'>These will be your "columns"</div>
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

                        </>
                    }
                    {
                      playView === 'twitter' && <Twitter setConnectedData={setConnectedData}/>
                      
                    }
                    {
                      playView === "wallStreetBets" &&
                        <>
                          <WallStreetBets setConnectedData={setConnectedData}/>
                        </>
                    }
                    { 
                      playView === "coinGecko" &&
                        <>
                          <CoinGecko setConnectedData={setConnectedData}/>
                        </>
                    }
                    
                  </fieldset>
                </form>
              </div>
              <div className="relative flex flex-col min-h-[90vh] rounded-xl bg-muted/30 p-2 sm:p-4 sm:col-span-2">
                <Badge variant="outline" className="mx-auto sm:absolute sm:right-3 sm:top-3">
                  Output
                </Badge>
                <div className="flex-1 pt-2 sm:pt-10">
                  {
                      connectedData && <PreviewGrid />
                  }
                </div>
                <Alert className="text-xs sm:mt-auto">
                  <Rabbit className=""/>
                  <AlertTitle>A snippet of your query will appear above. You can then head over to</AlertTitle>
                  <AlertDescription>
                    <div className="text-xs">
                      <div><span className="underline cursor-pointer hover:bg-lychee_green" onClick={()=>setViewing('dataStart')}>Data Sheets</span> to view and work with the full dataset</div>
                      <div><span className="underline cursor-pointer hover:bg-lychee_green" onClick={()=>setViewing('ai')}>AI</span> see what you can discover with AI analysis</div>
                      <div><span className="underline cursor-pointer hover:bg-lychee_green" onClick={()=>setViewing('charts')}>Charts</span> to start 
                      visualizing your data</div>
                      <div><span className="hidden underline cursor-pointer hover:bg-lychee_green" onClick={()=>setViewing('presentation')}>Presentation</span> to start creating your presentation and share with your audience</div></div>
                  </AlertDescription>                
                </Alert>    
              </div>
          </main>
      </div>
    )
  }

  export default IntegrationPlayground
  