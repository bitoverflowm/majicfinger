import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import { resolvePatActor } from "@/lib/mcp/auth/pat";
import { resolveOAuthActor } from "@/lib/mcp/auth/oauth";
import { ensureCreditAccount } from "@/lib/mcp/credits";
import { isOwnerFullAccessUser } from "@/lib/ownerFullAccess";
import { userHasDashboardAccess } from "@/lib/membershipAccess";

export function bearerFromRequest(request) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : "";
}

/**
 * @returns {Promise<null | {
 *   userId: string,
 *   user: object,
 *   authKind: string,
 *   clientId: string,
 *   isOwner: boolean,
 *   hasMembership: boolean,
 * }>}
 */
export async function resolveMcpActor(request) {
  const token = bearerFromRequest(request);
  if (!token) return null;

  const base = (await resolvePatActor(token)) || (await resolveOAuthActor(token));
  if (!base?.userId) return null;

  await dbConnect();
  const user = await User.findById(base.userId).lean();
  if (!user) return null;

  await ensureCreditAccount(base.userId);

  return {
    userId: String(user._id),
    user,
    authKind: base.authKind,
    clientId: base.clientId || "",
    isOwner: isOwnerFullAccessUser(user),
    hasMembership: userHasDashboardAccess(user),
  };
}
