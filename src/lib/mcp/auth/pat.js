import dbConnect from "@/lib/dbConnect";
import McpPersonalAccessToken from "@/models/McpPersonalAccessToken";
import { PAT_PREFIX } from "@/lib/mcp/config";
import { randomToken, sha256Hex, timingSafeEqualHex } from "@/lib/mcp/crypto";

export function isPatToken(token) {
  return String(token || "").startsWith(PAT_PREFIX);
}

export async function createPersonalAccessToken(userId, { label = "default" } = {}) {
  await dbConnect();
  const secret = randomToken(32);
  const token = `${PAT_PREFIX}${secret}`;
  const token_hash = sha256Hex(token);
  const token_prefix = token.slice(0, 16);

  await McpPersonalAccessToken.findOneAndUpdate(
    { user_id: String(userId) },
    {
      $set: {
        token_hash,
        token_prefix,
        label: String(label || "default").slice(0, 80),
        revoked_at: null,
        last_used_at: null,
      },
    },
    { upsert: true, new: true },
  );

  return { token, token_prefix, label };
}

export async function revokePersonalAccessToken(userId) {
  await dbConnect();
  await McpPersonalAccessToken.updateOne(
    { user_id: String(userId) },
    { $set: { revoked_at: new Date(), token_hash: sha256Hex(`revoked:${Date.now()}:${randomToken(8)}`) } },
  );
}

export async function getPatMetadata(userId) {
  await dbConnect();
  return McpPersonalAccessToken.findOne({ user_id: String(userId) })
    .select("token_prefix label last_used_at revoked_at createdAt updatedAt")
    .lean();
}

export async function resolvePatActor(token) {
  if (!isPatToken(token)) return null;
  await dbConnect();
  const hash = sha256Hex(token);
  const match = await McpPersonalAccessToken.findOne({ token_hash: hash, revoked_at: null })
    .select("+token_hash user_id")
    .lean();
  if (!match?.token_hash || !timingSafeEqualHex(match.token_hash, hash)) return null;
  await McpPersonalAccessToken.updateOne({ _id: match._id }, { $set: { last_used_at: new Date() } });
  return { userId: String(match.user_id), authKind: "pat", clientId: "pat" };
}
