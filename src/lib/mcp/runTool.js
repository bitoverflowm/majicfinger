import { recordMcpAudit } from "@/lib/mcp/audit";
import { chargeCredits, quoteCredits } from "@/lib/mcp/credits";
import { gateConfirmation } from "@/lib/mcp/confirm";
import { textResult } from "@/lib/mcp/toolResult";

/**
 * Shared wrapper: confirm gate → credit charge → handler → audit.
 */
export async function runMcpTool(actor, {
  tool,
  actionClass,
  args,
  rows = 0,
  summary = "",
  confirmationToken = "",
  handler,
}) {
  const creditQuote = quoteCredits(actionClass, { rows });
  const gate = await gateConfirmation({
    userId: actor.userId,
    tool,
    actionClass,
    args,
    creditQuote,
    summary: summary || `${tool} (${actionClass})`,
    confirmationToken,
  });
  if (gate.blocked) {
    await recordMcpAudit({
      userId: actor.userId,
      tool,
      actionClass,
      credits: 0,
      ok: true,
      args,
      client: actor.clientId,
      authKind: actor.authKind,
    });
    return textResult(gate.payload);
  }

  const charged = await chargeCredits(actor.userId, creditQuote, {
    reason: "tool",
    tool,
    actionClass,
    meta: { rows },
  });
  if (!charged.ok) {
    await recordMcpAudit({
      userId: actor.userId,
      tool,
      actionClass,
      credits: 0,
      ok: false,
      error: charged.message,
      args,
      client: actor.clientId,
      authKind: actor.authKind,
    });
    return textResult(
      {
        status: "credits_exhausted",
        message: charged.message,
        usage: charged.snapshot,
        upgrade_hint: "Open https://lycheedata.com/mcp to upgrade or top up credits.",
      },
      { isError: true },
    );
  }

  try {
    const result = await handler({ credits: charged });
    await recordMcpAudit({
      userId: actor.userId,
      tool,
      actionClass,
      credits: charged.charged,
      ok: true,
      args,
      client: actor.clientId,
      authKind: actor.authKind,
    });
    return textResult({
      ...result,
      usage: charged.snapshot,
      credits_charged: charged.charged,
    });
  } catch (err) {
    await recordMcpAudit({
      userId: actor.userId,
      tool,
      actionClass,
      credits: charged.charged,
      ok: false,
      error: err?.message || String(err),
      args,
      client: actor.clientId,
      authKind: actor.authKind,
    });
    return textResult(
      {
        status: "error",
        message: err?.message || "Tool failed",
        usage: charged.snapshot,
      },
      { isError: true },
    );
  }
}
