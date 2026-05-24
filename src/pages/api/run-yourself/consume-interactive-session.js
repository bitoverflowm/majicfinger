import mongoose from "mongoose";
import { getLoginSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import { dbUserHasPaidAccess } from "@/lib/runYourself/serverPaidAccess";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  let session;
  try {
    session = await getLoginSession(req);
  } catch {
    return res.status(401).json({ success: false, message: "Login required" });
  }

  const userId = String(session?.userId || "").trim();
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(401).json({ success: false, message: "Login required" });
  }

  try {
    await dbConnect();
    const dbUser = await User.findById(userId);
    if (!dbUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (dbUserHasPaidAccess(dbUser)) {
      return res.status(200).json({ success: true, consumed: false, reason: "paid" });
    }

    if (!dbUser.run_yourself_used_at || !dbUser.run_yourself_fork_data_set_id) {
      return res.status(200).json({ success: true, consumed: false, reason: "no_fork" });
    }

    if (dbUser.run_yourself_interactive_consumed_at) {
      return res.status(200).json({
        success: true,
        consumed: true,
        alreadyConsumed: true,
        run_yourself_interactive_consumed_at: dbUser.run_yourself_interactive_consumed_at,
      });
    }

    dbUser.run_yourself_interactive_consumed_at = new Date();
    await dbUser.save();

    return res.status(200).json({
      success: true,
      consumed: true,
      run_yourself_interactive_consumed_at: dbUser.run_yourself_interactive_consumed_at,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
