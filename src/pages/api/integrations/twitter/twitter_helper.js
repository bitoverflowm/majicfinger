// earthquake_helper.js
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


// Define your helper functions here
const fetchTwitterUserByHandle = async (handle) => {
    //const userData = await twitterClient.v2.userByUsername(handle);
    const userData = await twitterBearer.v2.userByUsername(handle, {
        //A comma separated list of User fields to display
        "user.fields": ["created_at"],
        
        //A comma separated list of Tweet fields to display.
        "tweet.fields": ["created_at"],
        
        //A comma separated list of fields to expand
        expansions: ["pinned_tweet_id"]
      });
    return userData
}

const processTwitterData = (data) => {
    return null
}

// Export the helper functions
module.exports = {
    fetchTwitterUserByHandle,
};