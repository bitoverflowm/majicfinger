import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import { isReservedUserHandle, reservedUserHandleMessage } from "@/lib/reservedUserHandles";
import { requireLoginSession } from "@/lib/resourceOwnership";

/** Fields the account owner may read about themselves. Stripe ids and tokens stay server-side. */
const SELF_FIELDS =
  "_id email name user_name profile_pic billing_email lifetimeMember subscriptionTier billingCycle subscriptionStatus subscribedAt nextPaymentDate";

/** The only field clients may write. Plan, email and Stripe fields come from Stripe webhooks. */
const WRITABLE_FIELDS = ["user_name"];

export default async function handler(req, res) {
    const {
        query: { id },
        method,
    } = req;

    const session = await requireLoginSession(req, res);
    if (!session) return;
    if (String(session.userId) !== String(id)) {
        return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (id === "dev-bypass-no-db") {
        if (method === "GET") {
            return res.status(200).json({
                success: true,
                data: {
                    _id: "dev-bypass-no-db",
                    user_name: null,
                    lifetimeMember: false,
                    subscriptionTier: null,
                    billingCycle: null,
                    subscriptionStatus: null,
                    subscribedAt: null,
                },
            });
        }
        return res.status(200).json({ success: false, message: "No DB user in dev bypass mode" });
    }

    switch (method) {
        case "GET":
            try {
                await dbConnect();
                const user = await User.findById(id).select(SELF_FIELDS).lean();
                if (!user) {
                    return res.status(400).json({ success: false });
                }
                res.status(200).json({ success: true, data: user });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
        case "PUT":
            try {
                await dbConnect();
                const body = req.body && typeof req.body === "object" ? req.body : {};
                const $set = {};
                for (const field of WRITABLE_FIELDS) {
                    if (body[field] !== undefined) $set[field] = String(body[field] ?? "").trim();
                }
                if (!Object.keys($set).length) {
                    return res.status(400).json({ success: false, message: "Nothing to update" });
                }
                if ($set.user_name !== undefined && isReservedUserHandle($set.user_name)) {
                    return res.status(400).json({
                        success: false,
                        message: reservedUserHandleMessage($set.user_name),
                    });
                }
                const user = await User.findByIdAndUpdate(id, { $set }, {
                    new: true,
                    runValidators: true,
                }).select(SELF_FIELDS);
                if (!user) {
                    return res.status(400).json({ success: false });
                }
                res.status(200).json({ success: true, data: user });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
        default:
            res.setHeader("Allow", ["GET", "PUT"]);
            res.status(405).json({ success: false });
            break;
    }
}
