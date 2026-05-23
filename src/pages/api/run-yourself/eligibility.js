import { getLoginSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import { isRunnableRunYourselfSource } from "@/config/runYourselfAnalyses";
import { dbUserHasPaidAccess } from "@/lib/runYourself/serverPaidAccess";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { ownerHandle, chartSlug, dashboardSlug } = req.query;
  const handle = String(ownerHandle || "").trim();
  const chart = String(chartSlug || "").trim();
  const dash = String(dashboardSlug || "").trim();
  const runnable = handle
    ? isRunnableRunYourselfSource(handle, chart, dash || undefined)
    : false;

  let session = null;
  try {
    session = await getLoginSession(req);
  } catch {
    session = null;
  }

  if (!session?.userId) {
    return res.status(200).json({
      success: true,
      runnable,
      loggedIn: false,
      canFork: runnable,
      quotaExceeded: false,
      hasPaidAccess: false,
    });
  }

  try {
    await dbConnect();
    const user = await User.findById(session.userId).lean();
    const paid = dbUserHasPaidAccess(user);
    const quotaExceeded = !paid && !!user?.run_yourself_used_at;
    return res.status(200).json({
      success: true,
      runnable,
      loggedIn: true,
      canFork: runnable && !quotaExceeded,
      quotaExceeded,
      hasPaidAccess: paid,
      existingForkDataSetId: user?.run_yourself_fork_data_set_id
        ? String(user.run_yourself_fork_data_set_id)
        : null,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
