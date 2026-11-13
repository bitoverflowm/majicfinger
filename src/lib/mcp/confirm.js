import dbConnect from "@/lib/dbConnect";
import McpDelegation from "@/models/McpDelegation";
import McpPendingConfirmation from "@/models/McpPendingConfirmation";
import { MCP_ACTION_CLASSES, MCP_CONFIRM_CREDIT_THRESHOLD, mcpOrigin } from "@/lib/mcp/config";
import { randomToken } from "@/lib/mcp/crypto";

export function actionNeedsConfirm(actionClass, creditQuote) {
  if (!actionClass) return false;
  if (
    actionClass === MCP_ACTION_CLASSES.publish ||
    actionClass === MCP_ACTION_CLASSES.delete ||
    actionClass === MCP_ACTION_CLASSES.materialize ||
    actionClass === MCP_ACTION_CLASSES.export
  ) {
    return true;
  }
  return Number(creditQuote) >= MCP_CONFIRM_CREDIT_THRESHOLD;
}

export async function hasDelegation(userId, actionClass) {
  await dbConnect();
  const row = await McpDelegation.findOne({
    user_id: String(userId),
    action_class: String(actionClass),
    revoked_at: null,
  }).lean();
  return !!row;
}

export async function setDelegation(userId, actionClass, enabled) {
  await dbConnect();
  if (enabled) {
    await McpDelegation.findOneAndUpdate(
      { user_id: String(userId), action_class: String(actionClass) },
      { $set: { revoked_at: null } },
      { upsert: true },
    );
  } else {
    await McpDelegation.updateOne(
      { user_id: String(userId), action_class: String(actionClass) },
      { $set: { revoked_at: new Date() } },
    );
  }
}

export async function listDelegations(userId) {
  await dbConnect();
  return McpDelegation.find({ user_id: String(userId), revoked_at: null }).lean();
}

/**
 * If confirmation is required and not delegated, create a pending approval and return a tool payload.
 * Pass confirmation_token from a prior approval to proceed.
 */
export async function gateConfirmation({
  userId,
  tool,
  actionClass,
  args,
  creditQuote,
  summary,
  confirmationToken = "",
}) {
  if (!actionNeedsConfirm(actionClass, creditQuote)) {
    return { required: false };
  }
  if (await hasDelegation(userId, actionClass)) {
    return { required: false, delegated: true };
  }

  await dbConnect();

  if (confirmationToken) {
    const pending = await McpPendingConfirmation.findOne({
      token: String(confirmationToken),
      user_id: String(userId),
    });
    if (!pending || pending.status !== "approved" || pending.expires_at.getTime() < Date.now()) {
      return {
        required: true,
        blocked: true,
        payload: {
          status: "confirmation_invalid",
          message: "That confirmation token is invalid or expired. Request the action again.",
        },
      };
    }
    if (pending.tool !== tool) {
      return {
        required: true,
        blocked: true,
        payload: {
          status: "confirmation_mismatch",
          message: "Confirmation was for a different tool.",
        },
      };
    }
    if (pending.allow_forever) {
      await setDelegation(userId, actionClass, true);
    }
    pending.status = "expired";
    pending.resolved_at = new Date();
    await pending.save();
    return { required: false, confirmed: true };
  }

  const token = randomToken(18);
  await McpPendingConfirmation.create({
    token,
    user_id: String(userId),
    action_class: actionClass,
    tool,
    args: args || null,
    credit_quote: creditQuote,
    summary: String(summary || "").slice(0, 500),
    status: "pending",
    expires_at: new Date(Date.now() + 30 * 60 * 1000),
  });

  const approveUrl = `${mcpOrigin()}/mcp/approve/${token}`;
  return {
    required: true,
    blocked: true,
    payload: {
      status: "needs_confirmation",
      message:
        "This action needs your approval (publish / large pull / expensive materialize). In chat, say \"approve\" (or \"always allow\") and I will call approve_pending — or open the Lychee link.",
      approve_url: approveUrl,
      confirmation_token: token,
      action_class: actionClass,
      credit_quote: creditQuote,
      summary,
      chat_approve: {
        say: "approve",
        tool: "approve_pending",
        always_allow_say: "always allow",
        deny_say: "deny",
      },
      next_step:
        "Preferred: user says approve → call approve_pending (no token needed; uses latest pending), then retry this tool with confirmation_token. Or open approve_url.",
    },
  };
}

/** Latest open confirmation for chat-side approve / deny. */
export async function getLatestPendingConfirmation(userId) {
  await dbConnect();
  return McpPendingConfirmation.findOne({
    user_id: String(userId),
    status: "pending",
    expires_at: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();
}

export async function listPendingConfirmations(userId, { limit = 5 } = {}) {
  await dbConnect();
  return McpPendingConfirmation.find({
    user_id: String(userId),
    status: "pending",
    expires_at: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(20, Math.max(1, limit)))
    .lean();
}

export async function getPendingConfirmation(token) {
  await dbConnect();
  return McpPendingConfirmation.findOne({ token: String(token || "") }).lean();
}

export async function resolvePendingConfirmation(token, userId, { approve, allowForever = false }) {
  await dbConnect();
  const pending = await McpPendingConfirmation.findOne({ token: String(token || "") });
  if (!pending || String(pending.user_id) !== String(userId)) {
    const err = new Error("Confirmation not found");
    err.status = 404;
    throw err;
  }
  if (pending.status !== "pending" || pending.expires_at.getTime() < Date.now()) {
    const err = new Error("Confirmation expired");
    err.status = 410;
    throw err;
  }
  pending.status = approve ? "approved" : "denied";
  pending.resolved_at = new Date();
  pending.allow_forever = !!(approve && allowForever);
  await pending.save();
  if (approve && allowForever) {
    await setDelegation(userId, pending.action_class, true);
  }
  return pending.toObject();
}
