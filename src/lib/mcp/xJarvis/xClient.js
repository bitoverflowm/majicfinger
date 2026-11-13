import { TwitterApi } from "twitter-api-v2";

/**
 * X / Twitter clients for @lychee_data Jarvis.
 *
 * Read (mentions): TWITTER_BEARER_TOKEN (app-only) is enough.
 * Write (replies): OAuth 1.0a user context for the @lychee_data account:
 *   TWITTER_API_KEY, TWITTER_API_KEY_SECRET,
 *   TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
 * (also accepts legacy misnamed TWITTER_OAUTH_2_CLIENT_ID / _SECRET as access token pair)
 */

function accessTokenPair() {
  const token =
    String(process.env.TWITTER_ACCESS_TOKEN || process.env.TWITTER_OAUTH_2_CLIENT_ID || "").trim();
  const secret =
    String(process.env.TWITTER_ACCESS_SECRET || process.env.TWITTER_OAUTH_2_CLIENT_SECRET || "").trim();
  return { token, secret };
}

export function xJarvisEnvStatus() {
  const { token, secret } = accessTokenPair();
  return {
    bearer: Boolean(String(process.env.TWITTER_BEARER_TOKEN || "").trim()),
    app_key: Boolean(String(process.env.TWITTER_API_KEY || "").trim()),
    app_secret: Boolean(String(process.env.TWITTER_API_KEY_SECRET || "").trim()),
    access_token: Boolean(token),
    access_secret: Boolean(secret),
    user_id: String(process.env.X_JARVIS_USER_ID || "").trim() || null,
    username: String(process.env.X_JARVIS_USERNAME || "lychee_data").trim(),
    live_flag: process.env.X_JARVIS_LIVE === "1",
    can_read_mentions: Boolean(String(process.env.TWITTER_BEARER_TOKEN || "").trim()),
    can_post_replies: Boolean(
      String(process.env.TWITTER_API_KEY || "").trim() &&
        String(process.env.TWITTER_API_KEY_SECRET || "").trim() &&
        token &&
        secret,
    ),
  };
}

export function getBearerClient() {
  const bearer = String(process.env.TWITTER_BEARER_TOKEN || "").trim();
  if (!bearer) throw new Error("TWITTER_BEARER_TOKEN missing — needed to read @lychee_data mentions");
  return new TwitterApi(bearer);
}

export function getUserClient() {
  const appKey = String(process.env.TWITTER_API_KEY || "").trim();
  const appSecret = String(process.env.TWITTER_API_KEY_SECRET || "").trim();
  const { token, secret } = accessTokenPair();
  if (!appKey || !appSecret || !token || !secret) {
    throw new Error(
      "Twitter user OAuth missing — set TWITTER_API_KEY, TWITTER_API_KEY_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET for @lychee_data posting",
    );
  }
  return new TwitterApi({
    appKey,
    appSecret,
    accessToken: token,
    accessSecret: secret,
  });
}

export async function resolveJarvisUserId() {
  const configured = String(process.env.X_JARVIS_USER_ID || "").trim();
  if (configured) return configured;
  const username = String(process.env.X_JARVIS_USERNAME || "lychee_data").trim().replace(/^@/, "");
  const api = getBearerClient().readOnly;
  const user = await api.v2.userByUsername(username, { "user.fields": ["id", "username"] });
  const id = user?.data?.id;
  if (!id) throw new Error(`Could not resolve X user id for @${username}`);
  return String(id);
}
