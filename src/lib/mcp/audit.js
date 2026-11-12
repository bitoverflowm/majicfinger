import dbConnect from "@/lib/dbConnect";
import McpAuditEvent from "@/models/McpAuditEvent";
import { notifyBillingEvent } from "@/lib/telegram/billingAlert";

function summarizeArgs(args) {
  try {
    const raw = JSON.stringify(args ?? {});
    return raw.length > 480 ? `${raw.slice(0, 480)}…` : raw;
  } catch {
    return "";
  }
}

export async function recordMcpAudit({
  userId,
  tool,
  actionClass = "",
  credits = 0,
  ok = true,
  error = "",
  args = null,
  client = "",
  authKind = "",
}) {
  try {
    await dbConnect();
    await McpAuditEvent.create({
      user_id: String(userId),
      tool: String(tool || "").slice(0, 120),
      class: String(actionClass || "").slice(0, 40),
      credits: Number(credits) || 0,
      ok: !!ok,
      error: String(error || "").slice(0, 500),
      arg_summary: summarizeArgs(args),
      client: String(client || "").slice(0, 80),
      auth_kind: String(authKind || "").slice(0, 40),
    });
  } catch (err) {
    console.error("[mcp] audit write failed", err?.message || err);
  }

  // High-cost or failed materialize/publish → Telegram (reuses billing notifier).
  const expensive = Number(credits) >= 40 || actionClass === "materialize" || actionClass === "publish";
  if (expensive || !ok) {
    notifyBillingEvent({
      title: ok ? `MCP ${tool}` : `MCP failed: ${tool}`,
      fields: {
        user_id: String(userId),
        tool,
        class: actionClass,
        credits,
        ok,
        error: error || undefined,
        client: client || undefined,
      },
    }).catch(() => {});
  }
}

export async function recentAudit(userId, limit = 40) {
  await dbConnect();
  return McpAuditEvent.find({ user_id: String(userId) })
    .sort({ createdAt: -1 })
    .limit(Math.min(100, Math.max(1, limit)))
    .lean();
}
