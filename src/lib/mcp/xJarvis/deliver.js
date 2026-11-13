import { getUserClient, xJarvisEnvStatus } from "./xClient.js";

/**
 * Post a public reply as @lychee_data.
 * @param {{ in_reply_to_tweet_id: string, text: string }} args
 */
export async function postPublicReply({ in_reply_to_tweet_id, text }) {
  const status = xJarvisEnvStatus();
  if (!status.can_post_replies) {
    const err = new Error("Cannot post — JARVIS_TWITTER_* OAuth is not configured");
    err.code = "X_POST_NOT_CONFIGURED";
    throw err;
  }
  const tweetId = String(in_reply_to_tweet_id || "").trim();
  const body = String(text || "").trim().slice(0, 4000);
  if (!tweetId) throw new Error("in_reply_to_tweet_id required");
  if (!body) throw new Error("reply text required");

  const client = getUserClient().readWrite;
  const res = await client.v2.reply(body, tweetId);
  const id = res?.data?.id ? String(res.data.id) : "";
  if (!id) throw new Error("X reply returned no id");
  return {
    reply_tweet_id: id,
    url: `https://x.com/i/status/${id}`,
  };
}
