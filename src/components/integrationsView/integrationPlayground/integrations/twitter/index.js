import { useState } from 'react';
import { Alert } from "@/components/ui/alert";
import { FlaskConical } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Twitter = ({ setConnectedData }) => {
  const [error, setError] = useState(null);

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
      name: 'Fetch Tweet by ID',
      description: 'Get a single tweet by its ID',
      params: { tweetId: '1805930417343598641', expansions: [], mediaFields: [], placeFields: [], pollFields: [], tweetFields: [], userFields: [] },
    },
    {
      query: 'fetchTweetsByIds',
      name: 'Fetch Multiple Tweets',
      description: 'Get multiple tweets by their IDs',
      params: { tweetIds: ['1805957579526275302', '1805930417343598641'], expansions: [], mediaFields: [], placeFields: [], pollFields: [], tweetFields: [], userFields: [] },
    },
  ];

  return (
    <div className="text-[12px]">
      <Accordion defaultValue="tweetActions" type="single" collapsible className="w-full">
        <AccordionItem value="tweetActions">
          <AccordionTrigger>Tweet Actions</AccordionTrigger>
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