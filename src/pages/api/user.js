import mongoose from "mongoose";
import { getLoginSession, setLoginSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import { isOwnerFullAccessUser } from "@/lib/ownerFullAccess";
import { DEV_LOGIN_BYPASS_EMAIL } from "@/lib/devLoginBypass";
import { adoptDevBypassWorkspace } from "@/lib/adoptDevBypassWorkspace";

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function userEntitlementScore(user) {
  if (!user) return 0;
  const status = String(user.subscriptionStatus || "").toLowerCase();
  let score = 0;
  if (user.lifetimeMember) score += 100;
  if (status === "active") score += 50;
  if (status === "trialing") score += 25;
  if (user.subscriptionTier) score += 10;
  return score;
}

async function promoteDevBypassSession(res, session) {
  if (process.env.NODE_ENV === "production") return null;
  const email = String(session?.email || "").trim().toLowerCase();
  if (email !== DEV_LOGIN_BYPASS_EMAIL.toLowerCase()) return null;
  try {
    await dbConnect();
    const dbUser = await User.findOne({ email: DEV_LOGIN_BYPASS_EMAIL });
    if (!dbUser) return null;
    const userId = String(dbUser._id);
    await adoptDevBypassWorkspace(userId);
    const next = {
      email: dbUser.email,
      name: dbUser.name || session.name,
      userId,
      issuer: session.issuer,
    };
    await setLoginSession(res, next);
    return { ...session, ...next };
  } catch {
    return null;
  }
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
    const promoted = await promoteDevBypassSession(res, session);
    return res.status(200).json({ user: promoted || session });
  }

  try {
    await dbConnect();

    let dbUser = null;
    const uid = session.userId != null ? String(session.userId) : "";

    if (uid && mongoose.Types.ObjectId.isValid(uid)) {
      dbUser = await User.findById(uid);
    }

    if (!dbUser && session.email) {
      const candidates = await User.find({
        email: { $regex: new RegExp(`^${escapeRegex(String(session.email).trim())}$`, "i") },
      });
      if (candidates?.length) {
        candidates.sort((a, b) => userEntitlementScore(b) - userEntitlementScore(a));
        dbUser = candidates[0];
      }
    }

    const payload = { ...session };

    if (dbUser) {
      payload.userId = String(dbUser._id);
      if (
        process.env.NODE_ENV !== "production" &&
        String(dbUser.email || "").toLowerCase() === DEV_LOGIN_BYPASS_EMAIL.toLowerCase()
      ) {
        await adoptDevBypassWorkspace(payload.userId).catch(() => {});
      }
      payload.lifetimeMember = !!dbUser.lifetimeMember;
      if (dbUser.subscriptionTier != null) payload.subscriptionTier = dbUser.subscriptionTier;
      if (dbUser.billingCycle != null) payload.billingCycle = dbUser.billingCycle;
      if (dbUser.subscriptionStatus != null) payload.subscriptionStatus = dbUser.subscriptionStatus;
      if (dbUser.subscribedAt != null) payload.subscribedAt = dbUser.subscribedAt;
      if (dbUser.user_name != null) payload.user_name = dbUser.user_name;
      payload.billing_email = dbUser.billing_email || dbUser.email || payload.email || "";
      if (dbUser.run_yourself_used_at != null) {
        payload.run_yourself_used_at = dbUser.run_yourself_used_at;
      }
      if (dbUser.run_yourself_fork_data_set_id != null) {
        payload.run_yourself_fork_data_set_id = String(dbUser.run_yourself_fork_data_set_id);
      }
      if (dbUser.run_yourself_interactive_consumed_at != null) {
        payload.run_yourself_interactive_consumed_at = dbUser.run_yourself_interactive_consumed_at;
      }
    }

    if (isOwnerFullAccessUser(payload)) {
      payload.lifetimeMember = true;
      payload.subscriptionStatus = payload.subscriptionStatus || "active";
      payload.subscriptionTier = payload.subscriptionTier || "elite";
    }

    return res.status(200).json({ user: payload });
  } catch (err) {
    console.error("[api/user] Failed to merge Mongo user:", err?.message || err);
    return res.status(200).json({ user: session });
  }
}
