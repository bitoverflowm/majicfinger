/** Accounts are created only by /api/login and Stripe webhooks, and are never listed. */
export default function handler(req, res) {
    res.status(404).json({ success: false });
}
