import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_KEY_SECRET,
    // Following access tokens are not required if you are
    // at part 1 of user-auth process (ask for a request token)
    // or if you want a app-only client (see below)
    accessToken: process.env.TWITTER_OAUTH_2_CLIENT_ID,
    accessSecret: process.env.TWITTER_OAUTH_2_CLIENT_SECRET,
});

const bearer = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
const twitterBearer = bearer.readWrite;

const twitterClient = client.readWrite;

export default async function handler(req, res) {
  const { query } = req.query;
  const { tweetId, tweetIds, expansions, mediaFields, placeFields, pollFields, tweetFields, userFields } = req.body;

  try {
    let data;
    switch (query) {
      case 'fetchTweetById':
        data = await twitterBearer.v2.singleTweet(tweetId, {
          expansions: expansions,
          'media.fields': mediaFields,
          'place.fields': placeFields,
          'poll.fields': pollFields,
          'tweet.fields': tweetFields,
          'user.fields': userFields,
        });
        break;
      case 'fetchTweetsByIds':
        data = await twitterBearer.v2.tweets(tweetIds, {
          expansions: expansions,
          'media.fields': mediaFields,
          'place.fields': placeFields,
          'poll.fields': pollFields,
          'tweet.fields': tweetFields,
          'user.fields': userFields,
        });
        break;
      default:
        res.status(400).json({ error: 'Invalid query parameter' });
        return;
    }
    // Ensure the data is always returned as an array
    const responseData = Array.isArray(data.data) ? data.data : [data.data];
    res.status(200).json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}