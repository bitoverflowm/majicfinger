import test from "node:test";
import assert from "node:assert/strict";
import { authorizeJarvisCron } from "./cronAuth.js";

test("accepts Vercel CRON_SECRET even when X_JARVIS_CRON_SECRET is also set", () => {
  const prevJ = process.env.X_JARVIS_CRON_SECRET;
  const prevC = process.env.CRON_SECRET;
  process.env.X_JARVIS_CRON_SECRET = "jarvis-secret";
  process.env.CRON_SECRET = "vercel-auto";
  try {
    const vercel = authorizeJarvisCron({
      headers: { authorization: "Bearer vercel-auto", host: "majicfinger-hash-team.vercel.app" },
    });
    assert.equal(vercel.ok, true);
    assert.equal(vercel.bearerOk, true);
    const manual = authorizeJarvisCron({
      headers: { authorization: "Bearer jarvis-secret" },
    });
    assert.equal(manual.ok, true);
    const header = authorizeJarvisCron({
      headers: { "x-vercel-cron": "1" },
    });
    assert.equal(header.ok, true);
    const nope = authorizeJarvisCron({
      headers: { authorization: "Bearer other", "user-agent": "vercel-cron/1.0", host: "lycheedata.com" },
    });
    assert.equal(nope.ok, false);
    const platform = authorizeJarvisCron({
      headers: {
        "user-agent": "vercel-cron/1.0",
        host: "majicfinger-50023wf6o-bitoverflowadmin.vercel.app",
      },
    });
    assert.equal(platform.ok, true);
  } finally {
    process.env.X_JARVIS_CRON_SECRET = prevJ;
    process.env.CRON_SECRET = prevC;
  }
});
