import mongoose from "mongoose";
import { getLoginSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import { ATHENA_SAMPLE_ROW_LIMIT } from "@/config/dataLakeParquetSamples";
import { COMPOSE_UNCONSTRAINED_ROW_CAP } from "@/lib/dataLake/buildComposeAthenaSql";
import { userHasExpandedAthenaAccess } from "@/lib/athenaEntitlement";

function subscriberMaxSelectEnv() {
  const n = parseInt(process.env.ATHENA_SUBSCRIBER_MAX_SELECT || "50000", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500000) : 50000;
}

function subscriberMaxComposeEnv() {
  const n = parseInt(process.env.ATHENA_SUBSCRIBER_MAX_COMPOSE || "50000", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500000) : 50000;
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
      if (dbUser && userHasExpandedAthenaAccess({ ...session, ...dbUser })) {
        return subscriberLimits();
      }
    }
  } catch {
    /* session invalid → free */
  }
  return freeLimits();
}
