import { getBearerClient, resolveJarvisUserId } from "./xClient.js";

/**
 * Pull recent @lychee_data mentions and normalize for the Jarvis poll worker.
 * @param {{ since_id?: string, max_results?: number }} [opts]
 */
export async function fetchLycheeMentions({ since_id = "", max_results = 20 } = {}) {
  const userId = await resolveJarvisUserId();
  const api = getBearerClient().readOnly;

  const params = {
    max_results: Math.min(100, Math.max(5, max_results)),
    expansions: ["author_id", "referenced_tweets.id", "in_reply_to_user_id"],
    "tweet.fields": ["created_at", "author_id", "conversation_id", "entities", "referenced_tweets", "in_reply_to_user_id", "text"],
    "user.fields": ["username", "name"],
  };
  if (since_id) params.since_id = String(since_id);

  const timeline = await api.v2.userMentionTimeline(userId, params);
  const data = timeline?.data || timeline?._realData || {};
  const tweets = Array.isArray(data.data) ? data.data : [];
  const includes = data.includes || {};
  const usersById = new Map((includes.users || []).map((u) => [String(u.id), u]));
  const tweetsById = new Map((includes.tweets || []).map((t) => [String(t.id), t]));

  const mentions = tweets.map((t) => {
    const author = usersById.get(String(t.author_id)) || null;
    const refs = Array.isArray(t.referenced_tweets) ? t.referenced_tweets : [];
    const replied = refs.find((r) => r.type === "replied_to");
    const parent = replied ? tweetsById.get(String(replied.id)) : null;
    return {
      id: String(t.id),
      text: String(t.text || ""),
      author_id: String(t.author_id || ""),
      author_handle: author?.username || "",
      parent_text: parent?.text || "",
      parent_id: parent?.id ? String(parent.id) : "",
      created_at: t.created_at || null,
      conversation_id: t.conversation_id ? String(t.conversation_id) : "",
    };
  });

  // Newest first from API; process oldest-first so replies stay chronological.
  mentions.reverse();

  const newestId = tweets.length
    ? tweets.reduce((max, t) => (BigInt(t.id) > BigInt(max) ? String(t.id) : max), String(tweets[0].id))
    : since_id || "";

  return {
    user_id: userId,
    since_id: since_id || null,
    newest_id: newestId || null,
    count: mentions.length,
    mentions,
  };
}
