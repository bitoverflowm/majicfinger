/**
 * Vercel Cron sends Authorization: Bearer ${CRON_SECRET} (auto-injected)
 * and usually x-vercel-cron: 1. Manual ticks use X_JARVIS_CRON_SECRET.
 * Accept either secret — preferring only X_JARVIS_CRON_SECRET 401s the
 * platform cron when both env vars are set and the header is stripped
 * (deployment-host invocations).
 */

function secrets() {
  return [...new Set(
    [process.env.X_JARVIS_CRON_SECRET, process.env.CRON_SECRET]
      .map((s) => String(s || "").trim())
      .filter(Boolean),
  )];
}

function bearerMatches(auth, secret) {
  return auth === `Bearer ${secret}` || auth === `bearer ${secret}`;
}

export function authorizeJarvisCron(req) {
  const auth = String(req.headers?.authorization || "");
  const vercelCron = String(req.headers?.["x-vercel-cron"] || "") === "1";
  const ua = String(req.headers?.["user-agent"] || "");
  const vercelUa = /^vercel-cron\//i.test(ua);
  const known = secrets();
  const bearerOk = known.some((s) => bearerMatches(auth, s));
  const host = String(req.headers?.host || "");
  const vercelDeploymentHost = /\.vercel\.app$/i.test(host);
  // Platform cron hits the hashed deployment host; SSO/protection sometimes
  // strips x-vercel-cron. Trust that UA only on *.vercel.app, not the public domain.
  const platformCron = vercelUa && vercelDeploymentHost;
  return {
    ok: vercelCron || bearerOk || platformCron,
    vercelCron,
    bearerOk,
    vercelUa,
    platformCron,
    hasSecret: known.length > 0,
    host,
  };
}
