import { useState } from "react"

import {
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
import { Textarea } from "@/components/ui/textarea"

import { params } from '@/components/integrations/twitter/params';
import ParamToggles from "@/components/integrations/twitter/paramToggles"

  
const IntegrationPlayground = () => {
    const [stepName, setStepName] = useState('')
    const [expansions, setExpansions] = useState([]);
    const [userFields, setUserFields] = useState([]);
    const [tweetFields, setTweetFields] = useState([]);
    const [listFields, setListFields] = useState([]);

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

    return (
      <div className="grid h-screen w-full pl-[56px]">
        <div className="flex flex-col">
          <main className="grid flex-1 gap-4 overflow-auto p-4 md:grid-cols-2 lg:grid-cols-3">
            <div
              className="relative hidden flex-col items-start gap-8 md:flex" x-chunk="dashboard-03-chunk-0"
            >
              <form className="grid w-full items-start gap-6">
                <fieldset className="grid gap-6 rounded-lg border p-4">
                  <legend className="-ml-1 px-1 text-sm font-medium">
                    Settings
                  </legend>
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
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user_pinned_tweet">
                          <div className="flex items-start gap-3 text-muted-foreground">
                            <Rabbit className="size-5" />
                            <div className="grid gap-0.5">
                              <p>
                                <span className="font-medium text-foreground">
                                  User's
                                </span>
                                {" "}Pinned Tweet
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
                                {" "} Lists
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
                </fieldset>
              </form>
            </div>
            <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl bg-muted/50 p-4 lg:col-span-2">
              <Badge variant="outline" className="absolute right-3 top-3">
                Output
              </Badge>
              <div className="flex-1" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  export default IntegrationPlayground
  