import { runXJarvisJob } from "@/lib/mcp/xJarvis/runJob";
import { parseMentionIntent } from "@/lib/mcp/xJarvis/intent";

/**
 * POST { text, parent_text?, author_handle?, deliver? }
 * Returns intent + draft reply without posting to X.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "POST only" });
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ success: false, message: "text required" });

  try {
    const intent = parseMentionIntent({
      text,
      parent_text: req.body?.parent_text || "",
      author_handle: req.body?.author_handle || "",
      deliver_default: req.body?.deliver || "public_reply",
    });
    const skipLive = req.body?.intent_only === true;
    if (skipLive) {
      return res.status(200).json({ success: true, data: { intent, status: "intent_only" } });
    }
    const result = await runXJarvisJob({
      text,
      parent_text: req.body?.parent_text || "",
      author_handle: req.body?.author_handle || "",
      deliver_default: req.body?.deliver || "public_reply",
      live: false,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || "dry-run failed" });
  }
}
