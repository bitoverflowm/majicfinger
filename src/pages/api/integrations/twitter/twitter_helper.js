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

// Fetch Twitter user data by handle
const fetch_twitter_user_by_handle = async (handle, userFields, tweetFields, expansions) => {
    //const userData = await twitterClient.v2.userByUsername(handle);
    const userData = await twitterBearer.v2.userByUsername(handle, {
        //A comma separated list of User fields to display
        "user.fields": userFields,
        
        //A comma separated list of Tweet fields to display.
        "tweet.fields": tweetFields,
        
        //A comma separated list of fields to expand
        expansions: expansions
      });
    return userData
}

// Fetch multiple Twitter users using array of handles/usernaames
const fetch_twitter_users_by_handles = async (handles, userFields, tweetFields, expansions) => {
    const userData = await twitterBearer.v2.usersByUsernames(handles, {
        //A comma separated list of User fields to display
        "user.fields": userFields,
        
        //A comma separated list of Tweet fields to display.
        "tweet.fields": tweetFields,
        
        //A comma separated list of fields to expand
        expansions: expansions
      });
    return userData
}

// Fetch Twitter user data by single id
const fetch_twitter_user_by_id = async (id, userFields, tweetFields, expansions) => {
    const userData = await twitterBearer.v2.user(id, {
        //A comma separated list of User fields to display
        "user.fields": userFields,
        
        //A comma separated list of Tweet fields to display.
        "tweet.fields": tweetFields,
        
        //A comma separated list of fields to expand
        expansions: expansions
      });
    return userData
}

// Fetch multiple Twitter users using array of ids
const fetch_twitter_users_by_ids = async (ids, userFields, tweetFields, expansions) => {
    const userData = await twitterBearer.v2.users(ids, {
        //A comma separated list of User fields to display
        "user.fields": userFields,
        
        //A comma separated list of Tweet fields to display.
        "tweet.fields": tweetFields,
        
        //A comma separated list of fields to expand
        expansions: expansions
      });
    return userData
}

// Fetch tweets liked by a user by User Id
const fetch_twitter_users_liked_tweets_by_id = async (id, userFields, tweetFields, placeFields, expansions) => {
    const userData = await twitterBearer.v2.userLikedTweets(ids, {
        //A comma separated list of User fields to display
        "user.fields": userFields,
        
        //A comma separated list of Tweet fields to display.
        "tweet.fields": tweetFields,

        "place.fields": placeFields,
        
        //A comma separated list of fields to expand
        expansions: expansions
      });
    return userData
}

// Fetch Twitter users following a given user by user ID 
const fetch_twitter_followers_by_id = async (id, userFields, tweetFields, expansions) => {
    const userData = await twitterBearer.v2.followers(id, {
        //A comma separated list of User fields to display
        "user.fields": userFields,
        
        //A comma separated list of Tweet fields to display.
        "tweet.fields": tweetFields,
        
        //A comma separated list of fields to expand
        expansions: expansions,
        asPaginator: true
      });
    return userData
}


// Fetch Twitter users following a given user by user ID 
const fetch_twitter_following_by_id = async (id, userFields, tweetFields, expansions) => {
    const userData = await twitterBearer.v2.following(id, {
        //A comma separated list of User fields to display
        "user.fields": userFields,
        
        //A comma separated list of Tweet fields to display.
        "tweet.fields": tweetFields,
        
        //A comma separated list of fields to expand
        expansions: expansions,
        asPaginator: true
      });
    return userData
}

//fetch lists owned by user id -> returns list of list IDs
// Fetch Twitter users following a given user by user ID 
const fetch_twitter_owned_lists_by_id = async (id, listFields, userFields, expansions) => {
    const listData = await twitterBearer.v2.listsOwned(id, {
        //A comma separated list of User fields to display
        "user.fields": userFields,

        //A comma separated list of Tweet fields to display.
        "list.fields": listFields,
        
        //A comma separated list of fields to expand
        expansions: expansions,
        asPaginator: true
      });
    return listData
}

//fetch lists data by list id
// Fetch Twitter users following a given user by user ID 
const fetch_twitter_list_by_list_id = async (id, listFields, userFields, expansions) => {
    const listData = await twitterBearer.v2.list(id, {
        //A comma separated list of User fields to display
        "user.fields": userFields,

        //A comma separated list of Tweet fields to display.
        "list.fields": listFields,
        
        //A comma separated list of fields to expand
        expansions: expansions,
        asPaginator: true
      });
    return listData
}

const processTwitterData = (data) => {
    return null
}

// Export the helper functions
module.exports = {
    fetch_twitter_user_by_handle,
    fetch_twitter_users_by_handles,
    fetch_twitter_user_by_id,
    fetch_twitter_users_by_ids,
    fetch_twitter_users_liked_tweets_by_id,
    fetch_twitter_followers_by_id,
    fetch_twitter_following_by_id,
    fetch_twitter_owned_lists_by_id,
    fetch_twitter_list_by_list_id
};