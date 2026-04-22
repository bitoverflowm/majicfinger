import mongoose from "mongoose";
import { getLoginSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function user(req, res) {
  let session;
  try {
    session = await getLoginSession(req);
  } catch {
    return res.status(200).json({ user: null });
  }

  if (!session) {
    return res.status(200).json({ user: null });
  }
  if (String(session?.userId || "") === "dev-bypass-no-db") {
    return res.status(200).json({ user: session });
  }

  try {
    await dbConnect();

    let dbUser = null;
    const uid = session.userId != null ? String(session.userId) : "";

    if (uid && mongoose.Types.ObjectId.isValid(uid)) {
      dbUser = await User.findById(uid);
    }

    if (!dbUser && session.email) {
      dbUser = await User.findOne({
        email: { $regex: new RegExp(`^${escapeRegex(String(session.email).trim())}$`, "i") },
      });
    }

    const payload = { ...session };

    if (dbUser) {
      payload.userId = String(dbUser._id);
      payload.lifetimeMember = !!dbUser.lifetimeMember;
      if (dbUser.subscriptionTier != null) payload.subscriptionTier = dbUser.subscriptionTier;
      if (dbUser.billingCycle != null) payload.billingCycle = dbUser.billingCycle;
      if (dbUser.subscriptionStatus != null) payload.subscriptionStatus = dbUser.subscriptionStatus;
      if (dbUser.subscribedAt != null) payload.subscribedAt = dbUser.subscribedAt;
      if (dbUser.user_name != null) payload.user_name = dbUser.user_name;
    }

    return res.status(200).json({ user: payload });
  } catch (err) {
    console.error("[api/user] Failed to merge Mongo user:", err?.message || err);
    return res.status(200).json({ user: session });
  }
}
