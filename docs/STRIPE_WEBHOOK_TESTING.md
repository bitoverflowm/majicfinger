# Stripe Webhook Testing Guide

This guide helps you verify that payments correctly upgrade users so they don't get "shafted" after paying.

## 1. Verify AMOUNT_MAP Matches Your Stripe Prices

**Critical:** The webhook maps payment amounts (in cents) to tiers. If your Stripe prices don't match, users won't get access.

### Get your actual Stripe amounts

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. For each product (Basic, Premium, Lifetime), click it and note:
   - **One-time (Lifetime):** The price amount in cents (e.g. $199.99 → 19999)
   - **Recurring (Basic/Premium):** The `unit_amount` and `interval` (month vs year)

3. Compare with `src/pages/api/stripeWebHook/success.js` → `AMOUNT_MAP`:

| Tier | Expected | AMOUNT_MAP keys |
|------|----------|-----------------|
| Basic monthly | $19.99 | 1999 |
| Basic annual | $191.90 or $15.99/mo | 19190, 19188, 1599 |
| Premium monthly | $39.99 | 3999 |
| Premium annual | $383.90 or $31.99/mo | 38390, 38388, 3199 |
| Lifetime | $199.99 | 19999 |

**If your amounts differ**, add them to `AMOUNT_MAP` in the webhook file.

---

## 2. Test with Stripe CLI (Recommended)

### Setup

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/stripeWebHook/success
```

The CLI will print a **webhook signing secret** like `whsec_xxx`. Use this for local testing:

```bash
# In .env.local (local only - never commit real secrets)
STRIPE_WEBHOOK_SECRET=whsec_xxx  # from stripe listen output
STRIPE_SECRET_KEY=sk_test_xxx    # Stripe test mode key
```

### Run a test checkout

1. Start your app: `npm run dev`
2. Go to your landing page
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete a checkout (Basic monthly, Premium, or Lifetime)
5. Watch the `stripe listen` terminal – you should see events
6. Check your database – the user's `lifetimeMember`, `subscriptionTier`, `subscriptionStatus` should be updated

---

## 3. Verify Database After Payment

After a test payment, check the user document in MongoDB:

```javascript
// Expected fields after successful payment:
{
  email: "customer@example.com",
  lifetimeMember: true,        // only for Lifetime
  subscriptionTier: "basic",   // or "premium" or "lifetime"
  billingCycle: "monthly",      // or "annual" or "one-time"
  subscriptionStatus: "active",
  subscriptionType: "basic_monthly",
  confirmedAt: <Date>,
  token: 100
}
```

For **Lifetime** purchases: `lifetimeMember: true`, `subscriptionTier: "lifetime"`, `billingCycle: "one-time"`.

For **subscriptions**: `lifetimeMember: false`, `subscriptionTier` and `billingCycle` match the plan.

---

## 4. Test Subscription Lifecycle

| Event | What to test | Expected |
|-------|--------------|----------|
| `checkout.session.completed` | New payment | User gets tier + active status |
| `customer.subscription.deleted` | Cancel subscription | `subscriptionStatus: "cancelled"`, `lifetimeMember: false` |
| `invoice.payment_failed` | Failed renewal | `subscriptionStatus: "payment_failed"` |

Use Stripe CLI to trigger test events:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

(Note: `stripe trigger` uses generic test data; for full flow use real test checkouts.)

---

## 5. Production Checklist

Before going live:

- [ ] **Webhook endpoint** in Stripe Dashboard → Developers → Webhooks points to `https://yourdomain.com/api/stripeWebHook/success`
- [ ] **Events to send:** `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.deleted`, `customer.subscription.updated`, `invoice.payment_failed`
- [ ] **Webhook secret** (`STRIPE_WEBHOOK_SECRET`) in Vercel env vars is the **live** secret from Stripe
- [ ] **AMOUNT_MAP** includes all your live Stripe price amounts
- [ ] Do one real test purchase in live mode (then refund) and verify DB update

---

## 6. Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| User pays but no access | Amount not in AMOUNT_MAP; check Stripe price and add to map |
| "Unrecognized payment amount" in logs | Add the amount (in cents) to AMOUNT_MAP |
| Webhook returns 400 | Wrong `STRIPE_WEBHOOK_SECRET` or payload tampering |
| User not found | Checkout email must match Magic/auth email; ensure same email is used |

---

## 7. Optional: Price ID Mapping (Most Reliable)

For bulletproof mapping, you can use Stripe Price IDs instead of amounts. In Stripe Dashboard, copy each Price ID (e.g. `price_1ABC...`), then add to the webhook:

```javascript
const PRICE_ID_MAP = {
  "price_xxx_basic_monthly": { tier: "basic", cycle: "monthly" },
  "price_xxx_basic_annual": { tier: "basic", cycle: "annual" },
  // ... etc
};
```

Then in `handleCheckoutCompleted` / `mapSubscriptionToTier`, check `session.line_items` or `subscription.items.data[0].price.id` and use `PRICE_ID_MAP` first before falling back to `AMOUNT_MAP`.
