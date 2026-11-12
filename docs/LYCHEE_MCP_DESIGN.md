# Lychee MCP — Locked Design

Working design for exposing Lychee to Claude, ChatGPT, Cursor, and similar agents.
Status: **locked for v1 direction** after product review. Implementation starts only after
credit numbers / domain / Telegram routing TBDs below are filled, then build order A.

Last updated: Nov 12, 2026 (Asia/Katmandu).

---

## 1. North star

**Lychee MCP is an analytic tool and research partner**, not a bulk data download API.

User asks a question in chat → agent investigates with Lychee tooling → answers with
insight, backed by charts/dashboards in the user’s Lychee workspace → raw full-dataset
download remains possible but is guided, confirmed, and expensive.

One sentence: *agents behave like a skilled teammate who already knows Lychee, so the
user thinks less and still ends up with durable research artifacts on lycheedata.com.*

### Must-win workflows (v1 proof)

1. “Build me a dashboard for market X — holders, interesting activity, some volatility.”
2. “Are there gaps between Kalshi and Polymarket right now?”
3. “What happened in the Brazilian presidential election?” → Kalshi + Polymarket
   historical + news + tweets + holders → intelligence answer + dashboard.

Agents may also merge their own analysis / data-analyst skills into Lychee tiles so
conclusions are stronger than either side alone.

---

## 2. Audience and non-goals

| In scope | Out of scope (v1) |
|---|---|
| Owner, power users, paying members | External developers building competing products on our API |
| People who live in Claude / ChatGPT / Cursor | Public “Lychee for developers” platform |
| Individuals first | Full teams/enterprise (design note only; later) |
| Research, dashboards, stats, publish/share | Trading / order placement on user’s behalf |

Primary goal is **answered questions + composed artifacts**. Data access is a means.
Download is a last resort.

---

## 3. Product principles

1. **Research partner first.** Orient → sample → analyze → compose → materialize.
2. **Never refuse a precise full pull.** Offer to narrow; if they insist → warn, confirm, fulfill (expensive).
3. **Answers are best with charts/dashboards behind them.** In-chat answer + Lychee artifacts.
4. **Starter insight pack, then freeform.** Agents are trusted to pick further analysis for the specific question.
5. **Act as the user.** Create/edit/publish in the same workspace the dashboard uses.
6. **Think less for the user.** Guide filtering, attributes, processing — same spirit as the UI.
7. **Discourage crude dumps via cost and UX**, not hard bans (except abuse/rate limits).
8. **Smart processing over chat dumps.** Heavy data stays in Lychee; chat gets previews, aggregates, links.

---

## 4. Research ladder (canonical agent flow)

When a user asks for something large (e.g. “all NFL 2025 trades on Kalshi and Polymarket”):

| Step | Behavior |
|---|---|
| 1. Orient | Clarify / propose filters (venue, window, market type, settled vs open). Estimate size + credit cost. |
| 2. Sample | Cheap preview (counts, top markets, ~50–100 rows). |
| 3. Insight | Off-the-rip starter pack + question-specific analysis. |
| 4. Compose | Sheets, charts, dashboard tiles in a Lychee project. |
| 5. Materialize | Full prepare / export only if still wanted → warn + confirm + high credits. |

**If they insist on the full dump at step 1:** do not refuse. Warn (size, credits, better path),
require confirmation (unless delegated), then fulfill.

### Starter insight pack (default when relevant)

Agents should try a lightweight pack when the question warrants it, then go deeper:

- Volume / activity shape over the window
- Top movers / notable markets
- Holder concentration or unusual holder activity (when market-scoped)
- Cross-venue gap notes (Kalshi vs Polymarket) when both apply
- One or two charts that make the answer skimmable

Beyond that, the agent chooses pulls and stats that best answer *this* question.

---

## 5. Architecture

### Target shape

```
Claude / ChatGPT / Cursor / plugins
        │  Streamable HTTP + OAuth bearer (token fallback)
        ▼
mcp.lycheedata.com   (dedicated MCP process)
  · OAuth resource server + well-known metadata
  · Tool router
  · Credit meter + rate limits (per key/connection)
  · Confirmation / delegation gate
  · Audit log → Telegram
        │
        ▼
Shared Lychee core
  (same User entitlements, WorkspaceDashboard, DataSet, Chart,
   Athena/Kalshi/Polymarket/news/twitter paths as the web app)
        │
        ▼
lycheedata.com dashboard
  (user sees the same project; agent is a teammate)
```

### Why dedicated MCP hosting

Remote **Streamable HTTP** is the transport Claude/ChatGPT expect. OAuth well-known
docs, long Athena jobs, and stable connections fit a small dedicated Node service better
than only ephemeral serverless routes. The web app remains the product UI; MCP is another
client of the same backend.

### Local MCP

**Out of v1.** No `npx lychee-mcp` requirement. Onboarding is paste a remote URL / connector.

### Sync rule

MCP writes the **same Mongo documents** the web app reads. Agent-created work is a
normal project (not an “Agent” ghetto). Attribution looks like the user / teammate.

**Default project policy**

- Start a **new regular project** unless the user points at an existing one.
- On session start, surface **recent work** so they can continue.
- Presence v1: web app refetches project while open; agent re-reads with revision /
  `updated_at` before write. True CRDT collab (yjs) is later.

---

## 6. Auth

### Primary: OAuth 2.1 for remote MCP

- User pastes MCP URL → client opens browser → Magic/email login → approve Lychee access.
- Access token + refresh; MCP validates bearer on each tool call.
- Support what Claude/ChatGPT/Cursor need (protected-resource metadata, auth-server
  metadata, PKCE, DCR and/or Client ID Metadata Documents as required by each client).

### Fallback: one personal access token per user

- For Cursor / debugging / configs that want a static secret.
- Shown once at create; store hash only; regenerate revokes previous.
- Same entitlements as OAuth connection.

### Not building (v1)

- Multi-key power-user keyrings
- Public developer API keys for third-party apps
- Unauthenticated open MCP

### Confirmations and delegations

Sensitive actions (publish, delete, large materialize/export, and calls over a credit
threshold) return **needs approval** + short link `lycheedata.com/mcp/approve/…`.

User can:

- Approve once
- **Always allow this class** (delegation)
- Deny

Delegations are revocable in Settings → MCP. Defaults: allow research/read/compose;
confirm publish / delete / expensive materialize until delegated.

---

## 7. Entitlements and billing

### Access

- MCP included as a **member entitlement on all paid tiers**.
- Free / signed-in-without-plan: **strict taste** after email onboarding, then upgrade wall.
- Once connected, behavior is gated by **credits**, not by inventing a second parallel
  tier matrix for every tool.

### Credits model (v1)

- Each paid tier gets a **monthly credit allotment** (numbers TBD).
- Free taste gets a small starter allotment (TBD).
- When empty: block expensive tools; return upgrade + **credit pack** links.
- Sell prepaid **token/credit packages** via Stripe Checkout / Payment Links (simpler
  than Stripe Metered Billing for v1). Auto top-up / meters can come later.

### Cost weighting (matches Lychee COGS)

| Class | Relative cost | Examples |
|---|---|---|
| Orient / catalog | Tiny / free | search, list projects, entitlements |
| Sample / compose | Low | previews, create chart/sheet blocks, layout, publish metadata |
| Analyze in-workspace | Medium | quant shortcuts, aggregates on already-pulled sheets |
| Ingest | **High** | Athena/historical pulls, live bulk snapshots, news/tweet ingest, holders at scale |
| Materialize / export | **Highest** | full prepared dumps, bulk export |

Exact credit formula TBD after pricing one representative Athena pull and one compose action.

### Usage UI

In-app usage dashboard: credits remaining, burn by class, recent MCP calls, top-up / upgrade CTAs.

### Audit

Every MCP call logged (user, tool, arg hash / safe summary, rows touched, credits, client).
Ops alerts to **Telegram** (channel TBD — reuse billing chat or dedicated MCP chat).

### Rate limits

Per connection / personal token. Soft daily burn alerts for anomalous usage.

---

## 8. Tool surface (granular tools)

Prefer **many small tools** so the agent is intentional about what it returns.

Grouped by ladder stage. Names are indicative; final names can shorten.

### Orient

- `search_kalshi`, `search_polymarket`, `get_market`, `compare_venues`
- `search_news`, `search_tweets` (cautious quotas)
- `estimate_pull` (row/credit estimate before ingest)
- `list_recent_projects`, `get_entitlements`, `get_usage`

### Sample

- `preview_historical`, `preview_holders`, `preview_live_snapshot`
- `preview_sheet` (schema + ~50–100 rows)
- Return: preview + ids + suggested next filters — not full payloads

### Analyze

- Quant shortcuts (Brier, relative position, lifecycle-style helpers, volatility-oriented summaries)
- `aggregate_sheet`, `sheet_refine` / Athena-backed quant where already built
- Cross-venue gap helpers for Kalshi vs Polymarket questions
- Keep heavy compute server-side; return summaries + artifact refs

### Compose

- `create_project`, `open_project`
- `create_sheet`, `add_sheet_block`, `add_chart_block`, `add_text_block` / conclusion tiles
- Chart config creation that matches existing shadcn / spectrum / recharts / liveline paths
- Layout hints sufficient for a publishable dashboard

### Publish / share

- `publish_project`, `publish_chart`
- Live embed where product already supports it
- `export_chart_image` (OG / PNG / SVG paths)

### Materialize (expensive)

- `pull_historical_full`, `prepare_full_sheet`, `export_dataset`
- Always: size warning + credit quote + confirm (unless delegated)

### Caution list (accessible but watch)

- Twitter (vendor quota)
- Scraper-from-URL
- Password-protected project unlock
- Anything that can blast large exports — meter hard

Everything product-useful can be reachable; nothing is unlocked as a silent firehose.

### What tools return to chat

Prefer: findings, counts, short tables, chart/project URLs, OG previews, next-step options.
Avoid: dumping giant row sets into the model context as the default success path.

---

## 9. Onboarding

1. “Add Lychee to Claude / ChatGPT / Cursor” → copy MCP URL (and optional token for Cursor).
2. Connect → OAuth → email if new (Magic).
3. Free starter credits; run guided taste (small preview + tiny dashboard).
4. Hit limit → clear upgrade / credit-pack CTA in tool result and usage page.
5. Pay → same connection keeps working; artifacts already in their dashboard.

Brand: **Lychee MCP**. Host target: `mcp.lycheedata.com` (or path on main domain if DNS
not ready — TBD).

Distribution: Claude connector, ChatGPT connector/plugin packaging, Cursor MCP config,
plus marketing plugins/listings.

---

## 10. Security posture

| Risk | Mitigation |
|---|---|
| Key / token leak | One token; hash at rest; revoke; OAuth preferred; rate limits; credit burn |
| Bulk scrape / competitor siphon | Research ladder + expensive materialize + audit Telegram |
| Accidental publish/delete | Confirmation + delegations |
| Context-cost blowups | Previews/aggregates by default; hard response size caps |
| Cross-user access | Every tool resolves User from token; ownership checks reuse existing helpers |
| No trading authority | Research/data only; no order placement |

Research-only blast radius is accepted; still treat publish and bulk export as sensitive.

---

## 11. Build order A (approved)

Do **not** boil the ocean. Ship one vertical, then widen.

### Phase 0 — Design lock (this doc)

Fill TBDs below; no product behavior yet.

### Phase 1 — Auth + credits + metering skeleton

- OAuth remote MCP endpoint stub + personal token
- User ↔ connection mapping
- Credit ledger + allotment hooks (even with placeholder numbers)
- Audit → Telegram
- Settings: connect, revoke, usage, delegations

### Phase 2 — One end-to-end research workflow

Pick one must-win path first, recommended:

**Market → holders / activity sample → starter insight → chart + project → publish URL**

Plus: orient tools, preview tools, compose, publish, confirm flow, credit quotes.

Prove: question in Claude → answer with chart/dashboard link → same project visible on web.

### Phase 3 — Expand tool coverage

Historical Athena at scale, news, tweets, cross-venue gaps, quant pack, live embeds,
image export, richer dashboard tiling.

### Phase 4 — Packaging and polish

Claude / ChatGPT / Cursor listings, onboarding copy, usage dashboard UX, credit packs
live in Stripe, anomaly alerts, optional live collab improvements.

---

## 12. Mapping to existing Lychee code (implementation notes)

Reuse; do not fork parallel product logic.

| Concern | Existing anchors |
|---|---|
| Session user / Magic | `src/lib/auth.js`, `src/pages/api/login.js` |
| Membership | `src/lib/membershipAccess.js`, `src/lib/requirePaidMember.js` |
| Athena entitlements | `src/lib/athenaAccess.js`, `src/lib/athenaEntitlement.js` |
| Workspace projects | `src/models/WorkspaceDashboards.js`, `src/pages/api/workspace-dashboards/**` |
| Publish | `WorkspacePublications`, `workspace-dashboards/publish/**`, `api/public/projects/**` |
| Sheets | `DataSets`, `dataSets/**`, Glide UI (UI-only); MCP uses data APIs |
| Charts | `Charts`, `chartBundle.js`, `api/public/charts/**` |
| Kalshi / Polymarket | `api/integrations/kalshi-live/**`, `api/integrations/polymarket/**` |
| News | `api/news/**` |
| Stripe | `src/lib/stripe/**`, webhook success handler |
| Telegram ops | `src/lib/telegram/**` |

**Gap today:** cookie-only browser sessions. MCP needs OAuth/token identity that maps to
the same `User` and entitlement helpers.

---

## 13. Open TBDs (block implementation numbers, not direction)

1. Free taste size (credits and/or “serious pulls”).
2. Monthly allotments for Lite / Pro / Max (and legacy tier mapping).
3. Credit pack prices and sizes ($10 / $40 / $100 as starting strawman).
4. Exact credit weights for one Athena pull vs one compose/publish.
5. Confirm threshold: credit amount that always requires confirm.
6. Telegram destination for MCP audit (existing billing chat vs dedicated).
7. DNS: `mcp.lycheedata.com` vs `lycheedata.com/mcp` for v1.
8. Teams: confirmed out of v1 beyond a design footnote.

---

## 14. Decision log (short)

| Decision | Choice |
|---|---|
| Product role | Research partner / analytic teammate |
| Download policy | Guide → if insist, warn + confirm + expensive fulfill |
| Answer shape | In-chat + charts/dashboards |
| Insight strategy | Basic starter pack + agent-chosen depth |
| Build order | A — vertical slice first |
| Auth | OAuth primary + one PAT |
| Hosting | Remote Streamable HTTP MCP service |
| Billing | Tier allotment + prepaid credit packs |
| Agent writes | Full user power; normal projects; teammate sync |
| Confirmations | Ask; skip-forever delegations; revocable |
| Tool style | Small granular tools |
| Clients | Claude, ChatGPT, Cursor (+ listings/plugins) |

---

## 15. Next step after TBD fill

Implement Phase 1 skeleton on branch `cursor/mcp-678e`, then Phase 2 vertical slice.
Do not expand to full tool coverage until the vertical slice answers a real research
question end-to-end with credits, confirm, and dashboard sync.
