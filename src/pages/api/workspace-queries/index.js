import dbConnect from "@/lib/dbConnect";
import { getLoginSession } from "@/lib/auth";
import { requirePaidMember } from "@/lib/requirePaidMember";
import WorkspaceQueryRecord from "@/models/WorkspaceQueryRecords";
import { queryRecordLimit, sanitizeQueryRecord } from "@/lib/workspaceQueryRecord";

async function sessionUserId(req) {
  try {
    const session = await getLoginSession(req);
    return session?.userId ? String(session.userId) : "";
  } catch {
    return "";
  }
}

function toEntry(doc) {
  const payload = doc?.payload && typeof doc.payload === "object" ? doc.payload : {};
  return { ...payload, id: doc.entry_id, savedAt: doc.saved_at ? new Date(doc.saved_at).getTime() : payload.savedAt };
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const userId = await sessionUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
  if (req.method !== "GET" && !(await requirePaidMember(req, res, { allowFreeRun: true }))) return;

  try {
    await dbConnect();
  } catch {
    return res.status(503).json({ success: false, message: "Query storage is unavailable." });
  }

  if (req.method === "GET") {
    const [saved, pulls] = await Promise.all([
      WorkspaceQueryRecord.find({ user_id: userId, kind: "saved" })
        .sort({ saved_at: -1 })
        .limit(queryRecordLimit("saved"))
        .lean(),
      WorkspaceQueryRecord.find({ user_id: userId, kind: "pull" })
        .sort({ saved_at: -1 })
        .limit(queryRecordLimit("pull"))
        .lean(),
    ]);
    return res.status(200).json({
      success: true,
      saved: saved.map(toEntry),
      pulls: pulls.map(toEntry),
    });
  }

  const kind = req.body?.kind === "saved" || req.body?.kind === "pull" ? req.body.kind : "";
  const entry = sanitizeQueryRecord(kind, req.body?.entry);
  if (!entry) return res.status(400).json({ success: false, message: "Invalid query record" });

  await WorkspaceQueryRecord.findOneAndUpdate(
    { user_id: userId, kind, entry_id: entry.id },
    {
      $set: {
        user_id: userId,
        kind,
        entry_id: entry.id,
        integration_id: entry.integrationId,
        label: entry.label,
        saved_at: new Date(entry.savedAt),
        payload: entry,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const overflow = await WorkspaceQueryRecord.find({ user_id: userId, kind })
    .sort({ saved_at: -1 })
    .skip(queryRecordLimit(kind))
    .select("_id")
    .lean();
  if (overflow.length) {
    await WorkspaceQueryRecord.deleteMany({ _id: { $in: overflow.map((doc) => doc._id) }, user_id: userId });
  }

  return res.status(200).json({ success: true, entry });
}
