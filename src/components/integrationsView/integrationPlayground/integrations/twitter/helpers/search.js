// components/TwitterSearch.js
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clipboard } from 'react-feather';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from 'sonner';

import { useMyStateV2  } from '@/context/stateContextV2'

const TwitterSearch = ({searchTweets}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const contextStateV2 = useMyStateV2()
  const setConnectedData = contextStateV2?.setConnectedData

  const handleSearch = async(e) => {
    e.preventDefault();
    try {
        if(searchTweets){
            const response = await fetch(`/api/integrations/twitter/search?tweets=${query}`);
            let tweets = await response.json();
            setConnectedData(tweets.data)
            toast('Search executed ' + data.length + ' tweets found over the past 7 days')
        }else{
            //search users
            const response = await fetch(`/api/integrations/twitter/search?username=${query}`);
            const data = await response.json();
            setResults(data);
        }
    } catch (error) {
      setResults([]);
    }
  };

  const copyToClipboard = (e, userId) => {
    e.preventDefault();
    navigator.clipboard.writeText(userId).then(() => {
      toast('Copied');
    }).catch((error) => {
      console.error('Copy failed', error);
    });
  };

  return (
    <div className="py-2 text-xs">
      <div className="flex space-x-4">
        <Input
          type="text"
          placeholder="Type a Twitter handle..."
          className="text-xs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button onClick={handleSearch} className="text-xs">Search</Button>
      </div>
      <div className="mt-4">
        {results.length > 0 ? (
          results.map((user) => (
            <div key={user.id} className="flex items-center justify-between">
              <p>{user.username} ({user.name}) {user.id}</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={(e) => copyToClipboard(e, user.id)}>
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy to clipboard</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ))
        ) : (
          <p>No results found.</p>
        )}
      </div>
    </div>
  );
};

export default TwitterSearch;
