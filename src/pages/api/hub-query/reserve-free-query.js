import { getLoginSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import { dbUserHasPaidAccess } from "@/lib/runYourself/serverPaidAccess";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getLoginSession(req);
  const userId = session?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  await dbConnect();
  const dbUser = await User.findById(userId);
  if (!dbUser) {
    return res.status(404).json({ error: "User not found", code: "NOT_FOUND" });
  }

  const paid = dbUserHasPaidAccess(dbUser);
  if (paid) {
    return res.status(200).json({ ok: true, paid: true });
  }

  if (dbUser.run_yourself_used_at) {
    return res.status(403).json({
      error: "Free query limit reached",
      code: "FREE_QUERY_QUOTA_EXCEEDED",
      quotaExceeded: true,
    });
  }

  dbUser.run_yourself_used_at = new Date();
  await dbUser.save();

  return res.status(200).json({ ok: true, paid: false, reserved: true });
}
