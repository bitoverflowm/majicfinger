/**
 * Browser: gzip large JSON payloads so they fit under Vercel's ~4.5MB serverless body cap.
 * Uncompressed JSON can still be up to ~16MB locally; production rejects before the handler runs.
 */
const VERCEL_SAFE_SEND_THRESHOLD_BYTES = 3_500_000;

/**
 * @param {unknown} payload
 * @returns {Promise<{ body: string | Uint8Array; headers: Record<string, string> }>}
 */
export async function prepareLargeJsonBody(payload) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  if (
    bytes.byteLength <= VERCEL_SAFE_SEND_THRESHOLD_BYTES ||
    typeof CompressionStream === "undefined"
  ) {
    return {
      body: json,
      headers: { "Content-Type": "application/json" },
    };
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  return {
    body: compressed,
    headers: {
      "Content-Type": "application/json",
      "Content-Encoding": "gzip",
    },
  };
}
