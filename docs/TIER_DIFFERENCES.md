# Tier differences (demo, free, Basic, Pro, Elite, Lifetime)

Working archive for redoing the pricing pages. It records what each tier gets today, what the product
decisions were, and where the numbers live in code. Update it when a limit changes.

Last updated: Oct 19, 2026.

## Tiers at a glance

| | Landing demo | Signed in, no membership | Basic | Pro | Elite | Lifetime |
| --- | --- | --- | --- | --- | --- | --- |
| Price | Free | Free | $4.99/wk, $19.99/mo, $199.99/yr | $9.99/wk, $39.99/mo, $399.99/yr | $19.99/wk, $79.99/mo, $799.99/yr | $199.99 once |
| Dashboard access | Demo dashboard only | Billing screen only | Yes | Yes | Yes | Yes (Elite level) |
| Rows per historical pull | 100 | n/a | 12,500 | Up to 500,000 | Up to 500,000 ("highest") | Same as Elite |
| Preview window | 50 rows | n/a | 50 rows | 50 rows | 50 rows | 50 rows |
| Sheets per Save and run | 12 total (charts follow their sheets) | n/a | No total cap | No total cap | No total cap | No total cap |
| Markets per join (one sheet each) | 11 (plus the parent sheet = 12) | n/a | 5 | 10 | 50 | 50 |
| New tab | Members only (upsell dialog) | n/a | Yes | Yes | Yes | Yes |
| Kalshi Historical v2 | Members only (upsell dialog) | n/a | Yes | Yes | Yes | Yes |
| Welcome tab | Hidden | n/a | Shown | Shown | Shown | Shown |

More than 50 markets in one join is an enterprise pull.

## Landing demo

The demo is the dashboard opened inside the landing page ("Demo Dashboard"). It only applies there,
not to the guide or hub demos.

Limits and gating:
- **Rows:** 100 rows per pull, with a 50-row preview. The Data Limits tip says so and offers Upgrade.
- **Sheets:** each Save and run places at most 12 sheets, counting the parent sheet. Charts only open
  for placed sheets, so they're capped too. Fetches for sheets past the cap are skipped, and the run log
  says "Demo pulls stop at 12 sheets. Upgrade for more."
- **Joins:** each join covers up to 11 markets, so the parent sheet plus the join sheets make 12. The
  Sheet limits tip ("Your enrichment generates N new sheets...") shows next to the generated tabs, with
  Upgrade and Continue.
- **Members-only actions:** these show the "Members only: X is a pro feature" dialog, with "Go back and
  keep exploring" or Upgrade:
  - New tab, including choosing "New tab" when placing a pull.
  - Kalshi Historical v2 in the integrations list.
- **Text block:** disabled everywhere for now, including outside the demo.
- **Pills:** the top-right login pill reads "Sign Up" and goes to the pricing section.
- **Welcome tab:** not shown in the demo. It's only for paid, signed-up users.
- **Feature tips:** dismissals are not remembered, so they show again on every visit.

The landing FAQ describes the free demo as: sample Kalshi and Polymarket pulls, charts and data
sheets, forking one published workflow, and limited historical requests, all without a credit card.

## Signed in without a membership

Someone can be signed in without paying. They only see the billing screen ("You don't have a
membership yet") with every tier, plus a Log out button. The server returns 402 `MEMBERSHIP_REQUIRED`
for writes, AI routes and publishing.

They're allowed one exception: running the single forked free analysis ("Open your free analysis").

Access rules (`membershipState`):
- Subscription status `active` or `trialing`: has access.
- Status `past_due` or `payment_failed`: no access (strict). Billing shows "Update payment method".
- A tier with no status (legacy record): has access.
- Lifetime, owner and dev accounts: always have access.

## Paid tiers (pricing page copy today)

**Basic**, "For solo researchers exploring prediction market data":
- All Kalshi and Polymarket data sources.
- 12,500 rows per historical pull.
- CSV/XLSX/JSON exports within plan limits.
- No-code charts and data sheets.
- Unlimited saved projects.
- Fork published research workflows.
- 1 dashboard and 1 custom alert.

**Pro** (most popular), "For serious traders and researchers running larger pulls, live dashboards,
exports, and backtests":
- Everything in Basic.
- Up to 500k rows per historical pull.
- Large exports.
- Advanced backtesting.
- Live Kalshi and Polymarket dashboards.
- 10 live data streams and 10 custom alerts.
- 100 dashboards and presentations.
- No Lychee branding on public charts.
- Request new integrations.
- 4 GB of workspace storage.

**Elite**, "For heavy traders, quants, and high-volume researchers":
- Everything in Pro.
- Highest historical pull limits and bulk exports.
- 100 live data streams and 500 custom alerts.
- Unlimited dashboards.
- 10 GB of workspace storage.
- Priority support and early access.
- Very large data workflows.

**Lifetime**, $199.99 one time:
- Elite-level access with `lifetimeMember` set for as long as Lychee exists.
- Very large or dedicated datasets may still be billed separately.

Billing screen behaviour for members: current tier highlighted ("Your plan"), with Upgrade, Downgrade
or Switch on the others. Changes are prorated and invoiced immediately. Lifetime and owner accounts
see "Included in your access".

## Ideas raised but not built yet

- Demo limits on the Preview, Share and Save pills.
- A "Pro" badge on locked integrations.
- A Data Limits tip variant for signed-in free users.
- An idle carousel in the demo.

## Where the numbers live

- `src/lib/athenaEntitlement.js`: `DEMO_RUN_SHEET_LIMIT` (12) and `getJoinMarketCap` (demo 11,
  Basic 5, Pro 10, Elite and Lifetime 50).
- `src/config/dataLakeParquetSamples.js`: row caps.
  - `ATHENA_SAMPLE_ROW_LIMIT` (100): signed out and landing demo.
  - `ATHENA_BASIC_QUERY_ROW_LIMIT` (12,500).
  - `ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT` (500,000).
  - `ATHENA_DEMO_ROW_LIMIT` (10): requests flagged `isDemo`, used by the guided hubs.
- `src/components/dashboardComposer/runSheetStage.js`: the `limit` option enforces sheets per run.
- `src/lib/membershipAccess.js`: who has dashboard access.
- `src/lib/landingPageV2Config.js`: pricing page tiers, prices, features and FAQ copy.
- `src/components/dashboardComposer/buildFeatureTips.jsx`: demo tip copy (Data Limits, Sheet limits).
