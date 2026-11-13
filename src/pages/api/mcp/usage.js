import { ensureCreditAccount, getCreditSnapshot, recentLedger } from "@/lib/mcp/credits";
import { recentAudit } from "@/lib/mcp/audit";
import { listDelegations, setDelegation } from "@/lib/mcp/confirm";
import { mcpResourceUrl } from "@/lib/mcp/config";
import { requireMcpConsole } from "@/lib/mcp/requireConsole";

export default async function handler(req, res) {
  const member = await requireMcpConsole(req, res);
  if (!member) return;
  const session = member.session;

  if (req.method === "GET") {
    await ensureCreditAccount(session.userId);
    const [usage, ledger, audit, delegations] = await Promise.all([
      getCreditSnapshot(session.userId),
      recentLedger(session.userId, 40),
      recentAudit(session.userId, 40),
      listDelegations(session.userId),
    ]);
    return res.status(200).json({
      success: true,
      data: {
        resource: mcpResourceUrl(),
        usage,
        ledger,
        audit,
        delegations: delegations.map((d) => d.action_class),
      },
    });
  }

  if (req.method === "POST") {
    const actionClass = String(req.body?.action_class || "").trim();
    const enabled = !!req.body?.enabled;
    if (!actionClass) return res.status(400).json({ success: false, message: "action_class required" });
    await setDelegation(session.userId, actionClass, enabled);
    const delegations = await listDelegations(session.userId);
    return res.status(200).json({ success: true, data: { delegations: delegations.map((d) => d.action_class) } });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ success: false, message: "Method not allowed" });
}
