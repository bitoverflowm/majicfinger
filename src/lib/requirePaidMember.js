import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import { getLoginSession } from "@/lib/auth";
import {
  MEMBERSHIP_REQUIRED_CODE,
  isDevNoDbUser,
  membershipState,
  userInFreeRunWindow,
} from "@/lib/membershipAccess";

/**
 * Resolve the signed-in account from the database. Identity (email, issuer)
 * comes from the sealed session, plan fields only from Mongo.
 */
export async function loadSessionMember(req) {
  let session;
  try {
    session = await getLoginSession(req);
  } catch {
    return { session: null, user: null, state: membershipState(null) };
  }
  if (!session?.userId) return { session: null, user: null, state: membershipState(null) };
  if (isDevNoDbUser(session)) {
    return { session, user: session, state: membershipState(session) };
  }

  await dbConnect();
  const uid = String(session.userId);
  const dbUser = mongoose.Types.ObjectId.isValid(uid) ? await User.findById(uid).lean() : null;
  const user = {
    ...(dbUser || {}),
    userId: uid,
    email: session.email || dbUser?.email || "",
    issuer: session.issuer,
  };
  return { session, user, dbUser, state: membershipState(user) };
}

/**
 * Gate an API route on an active paid membership.
 * `allowFreeRun` lets a free user inside their one forked run-it-yourself session through;
 * pass `freeRunDataSetId` to limit that to the forked project.
 * @returns {Promise<object | null>} the session, or null after responding 401/402
 */
export async function requirePaidMember(req, res, { allowFreeRun = false, freeRunDataSetId } = {}) {
  let member;
  try {
    member = await loadSessionMember(req);
  } catch {
    res.status(503).json({ success: false, message: "Account lookup is unavailable. Try again." });
    return null;
  }
  const { session, user, state } = member;
  if (!session) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  if (state.hasAccess) return session;
  if (allowFreeRun && userInFreeRunWindow(user)) {
    const forkId = String(user.run_yourself_fork_data_set_id || "");
    if (freeRunDataSetId === undefined || forkId === String(freeRunDataSetId)) return session;
  }
  res.status(402).json({
    success: false,
    code: MEMBERSHIP_REQUIRED_CODE,
    reason: state.reason,
    message: "An active Lychee membership is required.",
  });
  return null;
}
