/**
 * X / Twitter clients for @lychee_news (separate from Jarvis / @lychee_data).
 *
 * Portal → Apps → Keys and tokens → OAuth 1.0a map like Jarvis:
 *   Bearer Token              → NEWS_TWITTER_BEARER_TOKEN
 *   Consumer Key / API Key    → NEWS_TWITTER_API_KEY
 *   Consumer Secret           → NEWS_TWITTER_API_KEY_SECRET
 *   Access Token              → NEWS_TWITTER_ACCESS_TOKEN
 *   Access Token Secret       → NEWS_TWITTER_ACCESS_SECRET
 *
 * Access Token owner = who posts. Set X_NEWS_USERNAME to that account.
 *
 * Live posting is triple-gated (all must pass):
 *   1. X_NEWS_KILL_SWITCH=0   (defaults ON / blocking — omit or any value other than "0")
 *   2. X_NEWS_LIVE=1
 *   3. X_NEWS_ALLOW_LYCHEE_NEWS=1 when username is lychee_news (warmup unlock; LN-7)
 *
 * Dry-run never needs credentials. twitter-api-v2 is loaded only when a client is built.
 */

async function loadTwitterApi() {
  const mod = await import("twitter-api-v2");
  return mod.TwitterApi || mod.default?.TwitterApi || mod.default;
}

function env(...names) {
  for (const name of names) {
    const v = String(process.env[name] || "").trim();
    if (v) return v;
  }
  return "";
}

function accessTokenPair() {
  return {
    token: env("NEWS_TWITTER_ACCESS_TOKEN"),
    secret: env("NEWS_TWITTER_ACCESS_SECRET", "NEWS_TWITTER_ACCESS_TOKEN_SECRET"),
  };
}

function consumerPair() {
  return {
    key: env("NEWS_TWITTER_API_KEY", "NEWS_TWITTER_CONSUMER_KEY"),
    secret: env("NEWS_TWITTER_API_KEY_SECRET", "NEWS_TWITTER_CONSUMER_SECRET"),
  };
}

export function xNewsUsername() {
  return (env("X_NEWS_USERNAME") || "lychee_news").replace(/^@/, "").toLowerCase();
}

/** Kill-switch defaults ON (blocking). Only X_NEWS_KILL_SWITCH=0 opens the gate. */
export function xNewsKillSwitchOn() {
  return process.env.X_NEWS_KILL_SWITCH !== "0";
}

/**
 * Why live create-tweet is refused. Dry-run ignores this.
 * @returns {{ allowed: boolean, reasons: string[] }}
 */
export function xNewsLiveGate() {
  const reasons = [];
  if (xNewsKillSwitchOn()) reasons.push("kill_switch");
  if (process.env.X_NEWS_LIVE !== "1") reasons.push("live_flag_off");
  const username = xNewsUsername();
  if (/^lychee_news$/i.test(username) && process.env.X_NEWS_ALLOW_LYCHEE_NEWS !== "1") {
    reasons.push("lychee_news_warmup");
  }
  const { token, secret } = accessTokenPair();
  const { key, secret: appSecret } = consumerPair();
  if (!(key && appSecret && token && secret)) reasons.push("oauth_missing");
  return { allowed: reasons.length === 0, reasons, username };
}

export function xNewsEnvStatus() {
  const { token, secret } = accessTokenPair();
  const { key, secret: appSecret } = consumerPair();
  const bearer = env("NEWS_TWITTER_BEARER_TOKEN");
  const gate = xNewsLiveGate();
  return {
    bearer: Boolean(bearer),
    app_key: Boolean(key),
    app_secret: Boolean(appSecret),
    access_token: Boolean(token),
    access_secret: Boolean(secret),
    user_id: env("X_NEWS_USER_ID") || null,
    username: xNewsUsername(),
    kill_switch: xNewsKillSwitchOn(),
    live_flag: process.env.X_NEWS_LIVE === "1",
    allow_lychee_news: process.env.X_NEWS_ALLOW_LYCHEE_NEWS === "1",
    dry_run_default: true,
    can_post: gate.allowed,
    gate_reasons: gate.reasons,
    note:
      "Dry-run by default. Live create-tweet requires X_NEWS_KILL_SWITCH=0, X_NEWS_LIVE=1, OAuth, X_NEWS_ALLOW_LYCHEE_NEWS=1 for @lychee_news (warmup), and a live_since watermark so /news history is never dumped to X.",
  };
}

export async function getNewsBearerClient() {
  const bearer = env("NEWS_TWITTER_BEARER_TOKEN");
  if (!bearer) {
    throw new Error("NEWS_TWITTER_BEARER_TOKEN missing — Apps → Keys and tokens → Bearer Token");
  }
  const TwitterApi = await loadTwitterApi();
  return new TwitterApi(bearer);
}

export async function getNewsUserClient() {
  const { key, secret: appSecret } = consumerPair();
  const { token, secret } = accessTokenPair();
  if (!key || !appSecret || !token || !secret) {
    throw new Error(
      "News Twitter OAuth missing — set NEWS_TWITTER_API_KEY, NEWS_TWITTER_API_KEY_SECRET, NEWS_TWITTER_ACCESS_TOKEN, NEWS_TWITTER_ACCESS_SECRET",
    );
  }
  const TwitterApi = await loadTwitterApi();
  return new TwitterApi({
    appKey: key,
    appSecret,
    accessToken: token,
    accessSecret: secret,
  });
}
