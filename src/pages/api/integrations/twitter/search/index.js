import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_KEY_SECRET,
    accessToken: process.env.TWITTER_OAUTH_2_CLIENT_ID,
    accessSecret: process.env.TWITTER_OAUTH_2_CLIENT_SECRET,
});

const bearer = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
const twitterBearer = bearer.readWrite;

export default async function handler(req, res) {
    const { username, tweets } = req.query;
    
    if (!username && !tweets) {
      return res.status(400).json({ error: 'Username or tweets query is required' });
    }

    try {
      if (username) {
        // Single user situation
        const user = await twitterBearer.v2.userByUsername(username);
        res.status(200).json([user.data]);
      } else if (tweets) {
        // Search tweets situation
        const tweetsResult = await twitterBearer.v2.search(tweets, { 'tweet.fields': 'created_at' });
        const tweetsData = tweetsResult.data;
        res.status(200).json(tweetsData);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }