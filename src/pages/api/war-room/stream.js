import { rejectIfAnonymousRateLimited } from "@/lib/kalshiLive/anonymousIpRateLimit";
import { POLL_INTERVAL_MS, STREAM_HEARTBEAT_MS } from "@/lib/warRoom/constants";
import { deskAndMarketFromQuery } from "@/lib/warRoom/href";
import { getWarRoomSnapshot } from "@/lib/warRoom/serving";

/**
 * GET /api/war-room/stream
 * Prefer SSE when the runtime can keep the connection. Clients should fall back
 * to snapshot polling (5–10s) when the stream drops — Vercel serverless will.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (
    rejectIfAnonymousRateLimited(req, res, {
      keyPrefix: "war-room-stream",
      max: 20,
      windowMs: 60_000,
    })
  ) {
    return;
  }

  const { desk, market, fixture } = deskAndMarketFromQuery(req.query);
  const accept = String(req.headers.accept || "");
  const wantsSse = accept.includes("text/event-stream");

  const snapshot = await getWarRoomSnapshot({ desk, market, forceFixture: fixture });

  if (!wantsSse) {
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).json({
      transport: "poll",
      pollIntervalMs: snapshot.pollIntervalMs || POLL_INTERVAL_MS,
      snapshot,
    });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send("snapshot", snapshot);
  send("transport", { transport: "sse", pollIntervalMs: POLL_INTERVAL_MS });

  let lastCursor = snapshot.cursor;
  const heartbeat = setInterval(() => {
    send("heartbeat", { t: new Date().toISOString() });
  }, STREAM_HEARTBEAT_MS);

  const poll = setInterval(async () => {
    try {
      const next = await getWarRoomSnapshot({ desk, market, forceFixture: fixture });
      if (next.cursor !== lastCursor) {
        lastCursor = next.cursor;
        send("upsert", {
          asOf: next.asOf,
          cursor: next.cursor,
          feed: next.feed,
          features: next.features,
          freshness: next.freshness,
        });
      }
    } catch (err) {
      send("error", { message: err instanceof Error ? err.message : "snapshot failed" });
    }
  }, POLL_INTERVAL_MS);

  const close = () => {
    clearInterval(heartbeat);
    clearInterval(poll);
    try {
      res.end();
    } catch {
      /* already closed */
    }
  };

  req.on("close", close);
  req.on("aborted", close);
}
