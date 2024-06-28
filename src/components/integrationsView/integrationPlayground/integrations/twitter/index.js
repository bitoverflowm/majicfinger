import { useState } from 'react';
import { Alert } from "@/components/ui/alert";
import { FlaskConical } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Search from './helpers/search';

const Twitter = ({ setConnectedData }) => {
  const [error, setError] = useState(null);
  const [args, setArgs ] = useState()

  const fetchHandler = async (query, params) => {
    try {
      const res = await fetch(`/api/integrations/twitter?query=${query}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (res.status === 200) {
        const data = await res.json();
        setConnectedData(data);
      } else {
        const errorData = await res.json();
        setError(errorData.error);
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    }
  };

  const tweetActions = [
    {
      query: 'fetchTweetById',
      name: 'Tweet Data by Tweet ID',
      description: 'Get a single tweet by its ID',
      params: { tweetId: '1805930417343598641', expansions: [], mediaFields: [], placeFields: [], pollFields: [], tweetFields: [], userFields: [] },
    },
    {
      query: 'fetchTweetsByIds',
      name: 'Multi. Tweet Data by IDs',
      description: 'Get multiple tweets by their IDs',
      params: { tweetIds: ['1805957579526275302', '1805930417343598641'], expansions: [], mediaFields: [], placeFields: [], pollFields: [], tweetFields: [], userFields: [] },
    },
    {
        query: 'fetchTweetsByUserId',
        name: "Fetch User's Tweets",
        description: 'Returns Tweets composed by a single user, specified by the requested user ID',
        params: { userId: '44196397', endTime: null, exclude: 'retweets', expansions: [], maxResults: 25, mediaFields: [], pagination_token: null, placeFields: ['country'], pollFields: [], sinceId: null, startTime: null, tweetFields: ['created_at', 'public_metrics'], untilId: null, userFields: ['name','username','verified'] },
    },
  ];

  const userActions = [
    {
        query: 'fetchUserMentionsByUserId',
        name: "Fetch Tweets Mentioning User (userId).",
        description: 'Fetch Tweets Mentioning User (userId)',
        params: { userId: '44196397', endTime: null, expansions: ['author_id', 'entities.mentions.username', 'in_reply_to_user_id', 'referenced_tweets.id.author_id'], maxResults: 25, mediaFields: [], pagination_token: null, placeFields: ['country'], pollFields: [], sinceId: null, startTime: null, tweetFields: ['created_at', 'public_metrics'], untilId: null, userFields: ['name','username','verified'] },
    }
  ]



  return (
    <div className="text-[12px]">
        <p className="text-xs text-muted-foreground">Search for userhandle to get user id value.</p>
        <Search />
        <Accordion defaultValue="tweetActions" type="single" collapsible className="w-full">
            <AccordionItem value="tweetActions">
                <AccordionTrigger>Tweets</AccordionTrigger>
                <AccordionContent>
                <div className='flex flex-wrap gap-1'>
                    {tweetActions.map(action => (
                    <div
                        key={action.query}
                        className={`text-[10px] px-3 py-1 border rounded-md hover:bg-lychee_red hover:text-white cursor-pointer`}
                        onClick={() => fetchHandler(action.query, action.params)}
                        title={action.description}
                    >
                        {action.name}
                    </div>
                    ))}
                </div>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="userActions">
                <AccordionTrigger>Users</AccordionTrigger>
                <AccordionContent>
                <div className='flex flex-wrap gap-1'>
                    {userActions.map(action => (
                    <div
                        key={action.query}
                        className={`text-[10px] px-3 py-1 border rounded-md hover:bg-lychee_red hover:text-white cursor-pointer`}
                        onClick={() => fetchHandler(action.query, action.params)}
                        title={action.description}
                    >
                        {action.name}
                    </div>
                    ))}
                </div>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="search">
                <AccordionTrigger>Search Tweets</AccordionTrigger>
                <AccordionContent>
                <div className='flex flex-wrap gap-1'>
                    <Search searchTweets={true} />
                </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
        
        {error && (
        <Alert className="mt-4">
            <div className="flex gap-2 place-items-center">
            <FlaskConical className="w-8 h-8" />
            <div>{error}</div>
            </div>
        </Alert>
        )}
    </div>
  );
};


export default Twitter