import { getLoginSession } from "@/lib/auth";
import {
  createPersonalAccessToken,
  getPatMetadata,
  revokePersonalAccessToken,
} from "@/lib/mcp/auth/pat";
import { ensureCreditAccount, getCreditSnapshot } from "@/lib/mcp/credits";

export default async function handler(req, res) {
  let session;
  try {
    session = await getLoginSession(req);
  } catch {
    session = null;
  }
  if (!session?.userId) return res.status(401).json({ success: false, message: "Unauthorized" });

  if (req.method === "GET") {
    const [meta, usage] = await Promise.all([
      getPatMetadata(session.userId),
      ensureCreditAccount(session.userId).then(() => getCreditSnapshot(session.userId)),
    ]);
    return res.status(200).json({
      success: true,
      data: {
        token: meta && !meta.revoked_at
          ? {
              prefix: meta.token_prefix,
              label: meta.label,
              last_used_at: meta.last_used_at,
              created_at: meta.createdAt,
            }
          : null,
        usage,
      },
    });
  }

  if (req.method === "POST") {
    const label = req.body?.label;
    const created = await createPersonalAccessToken(session.userId, { label });
    await ensureCreditAccount(session.userId);
    return res.status(201).json({
      success: true,
      data: {
        token: created.token,
        prefix: created.token_prefix,
        label: created.label,
        warning: "Copy this token now. Lychee will not show it again.",
      },
    });
  }

  if (req.method === "DELETE") {
    await revokePersonalAccessToken(session.userId);
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ success: false, message: "Method not allowed" });
}
