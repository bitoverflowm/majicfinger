const MAX_BYTES = 4_000_000;

/** Image hosts that market icons and trader avatars come from. Anything else is refused. */
function allowedHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return (
    host === "polymarket-upload.s3.us-east-2.amazonaws.com" ||
    host === "polymarket.com" ||
    host.endsWith(".polymarket.com") ||
    host === "kalshi.com" ||
    host.endsWith(".kalshi.com") ||
    host === "pbs.twimg.com"
  );
}

/**
 * Same-origin copy of a market icon or avatar, so share cards can be turned into images
 * (the browser won't let a canvas read cross-origin pictures).
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  let url;
  try {
    url = new URL(String(req.query.url || ""));
  } catch {
    return res.status(400).end();
  }
  if (url.protocol !== "https:" || !allowedHost(url.hostname)) return res.status(400).end();

  try {
    const upstream = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(8000) });
    const type = upstream.headers.get("content-type") || "";
    if (!upstream.ok || !/^image\/(png|jpe?g|webp|gif|avif|svg\+xml)/.test(type)) return res.status(404).end();
    const body = Buffer.from(await upstream.arrayBuffer());
    if (body.length > MAX_BYTES) return res.status(413).end();
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (type.startsWith("image/svg")) res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
    return res.status(200).send(body);
  } catch {
    return res.status(502).end();
  }
}
