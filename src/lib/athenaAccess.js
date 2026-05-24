import mongoose from "mongoose";
import { getLoginSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import { ATHENA_SAMPLE_ROW_LIMIT, ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT } from "@/config/dataLakeParquetSamples";
import { COMPOSE_UNCONSTRAINED_ROW_CAP } from "@/lib/dataLake/buildComposeAthenaSql";
import { userHasExpandedAthenaAccess } from "@/lib/athenaEntitlement";
import { dbUserHasPaidAccess } from "@/lib/runYourself/serverPaidAccess";

function subscriberMaxSelectEnv() {
  const n = parseInt(process.env.ATHENA_SUBSCRIBER_MAX_SELECT || String(ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500000) : ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT;
}

function subscriberMaxComposeEnv() {
  const n = parseInt(process.env.ATHENA_SUBSCRIBER_MAX_COMPOSE || String(ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500000) : ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT;
}

function subscriberLimits() {
  return {
    maxSelectRows: subscriberMaxSelectEnv(),
    maxComposeRows: subscriberMaxComposeEnv(),
  };
}

function freeLimits() {
  return {
    maxSelectRows: ATHENA_SAMPLE_ROW_LIMIT,
    maxComposeRows: COMPOSE_UNCONSTRAINED_ROW_CAP,
  };
}

/** Free user's one interactive fork session — full pulls, not 100-row samples. */
function dbUserHasRunYourselfFullPullAccess(dbUser) {
  if (!dbUser) return false;
  if (dbUserHasPaidAccess(dbUser)) return true;
  if (!dbUser.run_yourself_fork_data_set_id || !dbUser.run_yourself_used_at) return false;
  return !dbUser.run_yourself_interactive_consumed_at;
}

/**
 * Athena row caps for routes that use the **chart/dataset owner's** subscription
 * (e.g. public embed hydration), not the anonymous viewer session.
 *
 * @param {unknown} userId - Mongo ObjectId string or object
 * @param {{ runYourselfForkPull?: boolean }} [options] One-time full pull during run-yourself fork replay
 */
export async function getAthenaAccessForUserId(userId, options = {}) {
  try {
    const uid = userId != null ? String(userId) : "";
    if (!uid || uid === "dev-bypass-no-db") {
      return uid === "dev-bypass-no-db" ? subscriberLimits() : freeLimits();
    }
    if (!mongoose.Types.ObjectId.isValid(uid)) return freeLimits();

    await dbConnect();
    const dbUser = await User.findById(uid).lean();
    if (!dbUser) return freeLimits();

    if (options.runYourselfForkPull || dbUserHasRunYourselfFullPullAccess(dbUser)) {
      return subscriberLimits();
    }

    if (userHasExpandedAthenaAccess({ ...dbUser, userId: uid })) {
      return subscriberLimits();
    }
  } catch {
    /* ignore */
  }
  return freeLimits();
}

/**
 * Row caps for Athena validate/start — **must** be computed server-side (do not trust client `limit`).
 */
export async function getAthenaAccessFromRequest(req) {
  try {
    const session = await getLoginSession(req);
    if (!session) return freeLimits();

    if (String(session.userId) === "dev-bypass-no-db") {
      return subscriberLimits();
    }

    if (userHasExpandedAthenaAccess(session)) {
      return subscriberLimits();
    }

    const uid = session.userId != null ? String(session.userId) : "";
    if (uid && mongoose.Types.ObjectId.isValid(uid)) {
      await dbConnect();
      const dbUser = await User.findById(uid).lean();
      if (dbUser && dbUserHasRunYourselfFullPullAccess(dbUser)) {
        return subscriberLimits();
      }
      if (dbUser && userHasExpandedAthenaAccess({ ...session, ...dbUser })) {
        return subscriberLimits();
      }
    }
  } catch {
    /* session invalid → free */
  }
  return freeLimits();
}
