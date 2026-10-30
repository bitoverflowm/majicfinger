/* eslint-disable no-console */

/**
 * Idempotent Stripe setup for the in-app checkout. Safe to re-run.
 *
 * Dry run by default: prints what it would change. Test mode by default
 * (STRIPE_SECRET_DEV_KEY). Live needs --live, and writes need --apply plus
 * --yes-live.
 *
 * It only creates or enables things. When a plan's amount changes it creates a
 * replacement price and moves the lychee_* lookup key onto it; the old price
 * stays active so existing subscribers keep it. It points the in-app portal
 * configuration at the current prices. It never archives or deletes prices,
 * products or subscriptions, so legacy Basic/Pro/Elite/Lifetime billing is
 * untouched.
 *
 *   node scripts/stripe-setup.cjs                         # test, dry run
 *   node scripts/stripe-setup.cjs --apply --account acct_…               # test, write
 *   node scripts/stripe-setup.cjs --live                  # live, dry run
 *   node scripts/stripe-setup.cjs --live --apply --yes-live --account acct_…
 *
 * Writes need --account set to the id the dry run prints, so a key for the
 * wrong Stripe account can never be changed by mistake.
 *
 * Options:
 *   --domain lycheedata.com     register a payment method domain (Apple Pay, Google Pay, Link)
 *   --webhook-url https://...   create the webhook endpoint if it's missing, or add missing events
 */

require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : "";
};

const LIVE = flag("--live");
const APPLY = flag("--apply");
if (LIVE && APPLY && !flag("--yes-live")) {
  console.error("Refusing live writes without --yes-live.");
  process.exit(1);
}

const KEY = LIVE ? process.env.STRIPE_SECRET_KEY : process.env.STRIPE_SECRET_DEV_KEY;
if (!KEY) {
  console.error(`Missing ${LIVE ? "STRIPE_SECRET_KEY" : "STRIPE_SECRET_DEV_KEY"}.`);
  process.exit(1);
}
const keyIsLive = /^[sr]k_live_/.test(KEY);
if (keyIsLive !== LIVE) {
  console.error(`Key mode doesn't match ${LIVE ? "--live" : "test mode"}. Stopping.`);
  process.exit(1);
}

// Must match the setup objects' expected shapes. Webhook endpoints keep their own version.
const API_VERSION = "2026-08-26.dahlia";

// Keep aligned with CHECKOUT_PLANS in src/lib/stripe/catalog.js and PLAN_MAP in the webhook.
const PRODUCTS = [
  {
    tier: "researcher",
    name: "Lychee Researcher",
    description: "A complete workspace for traders, analysts, journalists, and researchers.",
    prices: [
      { key: "researcher_monthly", amount: 4900, interval: "month", nickname: "Researcher monthly" },
      { key: "researcher_annual", amount: 49000, interval: "year", nickname: "Researcher annual" },
    ],
  },
  {
    tier: "quant",
    name: "Lychee Quant",
    description: "Everything in Researcher, with more capacity and flexible billing.",
    prices: [
      { key: "quant_monthly", amount: 9900, interval: "month", nickname: "Quant monthly" },
      { key: "quant_annual", amount: 99000, interval: "year", nickname: "Quant annual" },
    ],
  },
];

const WEBHOOK_EVENTS = [
  "checkout.session.async_payment_failed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.completed",
  "checkout.session.expired",
  "customer.created",
  "customer.updated",
  "customer.deleted",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.payment_attempt_required",
  "invoice_payment.paid",
];

const WALLETS = ["card", "link", "apple_pay", "google_pay"];

function encode(value, prefix, out = []) {
  if (value === undefined || value === null) return out;
  if (Array.isArray(value)) {
    value.forEach((item, index) => encode(item, `${prefix}[${index}]`, out));
  } else if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) encode(child, prefix ? `${prefix}[${key}]` : key, out);
  } else {
    out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`);
  }
  return out;
}

async function stripe(method, path, params = {}) {
  const body = encode(params, "").join("&");
  const url = `https://api.stripe.com/v1/${path}${method === "GET" && body ? `?${body}` : ""}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Stripe-Version": API_VERSION,
      ...(method === "GET" ? {} : { "Content-Type": "application/x-www-form-urlencoded" }),
    },
    body: method === "GET" ? undefined : body,
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json?.error?.message || `HTTP ${res.status}`);
    err.stripe = json?.error;
    throw err;
  }
  return json;
}

async function listAll(path, params = {}) {
  const items = [];
  let startingAfter;
  for (let page = 0; page < 20; page += 1) {
    const res = await stripe("GET", path, { limit: 100, ...params, ...(startingAfter ? { starting_after: startingAfter } : {}) });
    items.push(...res.data);
    if (!res.has_more) break;
    startingAfter = res.data[res.data.length - 1].id;
  }
  return items;
}

const changes = [];
async function change(description, write) {
  changes.push(description);
  if (!APPLY) {
    console.log(`  would: ${description}`);
    return null;
  }
  const result = await write();
  console.log(`  done:  ${description}`);
  return result;
}

async function ensurePrices() {
  console.log("\nProducts and prices");
  const products = await listAll("products", { active: true });
  const priceIdsByProduct = {};

  const addPrice = (productId, priceId) => {
    if (!productId || !priceId) return;
    priceIdsByProduct[productId] = [...(priceIdsByProduct[productId] || []), priceId];
  };

  for (const def of PRODUCTS) {
    let product = products.find((item) => item.metadata?.lychee_tier === def.tier);

    for (const price of def.prices) {
      const lookupKey = `lychee_${price.key}`;
      const found = (await stripe("GET", "prices", { lookup_keys: [lookupKey], active: true, limit: 1 })).data[0];
      if (found) {
        const foundProduct = typeof found.product === "string" ? found.product : found.product?.id;
        const interval = found.recurring?.interval || null;
        if (found.unit_amount === price.amount && interval === price.interval && found.currency === "usd") {
          console.log(`  ok:    ${lookupKey} -> ${found.id}`);
          addPrice(foundProduct, found.id);
          continue;
        }
        const replaced = await change(
          `replace ${lookupKey} ${found.id} ($${found.unit_amount / 100} ${found.currency}/${interval}) with $${price.amount / 100}/${price.interval}; ${found.id} stays active for existing subscribers`,
          () =>
            stripe("POST", "prices", {
              product: foundProduct,
              currency: "usd",
              unit_amount: price.amount,
              recurring: { interval: price.interval },
              lookup_key: lookupKey,
              transfer_lookup_key: true,
              nickname: price.nickname,
              metadata: { lychee_plan: price.key },
            }),
        );
        addPrice(foundProduct, replaced ? replaced.id : `(new ${lookupKey})`);
        continue;
      }

      if (!product) {
        product = (await change(`create product "${def.name}"`, () =>
          stripe("POST", "products", {
            name: def.name,
            description: def.description,
            metadata: { lychee_tier: def.tier },
          }),
        )) || { id: `(new ${def.name})` };
      }
      const created = await change(`create price ${lookupKey} ($${price.amount / 100}/${price.interval})`, () =>
        stripe("POST", "prices", {
          product: product.id,
          currency: "usd",
          unit_amount: price.amount,
          recurring: { interval: price.interval },
          lookup_key: lookupKey,
          nickname: price.nickname,
          metadata: { lychee_plan: price.key },
        }),
      );
      addPrice(product.id, created ? created.id : `(new ${lookupKey})`);
    }
  }
  return priceIdsByProduct;
}

async function ensurePaymentMethods() {
  console.log("\nPayment methods (default configuration)");
  const configs = await listAll("payment_method_configurations");
  const config = configs.find((item) => item.is_default && !item.application && !item.parent);
  if (!config) {
    console.log("  skip:  no default payment method configuration found");
    return;
  }
  const updates = {};
  for (const wallet of WALLETS) {
    const setting = config[wallet];
    if (!setting) {
      console.log(`  n/a:   ${wallet} isn't offered for this account`);
      continue;
    }
    const preference = setting.display_preference?.preference;
    const on = setting.display_preference?.value === "on";
    console.log(`  ${on ? "ok:   " : "off:  "} ${wallet} (preference ${preference || "none"}, available ${setting.available})`);
    if (!on && preference !== "on") updates[wallet] = { display_preference: { preference: "on" } };
  }
  if (Object.keys(updates).length) {
    await change(`turn on ${Object.keys(updates).join(", ")} in ${config.id}`, () =>
      stripe("POST", `payment_method_configurations/${config.id}`, updates),
    );
  }
}

async function ensureDomain(domain) {
  console.log("\nPayment method domain");
  if (!domain) {
    console.log("  skip:  pass --domain lycheedata.com to register Apple Pay / Google Pay / Link");
    return;
  }
  const existing = (await stripe("GET", "payment_method_domains", { domain_name: domain, limit: 1 })).data[0];
  if (existing) {
    console.log(
      `  ok:    ${domain} (${existing.id}) apple_pay=${existing.apple_pay?.status} google_pay=${existing.google_pay?.status} link=${existing.link?.status}`,
    );
    return;
  }
  await change(`register ${domain}`, () => stripe("POST", "payment_method_domains", { domain_name: domain, enabled: true }));
}

async function ensurePortal(priceIdsByProduct) {
  console.log("\nCustomer portal configuration");
  const products = Object.entries(priceIdsByProduct)
    .filter(([, prices]) => prices.length)
    .map(([product, prices]) => ({ product, prices, adjustable_quantity: { enabled: false } }));
  const configs = await listAll("billing_portal/configurations", {
    active: true,
    expand: ["data.features.subscription_update.products"],
  });
  const existing = configs.find((item) => item.metadata?.lychee === "inapp_v1");
  if (existing) {
    const signature = (list) =>
      (list || [])
        .map((item) => `${item.product}:${[...(item.prices || [])].sort().join(",")}:${Boolean(item.adjustable_quantity?.enabled)}`)
        .sort()
        .join("|");
    const current = existing.features?.subscription_update?.products || [];
    if (products.length && signature(current) !== signature(products)) {
      const summary = products.map((item) => `${item.product} [${item.prices.join(", ")}]`).join("; ");
      await change(`point ${existing.id} plan switching at ${summary}`, () =>
        stripe("POST", `billing_portal/configurations/${existing.id}`, {
          features: { subscription_update: { enabled: true, products } },
        }),
      );
    }
    console.log(`  ok:    ${existing.id}  (set STRIPE_PORTAL_CONFIGURATION=${existing.id})`);
    return;
  }
  if (!products.length) {
    console.log("  skip:  create the prices first (--apply), then re-run");
    return;
  }
  const created = await change("create portal configuration for Researcher and Quant", () =>
    stripe("POST", "billing_portal/configurations", {
      business_profile: { headline: "Manage your Lychee plan" },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: { enabled: true, allowed_updates: ["email", "address", "name"] },
        subscription_cancel: {
          enabled: true,
          mode: "at_period_end",
          cancellation_reason: {
            enabled: true,
            options: ["too_expensive", "missing_features", "switched_service", "unused", "other"],
          },
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price"],
          proration_behavior: "create_prorations",
          products,
        },
      },
      metadata: { lychee: "inapp_v1" },
    }),
  );
  if (created) console.log(`  set STRIPE_PORTAL_CONFIGURATION=${created.id}`);
}

async function ensureWebhook(url) {
  console.log("\nWebhook endpoint");
  const endpoints = await listAll("webhook_endpoints");
  const target = url || "";
  const endpoint = endpoints.find((item) => target && item.url === target)
    || endpoints.find((item) => item.url.endsWith("/api/stripeWebHook/success"));
  if (!endpoint) {
    if (!target) {
      console.log("  none:  pass --webhook-url https://<host>/api/stripeWebHook/success to create one");
      return;
    }
    const created = await change(`create endpoint ${target} (${WEBHOOK_EVENTS.length} events)`, () =>
      stripe("POST", "webhook_endpoints", { url: target, enabled_events: WEBHOOK_EVENTS, description: "Lychee billing" }),
    );
    if (created?.secret) console.log(`  STRIPE_WEBHOOK_SECRET for this endpoint: ${created.secret}`);
    return;
  }
  const enabled = new Set(endpoint.enabled_events);
  const missing = enabled.has("*") ? [] : WEBHOOK_EVENTS.filter((name) => !enabled.has(name));
  console.log(`  ok:    ${endpoint.url} (${endpoint.status}, payload version ${endpoint.api_version || "account default"})`);
  if (missing.length) {
    if (!target) {
      console.log(`  missing events: ${missing.join(", ")} (pass --webhook-url ${endpoint.url} to add them)`);
      return;
    }
    await change(`add ${missing.length} events to ${endpoint.id}: ${missing.join(", ")}`, () =>
      stripe("POST", `webhook_endpoints/${endpoint.id}`, { enabled_events: [...endpoint.enabled_events, ...missing] }),
    );
  }
}

(async () => {
  const account = await stripe("GET", "account");
  const accountName = account.settings?.dashboard?.display_name || account.business_profile?.name || "";
  console.log(`Stripe setup: ${LIVE ? "LIVE" : "test"} mode, ${APPLY ? "applying changes" : "dry run"}`);
  console.log(`Account: ${account.id}${accountName ? ` (${accountName})` : ""}`);
  if (APPLY && option("--account") !== account.id) {
    throw new Error(`Writes need --account ${account.id} to confirm this is the right Stripe account.`);
  }
  const priceIdsByProduct = await ensurePrices();
  await ensurePaymentMethods();
  await ensureDomain(option("--domain"));
  await ensurePortal(priceIdsByProduct);
  await ensureWebhook(option("--webhook-url"));
  console.log(
    `\n${changes.length ? `${changes.length} change(s) ${APPLY ? "applied" : "pending; re-run with --apply"}` : "Nothing to change."}`,
  );
})().catch((err) => {
  console.error(`\nStopped: ${err.message}`);
  process.exit(1);
});
