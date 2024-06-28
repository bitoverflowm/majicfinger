import { TwitterApi } from 'twitter-api-v2';

// Utility function to remove empty parameters
const filterParams = (params) => {
  return Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)));
};

// Utility function to flatten nested objects
const flattenObject = (obj, parent = '', res = {}) => {
    for (let key in obj) {
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        flattenObject(obj[key], key, res);
      } else {
        res[key] = obj[key];
      }
    }
    return res;
};

const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_KEY_SECRET,
    accessToken: process.env.TWITTER_OAUTH_2_CLIENT_ID,
    accessSecret: process.env.TWITTER_OAUTH_2_CLIENT_SECRET,
});

const bearer = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
const twitterBearer = bearer.readWrite;

const twitterClient = client.readWrite;

export default async function handler(req, res) {
  const { query } = req.query;
  const {
    tweetId, tweetIds, userId, endTime, exclude, expansions, maxResults,
    mediaFields, pagination_token, placeFields, pollFields, sinceId, startTime,
    tweetFields, untilId, userFields
  } = req.body;

  const commonParams = filterParams({
    expansions, 'media.fields': mediaFields, 'place.fields': placeFields,
    'poll.fields': pollFields, 'tweet.fields': tweetFields, 'user.fields': userFields
  });

  try {
    let data;
    let filteredParams;
    switch (query) {
        case 'fetchTweetById':
            data = await twitterBearer.v2.singleTweet(tweetId, commonParams);
            break;
        case 'fetchTweetsByIds':
            data = await twitterBearer.v2.tweets(tweetIds, commonParams);
            break;
        case 'fetchTweetsByUserId':
            filteredParams = filterParams({
                end_time: endTime, exclude, max_results: maxResults, pagination_token,
                since_id: sinceId, start_time: startTime, until_id: untilId, ...commonParams
            });
            data = await twitterBearer.v2.userTimeline(userId, filteredParams);
            //todo: is this something that can break? 
            data = data.data
            break;
        case 'fetchUserMentionsByUserId':
            filteredParams = filterParams({
                end_time: endTime, max_results: maxResults, pagination_token,
                since_id: sinceId, start_time: startTime, until_id: untilId, ...commonParams
            });
            data = await twitterBearer.v2.userMentionTimeline(userId, filteredParams);
            //todo: is this something that can break? 
            data = data.data
            break;
      default:
        res.status(400).json({ error: 'Invalid query parameter' });
        return;
    }
    // Ensure the data is always returned as an array and flatten it
    const responseData = Array.isArray(data.data) ? data.data : [data.data];
    const flattenedData = responseData.map(item => flattenObject(item));
    res.status(200).json(flattenedData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
