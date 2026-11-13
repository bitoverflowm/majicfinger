import { loadSessionMember } from "@/lib/requirePaidMember";
import {
  MCP_DOCS_FORBIDDEN,
  MCP_DOCS_FORBIDDEN_MESSAGE,
  userCanAccessMcpDocs,
} from "@/lib/mcp/access";

export async function requireMcpConsole(req, res) {
  let member;
  try {
    member = await loadSessionMember(req);
  } catch {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  if (!member?.session?.userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  if (!userCanAccessMcpDocs(member.user)) {
    res.status(403).json({
      success: false,
      code: MCP_DOCS_FORBIDDEN,
      message: MCP_DOCS_FORBIDDEN_MESSAGE,
    });
    return null;
  }
  return member;
}
