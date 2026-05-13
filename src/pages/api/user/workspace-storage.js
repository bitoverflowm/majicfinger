import mongoose from "mongoose";
import { getLoginSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import DataSet from "@/models/DataSets";
import { isOwnerFullAccessUser } from "@/lib/ownerFullAccess";
import {
  ELITE_WORKSPACE_CAP_BYTES,
  WORKSPACE_ASSUMED_BYTES_PER_ROW,
  userGetsWorkspaceQuotaMeter,
} from "@/lib/workspaceStorageQuota";

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function loadDbUser(session) {
  let dbUser = null;
  const uid = session.userId != null ? String(session.userId) : "";
  if (uid && mongoose.Types.ObjectId.isValid(uid)) {
    dbUser = await User.findById(uid).lean();
  }
  if (!dbUser && session.email) {
    const candidates = await User.find({
      email: { $regex: new RegExp(`^${escapeRegex(String(session.email).trim())}$`, "i") },
    }).limit(5).lean();
    if (candidates?.length) dbUser = candidates[0];
  }
  return dbUser;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  let session;
  try {
    session = await getLoginSession(req);
  } catch {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (!session?.userId || String(session.userId) === "dev-bypass-no-db") {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  await dbConnect();
  const dbUser = await loadDbUser(session);
  const payload = { ...session };
  if (dbUser) {
    payload.userId = String(dbUser._id);
    payload.lifetimeMember = !!dbUser.lifetimeMember;
    if (dbUser.subscriptionTier != null) payload.subscriptionTier = dbUser.subscriptionTier;
  }
  if (isOwnerFullAccessUser(payload)) {
    payload.lifetimeMember = true;
    payload.subscriptionTier = payload.subscriptionTier || "elite";
  }

  if (!userGetsWorkspaceQuotaMeter(payload)) {
    return res.status(200).json({ eligible: false });
  }

  const uid = payload.userId;
  if (!mongoose.Types.ObjectId.isValid(uid)) {
    return res.status(200).json({ eligible: false });
  }

  let usedBytes = 0;
  try {
    const agg = await DataSet.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(uid) } },
      { $group: { _id: null, totalBytes: { $sum: { $bsonSize: "$$ROOT" } } } },
    ]);
    usedBytes = Number(agg[0]?.totalBytes) || 0;
  } catch {
    usedBytes = 0;
  }

  return res.status(200).json({
    eligible: true,
    usedBytes,
    capBytes: ELITE_WORKSPACE_CAP_BYTES,
    assumedBytesPerRow: WORKSPACE_ASSUMED_BYTES_PER_ROW,
  });
}
