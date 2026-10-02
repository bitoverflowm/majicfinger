import WorkspaceDashboard from "@/models/WorkspaceDashboards";
import WorkspaceQueryRecord from "@/models/WorkspaceQueryRecords";

const DEV_BYPASS_USER_ID = "dev-bypass-no-db";

/**
 * Dev login used to keep working when Mongo was down by issuing a session
 * whose email was the real account but whose user id was `dev-bypass-no-db`.
 * Once the database is back, move that temporary user's dashboard and query
 * records onto the real account. updatedAt is left alone so a newer project
 * on the real account stays the one that opens.
 */
export async function adoptDevBypassWorkspace(realUserId) {
  if (process.env.NODE_ENV === "production") return;
  const userId = String(realUserId || "");
  if (!userId || userId === DEV_BYPASS_USER_ID) return;
  const filter = { user_id: DEV_BYPASS_USER_ID };
  const update = { $set: { user_id: userId } };
  await WorkspaceDashboard.collection.updateMany(filter, update);
  await WorkspaceQueryRecord.collection.updateMany(filter, update);
}
