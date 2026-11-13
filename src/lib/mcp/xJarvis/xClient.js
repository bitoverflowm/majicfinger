import { TwitterApi } from "twitter-api-v2";

/**
 * X / Twitter clients for Jarvis (separate from the existing TWITTER_* Lychee app).
 *
 * Portal labels (Apps → Keys and tokens → OAuth 1.0a) map like this:
 *   Bearer Token              → JARVIS_TWITTER_BEARER_TOKEN
 *   Consumer Key / API Key    → JARVIS_TWITTER_API_KEY
 *   Consumer Secret           → JARVIS_TWITTER_API_KEY_SECRET   (Reveal / Regenerate)
 *   Access Token              → JARVIS_TWITTER_ACCESS_TOKEN
 *   Access Token Secret       → JARVIS_TWITTER_ACCESS_SECRET   (Reveal / Regenerate)
 *
 * Consumer Secret and Access Token Secret are the two "hidden" fields — they are
 * not named "API Key" in the new portal. Click the eye / Regenerate if blank.
 *
 * Access Token owner = who posts. Set X_JARVIS_USERNAME to that account.
 */

function env(...names) {
  for (const name of names) {
    const v = String(process.env[name] || "").trim();
    if (v) return v;
  }
  return "";
}

function accessTokenPair() {
  return {
    token: env("JARVIS_TWITTER_ACCESS_TOKEN"),
    secret: env("JARVIS_TWITTER_ACCESS_SECRET", "JARVIS_TWITTER_ACCESS_TOKEN_SECRET"),
  };
}

function consumerPair() {
  return {
    key: env("JARVIS_TWITTER_API_KEY", "JARVIS_TWITTER_CONSUMER_KEY"),
    secret: env("JARVIS_TWITTER_API_KEY_SECRET", "JARVIS_TWITTER_CONSUMER_SECRET"),
  };
}

export function xJarvisEnvStatus() {
  const { token, secret } = accessTokenPair();
  const { key, secret: appSecret } = consumerPair();
  const bearer = env("JARVIS_TWITTER_BEARER_TOKEN");
  return {
    bearer: Boolean(bearer),
    app_key: Boolean(key),
    app_secret: Boolean(appSecret),
    access_token: Boolean(token),
    access_secret: Boolean(secret),
    user_id: env("X_JARVIS_USER_ID") || null,
    username: env("X_JARVIS_USERNAME") || "lychee_data",
    live_flag: process.env.X_JARVIS_LIVE === "1",
    can_read_mentions: Boolean(bearer),
    can_post_replies: Boolean(key && appSecret && token && secret),
  };
}

export function getBearerClient() {
  const bearer = env("JARVIS_TWITTER_BEARER_TOKEN");
  if (!bearer) {
    throw new Error(
      "JARVIS_TWITTER_BEARER_TOKEN missing — Apps → Keys and tokens → Bearer Token",
    );
  }
  return new TwitterApi(bearer);
}

export function getUserClient() {
  const { key, secret: appSecret } = consumerPair();
  const { token, secret } = accessTokenPair();
  if (!key || !appSecret || !token || !secret) {
    throw new Error(
      "Jarvis Twitter OAuth missing — set JARVIS_TWITTER_API_KEY (Consumer Key), JARVIS_TWITTER_API_KEY_SECRET (Consumer Secret), JARVIS_TWITTER_ACCESS_TOKEN, JARVIS_TWITTER_ACCESS_SECRET (Access Token Secret)",
    );
  }
  return new TwitterApi({
    appKey: key,
    appSecret,
    accessToken: token,
    accessSecret: secret,
  });
}

export async function resolveJarvisUserId() {
  const configured = env("X_JARVIS_USER_ID");
  if (configured) return configured;
  const username = (env("X_JARVIS_USERNAME") || "lychee_data").replace(/^@/, "");
  const api = getBearerClient().readOnly;
  const user = await api.v2.userByUsername(username, { "user.fields": ["id", "username"] });
  const id = user?.data?.id;
  if (!id) throw new Error(`Could not resolve X user id for @${username}`);
  return String(id);
}
