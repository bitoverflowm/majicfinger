/**
 * Journey + Telegram analytics run in production deploys only.
 * Local `npm run dev` must not write sessions or send alerts.
 */
export function isProdAnalyticsEnabled() {
  return process.env.NODE_ENV === "production";
}
