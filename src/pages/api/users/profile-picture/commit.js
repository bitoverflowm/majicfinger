import mongoose from "mongoose";
import { getLoginSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";

function isSafeProfileKey(key, userId) {
  const k = String(key || "").replace(/^\/+/, "");
  const uid = String(userId || "");
  if (!k || !uid) return false;
  if (k.includes("..")) return false;
  if (!k.startsWith(`profile-pictures/${uid}/`)) return false;
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  let session;
  try {
    session = await getLoginSession(req);
  } catch {
    session = null;
  }
  if (!session?.userId || String(session.userId) === "dev-bypass-no-db") {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  const uid = String(session.userId);
  if (!mongoose.Types.ObjectId.isValid(uid)) {
    return res.status(400).json({ success: false, message: "Invalid user" });
  }

  const { key, publicUrl } = req.body || {};
  if (!isSafeProfileKey(key, uid)) {
    return res.status(400).json({ success: false, message: "Invalid key (must be under profile-pictures/<uid>/...)." });
  }
  const url = String(publicUrl || "").trim();
  if (!/^https:\/\/.+/i.test(url)) {
    return res.status(400).json({ success: false, message: "Invalid publicUrl" });
  }

  await dbConnect();
  const user = await User.findByIdAndUpdate(
    uid,
    { $set: { profile_pic: url } },
    { new: true, runValidators: true },
  );
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  return res.status(200).json({ success: true, data: { profile_pic: user.profile_pic } });
}

