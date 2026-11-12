import { getLoginSession } from "@/lib/auth";
import { getPendingConfirmation, resolvePendingConfirmation } from "@/lib/mcp/confirm";

export default async function handler(req, res) {
  const token = String(req.query.token || "").trim();
  if (!token) return res.status(400).json({ success: false, message: "Missing token" });

  let session;
  try {
    session = await getLoginSession(req);
  } catch {
    session = null;
  }

  if (req.method === "GET") {
    const pending = await getPendingConfirmation(token);
    if (!pending) return res.status(404).json({ success: false, message: "Not found" });
    return res.status(200).json({
      success: true,
      data: {
        token: pending.token,
        tool: pending.tool,
        action_class: pending.action_class,
        summary: pending.summary,
        credit_quote: pending.credit_quote,
        status: pending.status,
        expires_at: pending.expires_at,
        owned_by_viewer: session?.userId ? String(session.userId) === String(pending.user_id) : false,
      },
    });
  }

  if (req.method === "POST") {
    if (!session?.userId) return res.status(401).json({ success: false, message: "Sign in first" });
    try {
      const pending = await resolvePendingConfirmation(token, session.userId, {
        approve: !!req.body?.approve,
        allowForever: !!req.body?.allow_forever,
      });
      return res.status(200).json({ success: true, data: pending });
    } catch (err) {
      return res.status(err?.status || 400).json({ success: false, message: err?.message || "Failed" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ success: false, message: "Method not allowed" });
}
