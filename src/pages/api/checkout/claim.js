import { getLoginSession } from "@/lib/auth";
import { attachCheckoutToEmail } from "@/lib/stripe/checkoutLink";
import { appendSetCookie, clearAttemptCookieHeader } from "@/lib/stripe/checkoutCookies";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const session = await getLoginSession(req);
    if (!session?.email) return res.status(401).json({ ok: false });
    const linked = await attachCheckoutToEmail(req, session.email);
    if (linked?.clearCookie) appendSetCookie(res, clearAttemptCookieHeader());
    return res.status(200).json({ ok: true, linked: !!linked?.user });
  } catch (err) {
    console.error("[checkout] claim failed:", err?.message || err);
    return res.status(401).json({ ok: false });
  }
}
