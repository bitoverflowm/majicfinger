import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import McpCreditAccount from "@/models/McpCreditAccount";
import McpCreditLedger from "@/models/McpCreditLedger";
import { isOwnerFullAccessUser } from "@/lib/ownerFullAccess";
import { normalizeMembershipTier, userHasDashboardAccess } from "@/lib/membershipAccess";
import { MCP_CREDIT_COSTS, MCP_TIER_MONTHLY_CREDITS } from "@/lib/mcp/config";

function periodKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function allotmentForUser(user) {
  if (isOwnerFullAccessUser(user)) return { unlimited: true, amount: 0 };
  if (!userHasDashboardAccess(user)) return { unlimited: false, amount: MCP_TIER_MONTHLY_CREDITS.free };
  const tier = normalizeMembershipTier(user.subscriptionTier) || "lite";
  const amount = MCP_TIER_MONTHLY_CREDITS[tier] ?? MCP_TIER_MONTHLY_CREDITS.lite;
  return { unlimited: false, amount };
}

export function quoteCredits(actionClass, { rows = 0 } = {}) {
  const cls = String(actionClass || "").toLowerCase();
  if (cls === "orient") return MCP_CREDIT_COSTS.orient;
  if (cls === "sample") return MCP_CREDIT_COSTS.sample;
  if (cls === "analyze") return MCP_CREDIT_COSTS.analyze;
  if (cls === "compose") return MCP_CREDIT_COSTS.compose;
  if (cls === "publish") return MCP_CREDIT_COSTS.publish;
  if (cls === "materialize" || cls === "export") {
    const n = Math.max(0, Number(rows) || 0);
    return MCP_CREDIT_COSTS.materialize_base + Math.ceil(n / 1000) * MCP_CREDIT_COSTS.materialize_per_1k_rows;
  }
  return MCP_CREDIT_COSTS.sample;
}

async function loadUser(userId) {
  await dbConnect();
  return User.findById(userId).lean();
}

/**
 * Ensure the credit account exists and the monthly allotment is applied once per period.
 * Owner accounts are marked unlimited but still keep a ledger for testing.
 */
export async function ensureCreditAccount(userId) {
  await dbConnect();
  const user = await loadUser(userId);
  if (!user) throw new Error("User not found for MCP credits");

  const allotment = allotmentForUser(user);
  const key = periodKey();
  let account = await McpCreditAccount.findOne({ user_id: String(userId) });
  if (!account) {
    account = await McpCreditAccount.create({
      user_id: String(userId),
      balance: allotment.unlimited ? 0 : allotment.amount,
      lifetime_granted: allotment.unlimited ? 0 : allotment.amount,
      lifetime_spent: 0,
      unlimited: allotment.unlimited,
      period_key: key,
      period_granted: allotment.unlimited ? 0 : allotment.amount,
      updated_from_tier_at: new Date(),
    });
    if (!allotment.unlimited && allotment.amount > 0) {
      await McpCreditLedger.create({
        user_id: String(userId),
        delta: allotment.amount,
        balance_after: allotment.amount,
        reason: "period_grant",
        class: "grant",
        meta: { period: key, tier: user.subscriptionTier || "free" },
      });
    }
    return account;
  }

  const patch = {};
  if (allotment.unlimited && !account.unlimited) patch.unlimited = true;
  if (!allotment.unlimited && account.unlimited && !isOwnerFullAccessUser(user)) patch.unlimited = false;

  if (account.period_key !== key) {
    patch.period_key = key;
    patch.period_granted = allotment.unlimited ? 0 : allotment.amount;
    if (!allotment.unlimited) {
      patch.balance = (Number(account.balance) || 0) + allotment.amount;
      patch.lifetime_granted = (Number(account.lifetime_granted) || 0) + allotment.amount;
    }
    patch.updated_from_tier_at = new Date();
  }

  if (Object.keys(patch).length) {
    account = await McpCreditAccount.findOneAndUpdate({ _id: account._id }, { $set: patch }, { new: true });
    if (patch.period_key === key && !allotment.unlimited && allotment.amount > 0) {
      await McpCreditLedger.create({
        user_id: String(userId),
        delta: allotment.amount,
        balance_after: account.balance,
        reason: "period_grant",
        class: "grant",
        meta: { period: key, tier: user.subscriptionTier || "free" },
      });
    }
  }

  return account;
}

export async function getCreditSnapshot(userId) {
  const account = await ensureCreditAccount(userId);
  return {
    balance: account.unlimited ? null : Number(account.balance) || 0,
    unlimited: !!account.unlimited,
    lifetime_granted: Number(account.lifetime_granted) || 0,
    lifetime_spent: Number(account.lifetime_spent) || 0,
    period_key: account.period_key,
    period_granted: Number(account.period_granted) || 0,
  };
}

/**
 * Charge credits. Owner/unlimited still writes a ledger row with delta for testing.
 * @returns {{ ok: true, charged: number, snapshot } | { ok: false, code: string, message: string, snapshot }}
 */
export async function chargeCredits(userId, amount, { reason, tool = "", actionClass = "", meta = null } = {}) {
  const need = Math.max(0, Math.ceil(Number(amount) || 0));
  const account = await ensureCreditAccount(userId);

  if (account.unlimited || need === 0) {
    if (need > 0) {
      await McpCreditLedger.create({
        user_id: String(userId),
        delta: -need,
        balance_after: null,
        reason: reason || "tool",
        tool,
        class: actionClass,
        meta,
        unlimited_account: true,
      });
      await McpCreditAccount.updateOne(
        { _id: account._id },
        { $inc: { lifetime_spent: need } },
      );
    }
    return { ok: true, charged: need, snapshot: await getCreditSnapshot(userId) };
  }

  if ((Number(account.balance) || 0) < need) {
    return {
      ok: false,
      code: "CREDITS_EXHAUSTED",
      message: `Not enough MCP credits (need ${need}, have ${account.balance}). Upgrade or top up to continue.`,
      snapshot: await getCreditSnapshot(userId),
    };
  }

  const updated = await McpCreditAccount.findOneAndUpdate(
    { _id: account._id, balance: { $gte: need } },
    { $inc: { balance: -need, lifetime_spent: need } },
    { new: true },
  );
  if (!updated) {
    return {
      ok: false,
      code: "CREDITS_EXHAUSTED",
      message: "Not enough MCP credits. Upgrade or top up to continue.",
      snapshot: await getCreditSnapshot(userId),
    };
  }

  await McpCreditLedger.create({
    user_id: String(userId),
    delta: -need,
    balance_after: updated.balance,
    reason: reason || "tool",
    tool,
    class: actionClass,
    meta,
    unlimited_account: false,
  });

  return { ok: true, charged: need, snapshot: await getCreditSnapshot(userId) };
}

export async function recentLedger(userId, limit = 30) {
  await dbConnect();
  return McpCreditLedger.find({ user_id: String(userId) })
    .sort({ createdAt: -1 })
    .limit(Math.min(100, Math.max(1, limit)))
    .lean();
}
