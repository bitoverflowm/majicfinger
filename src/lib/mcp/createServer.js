import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runMcpTool } from "@/lib/mcp/runTool";
import { guidancePreamble, textResult } from "@/lib/mcp/toolResult";
import { lycheeMcpInstructions } from "@/lib/mcp/instructions";
import {
  catalogCapabilities,
  estimatePullSize,
  getKalshiMarket,
  getLookalikeMarkets,
  getMostActivePolymarketMarkets,
  getPolymarketHolders,
  getPolymarketMarketByCondition,
  getPolymarketOpenInterest,
  getPolymarketOrderbook,
  getPolymarketPrices,
  getPolymarketTrader,
  getPolymarketTradesPreview,
  resolveDatasetPull,
  searchClosedPolymarketMarkets,
  searchKalshi,
  searchPolymarket,
} from "@/lib/mcp/data/providers";
import { getFlowsCatalog, findFlow } from "@/lib/mcp/data/flowsCatalog";
import { compareVenues } from "@/lib/mcp/data/compareVenues";
import { runHolderAnalysisRecipe, runTradeHistoryRecipe } from "@/lib/mcp/data/recipes";
import { catalogRealtimeFeeds, getRealtimeSnapshot } from "@/lib/mcp/data/realtime";
import { findCrazyWorkflow, listCrazyWorkflows, pitchCrazyWorkflows } from "@/lib/mcp/data/crazyWorkflows";
import { jarvisPowerUpPayload, jarvisPulse } from "@/lib/mcp/data/jarvis";
import {
  getLatestPendingConfirmation,
  listPendingConfirmations,
  resolvePendingConfirmation,
} from "@/lib/mcp/confirm";
import { analyzeCalibration, analyzeHolders, analyzeTape } from "@/lib/mcp/data/stats";
import { analyzeTraderTheme } from "@/lib/mcp/data/traderTheme";
import { searchNewsHeadlines } from "@/lib/mcp/data/news";
import { lycheePlatformGuide } from "@/lib/mcp/data/platformGuide";
import { getLycheeSkillScore } from "@/lib/mcp/data/traderScoreMcp";
import {
  addInsightBlocks,
  addSheetWithChart,
  createResearchProject,
  listRecentProjects,
  openProject,
  publishProject,
  pullMarketBundleIntoProject,
  pullTraderBundleIntoProject,
} from "@/lib/mcp/workspace";
import { getCreditSnapshot, recentLedger } from "@/lib/mcp/credits";
import { listDelegations } from "@/lib/mcp/confirm";
import { MCP_ACTION_CLASSES, mcpResourceUrl } from "@/lib/mcp/config";
import { getSiteUrl } from "@/lib/site";

/**
 * @param {object} actor resolveMcpActor result
 */
export function createLycheeMcpServer(actor) {
  const server = new McpServer(
    {
      name: "lychee-mcp",
      version: "0.8.1",
    },
    {
      instructions: lycheeMcpInstructions(),
    },
  );

  server.registerResource(
    "lychee-instructions",
    "lychee://instructions",
    {
      description: "Standing instructions for the Lychee research assistant walkthrough.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [{ uri: "lychee://instructions", mimeType: "text/plain", text: lycheeMcpInstructions() }],
    }),
  );

  server.registerResource(
    "lychee-tools",
    "lychee://tools",
    {
      description: "Catalog of Lychee MCP tools and live dataset counts.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "lychee://tools",
          mimeType: "application/json",
          text: JSON.stringify(catalogCapabilities(), null, 2),
        },
      ],
    }),
  );

  server.registerPrompt(
    "lychee_research",
    {
      description: "Walk the user through a Lychee research session: sources → charts → analysis → questions → publish.",
      argsSchema: {
        question: z.string(),
      },
    },
    ({ question }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              lycheeMcpInstructions(),
              "",
              `Question: ${question}`,
              "",
              "Execute as a Lychee assistant walkthrough:",
              "0) Ask: Would you like to turn Jarvis mode on? If yes → jarvis_on + jarvis_pulse",
              "1) If still open-ended: list_crazy_workflows → pitch 3 options, then wait (unless they said pick for me)",
              "2) Briefly restate the plan",
              "3) Orient (list_research_flows / search / closed markets as needed) — keep ids",
              "4) Pull + compose Lychee charts early; SHOW inline chart images; PASTE share.open_now_markdown",
              "5) Analyze on FULL rows (holders/tape/calibration) — not tiny previews",
              "6) Narrate sources used; ask one steering question; suggest next pulls",
              "7) Offer publish_project when shareable — PASTE publication.url + og_image_url",
              "Never scrape venue HTML. Never invent empty chart shells.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "lychee_jarvis",
    {
      description: "Turn on Jarvis proactive mode: power-up animation + ongoing interesting-market pulses.",
      argsSchema: {
        focus: z.string().optional(),
      },
    },
    ({ focus } = {}) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              lycheeMcpInstructions(),
              "",
              "Turn Jarvis mode ON now.",
              "1) Call jarvis_on and show the power-up animation in your reply",
              "2) Call jarvis_pulse and narrate 1–3 alerts like \"hey — something interesting is happening on …\"",
              focus ? `3) Prefer focus: ${focus}` : "3) Cover both Polymarket and Kalshi when possible",
              "4) Keep calling jarvis_pulse at the start of every later turn while Jarvis stays on",
              "5) When I pick an alert: pull_market_bundle with inline charts + full-row analysis",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "lychee_crazy_workflows",
    {
      description: "Pitch ambitious Lychee workflows, then run the one the user picks.",
      argsSchema: {
        pick: z.string().optional(),
      },
    },
    ({ pick } = {}) => {
      const chosen = pick ? findCrazyWorkflow(pick) : null;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: [
                lycheeMcpInstructions(),
                "",
                chosen
                  ? [
                      `User picked crazy workflow: ${chosen.vibe} (${chosen.id})`,
                      chosen.hook,
                      "",
                      "Execute that workflow now:",
                      chosen.prompt,
                    ].join("\n")
                  : [
                      "Open-ended session from the Lychee connect page.",
                      "1) Call list_crazy_workflows",
                      "2) Pitch 3 ambitious workflows (title + hook) — do not run them yet",
                      "3) Ask which to run (or offer to pick)",
                      "4) After they choose, execute with charts early + PASTE links",
                    ].join("\n"),
              ].join("\n"),
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "lychee_bot_poll",
    {
      description: "Drive a trading bot off Lychee realtime snapshots (poll MCP; no vendor WS held open).",
      argsSchema: {
        condition_id: z.string().optional(),
        ticker: z.string().optional(),
        feed: z.string().optional(),
      },
    },
    ({ condition_id, ticker, feed }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              lycheeMcpInstructions(),
              "",
              "Bot poll mode:",
              "1) list_realtime_feeds",
              `2) Loop get_realtime_snapshot with feed=${feed || "polymarket:trades|orderbook|prices or kalshi:market"}`,
              condition_id ? `   condition_id=${condition_id}` : "   condition_id=… for Polymarket feeds",
              ticker ? `   ticker=${ticker}` : "   ticker=… for Kalshi feeds",
              "3) Drive bot logic from snapshot JSON; respect bot_poll_hint_ms",
              "4) Optional human side: pull_and_compose + PASTE dashboard_url",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "lychee_calibration",
    {
      description: "Calibration / Brier research on settled Polymarket races using Lychee prices + outcomes.",
      argsSchema: {
        theme: z.string(),
      },
    },
    ({ theme }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              lycheeMcpInstructions(),
              "",
              `Theme: ${theme}`,
              "",
              "1) search_closed_markets for settled races (winner / yes_won included)",
              "2) For each race (or a sample), preview_prices and take the last YES price at/before your horizon",
              "3) Build rows { forecast, outcome_won, label } and call analyze_calibration",
              "4) pull_and_compose / add_sheet_with_chart for reliability bands; add_insight_blocks",
              "5) Walk the user through sources + Brier; ask if they want another horizon (7d vs 24h)",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  // Register Jarvis FIRST — ChatGPT often caches/truncates tool lists; early tools survive.
  server.registerTool(
    "jarvis_on",
    {
      description:
        "Turn Jarvis proactive mode on. Returns a Jarvis power-up animation (inline image). Ask first: Would you like to turn Jarvis mode on? If this tool seems missing, call list_capabilities with action=jarvis_on instead — never say 'not exposed'.",
    },
    async () =>
      runMcpTool(actor, {
        tool: "jarvis_on",
        actionClass: "orient",
        args: {},
        handler: async () => ({
          ...guidancePreamble(),
          ...jarvisPowerUpPayload(),
        }),
      }),
  );

  server.registerTool(
    "jarvis_pulse",
    {
      description:
        "While Jarvis is on: scan Lychee for interesting Polymarket/Kalshi action and return unprompted alerts. Call at the start of every turn in Jarvis mode. Fallback: list_capabilities action=jarvis_pulse.",
      inputSchema: {
        limit: z.number().int().min(3).max(15).optional(),
      },
    },
    async ({ limit = 8 } = {}) =>
      runMcpTool(actor, {
        tool: "jarvis_pulse",
        actionClass: "orient",
        args: { limit },
        handler: async () => ({
          ...guidancePreamble(),
          ...(await jarvisPulse({ limit })),
        }),
      }),
  );

  server.registerTool(
    "list_capabilities",
    {
      description:
        "Short catalog of Lychee MCP tools + best practices. ALSO: action=platform for Lychee platform nuances (attributes, filters, joins, Skill Score, news archive). ALSO Jarvis escape hatch: action=jarvis_on / jarvis_pulse if dedicated tools are missing from this chat's tool list.",
      inputSchema: {
        action: z.enum(["catalog", "platform", "jarvis_on", "jarvis_pulse"]).optional(),
        limit: z.number().int().min(3).max(15).optional(),
      },
    },
    async ({ action = "catalog", limit = 8 } = {}) => {
      if (action === "platform") {
        return textResult({
          ...guidancePreamble(),
          via: "list_capabilities.action=platform",
          ...lycheePlatformGuide(),
        });
      }
      if (action === "jarvis_on") {
        return runMcpTool(actor, {
          tool: "list_capabilities",
          actionClass: "orient",
          args: { action },
          handler: async () => ({
            ...guidancePreamble(),
            via: "list_capabilities.action=jarvis_on",
            note: "Jarvis activated through list_capabilities escape hatch (ChatGPT tool-list cache workaround).",
            ...jarvisPowerUpPayload(),
          }),
        });
      }
      if (action === "jarvis_pulse") {
        return runMcpTool(actor, {
          tool: "list_capabilities",
          actionClass: "orient",
          args: { action, limit },
          handler: async () => ({
            ...guidancePreamble(),
            via: "list_capabilities.action=jarvis_pulse",
            ...(await jarvisPulse({ limit })),
          }),
        });
      }
      return textResult({
        ...guidancePreamble(),
        ...catalogCapabilities(),
        jarvis_escape_hatch:
          "If jarvis_on / jarvis_pulse are missing from your tool list, call THIS tool with action=jarvis_on or action=jarvis_pulse. Do not tell the user the tools are not exposed.",
        resource: mcpResourceUrl(),
        site: getSiteUrl(),
        user: {
          email: actor.user?.email || null,
          handle: actor.user?.user_name || null,
          owner_unlimited_credits: actor.isOwner,
          membership: actor.hasMembership,
        },
      });
    },
  );

  server.registerTool(
    "explain_lychee_platform",
    {
      description:
        "How Lychee really works for agents: pull attributes vs display columns, filters (OPEN/CLOSED), joins/buckets/aggs, wallet depth, Lychee Skill Score, news archive. Call when a pull looks like 'metadata only' or before deep wallet research — never invent lesson snapshots.",
      inputSchema: {},
    },
    async () =>
      runMcpTool(actor, {
        tool: "explain_lychee_platform",
        actionClass: "orient",
        args: {},
        handler: async () => ({
          ...guidancePreamble(),
          ...lycheePlatformGuide(),
        }),
      }),
  );

  server.registerTool(
    "list_research_flows",
    {
      description:
        "Named composable research paths (live/partial/next). Call this to pick a flow instead of inventing scrapes.",
      inputSchema: {
        status: z.enum(["live", "partial", "next"]).optional(),
        flow_id: z.string().max(80).optional(),
      },
    },
    async ({ status, flow_id } = {}) =>
      runMcpTool(actor, {
        tool: "list_research_flows",
        actionClass: "orient",
        args: { status, flow_id },
        handler: async () => {
          if (flow_id) {
            const flow = findFlow(flow_id);
            if (!flow) throw new Error(`Unknown flow_id ${flow_id}`);
            return { ...guidancePreamble(), flow };
          }
          return { ...guidancePreamble(), ...getFlowsCatalog({ status }) };
        },
      }),
  );

  server.registerTool(
    "list_datasets",
    {
      description: "Every Lychee dataset id an agent can pull (status live/partial/next) with chart_view hints.",
      inputSchema: {
        status: z.enum(["live", "partial", "next"]).optional(),
        venue: z.enum(["polymarket", "kalshi", "athena", "news", "twitter", "price_stream"]).optional(),
      },
    },
    async ({ status, venue } = {}) =>
      runMcpTool(actor, {
        tool: "list_datasets",
        actionClass: "orient",
        args: { status, venue },
        handler: async () => {
          const catalog = getFlowsCatalog({ status });
          const datasets = venue
            ? catalog.datasets.filter((d) => d.venue === venue)
            : catalog.datasets;
          return {
            ...guidancePreamble(),
            datasets,
            next: "Use pull_and_compose with a live dataset id + required key (condition_id / ticker / proxy_wallet).",
          };
        },
      }),
  );

  server.registerTool(
    "list_crazy_workflows",
    {
      description:
        "Ambitious copy-paste research workflows for connect-page / first-turn pitches. Call this when the user is open-ended, then pitch 3 before heavy pulls.",
      inputSchema: {
        workflow_id: z.string().max(80).optional(),
        pitch_limit: z.number().int().min(1).max(8).optional(),
      },
    },
    async ({ workflow_id, pitch_limit = 3 } = {}) =>
      runMcpTool(actor, {
        tool: "list_crazy_workflows",
        actionClass: "orient",
        args: { workflow_id, pitch_limit },
        handler: async () => {
          if (workflow_id) {
            const detail = listCrazyWorkflows({ id: workflow_id });
            const full = findCrazyWorkflow(workflow_id);
            return {
              ...guidancePreamble(),
              ...detail,
              prompt: full?.prompt || null,
              next: full
                ? "Execute this workflow now — charts early, PASTE links, ask, suggest next."
                : "Unknown id — call list_crazy_workflows without workflow_id.",
            };
          }
          return {
            ...guidancePreamble(),
            ...listCrazyWorkflows(),
            pitch_now: pitchCrazyWorkflows(pitch_limit),
            suggest_next: [
              { note: "Pitch the 3 items in pitch_now to the user (title + hook), then wait for a pick" },
              { tool: "get_most_active_markets", why: "If they say pick for me → start whale war room" },
            ],
          };
        },
      }),
  );

  server.registerTool(
    "list_pending_approvals",
    {
      description:
        "List open MCP confirmations for this user (publish / expensive pulls). When the user says approve, call approve_pending.",
      inputSchema: {
        limit: z.number().int().min(1).max(10).optional(),
      },
    },
    async ({ limit = 5 } = {}) =>
      runMcpTool(actor, {
        tool: "list_pending_approvals",
        actionClass: "orient",
        args: { limit },
        handler: async () => {
          const rows = await listPendingConfirmations(actor.userId, { limit });
          return {
            ...guidancePreamble(),
            pending: rows.map((r) => ({
              confirmation_token: r.token,
              tool: r.tool,
              action_class: r.action_class,
              credit_quote: r.credit_quote,
              summary: r.summary,
              expires_at: r.expires_at,
            })),
            next: rows.length
              ? "User can say approve → call approve_pending, then retry the original tool with confirmation_token."
              : "No open approvals.",
          };
        },
      }),
  );

  server.registerTool(
    "approve_pending",
    {
      description:
        "Approve or deny the latest (or specified) MCP confirmation when the user says approve / deny / always allow in chat — no need to open the Lychee approve page.",
      inputSchema: {
        confirmation_token: z.string().max(80).optional(),
        decision: z.enum(["approve", "deny"]).optional(),
        allow_forever: z.boolean().optional(),
      },
    },
    async ({ confirmation_token = "", decision = "approve", allow_forever = false } = {}) =>
      runMcpTool(actor, {
        tool: "approve_pending",
        actionClass: "orient",
        args: { confirmation_token, decision, allow_forever },
        handler: async () => {
          let token = String(confirmation_token || "").trim();
          if (!token) {
            const latest = await getLatestPendingConfirmation(actor.userId);
            if (!latest) {
              return {
                ...guidancePreamble(),
                status: "none",
                message: "No pending MCP approval to resolve. Ask the user what they wanted to run.",
              };
            }
            token = latest.token;
          }
          const approve = decision !== "deny";
          const pending = await resolvePendingConfirmation(token, actor.userId, {
            approve,
            allowForever: !!(approve && allow_forever),
          });
          return {
            ...guidancePreamble(),
            status: approve ? "approved" : "denied",
            confirmation_token: token,
            tool: pending.tool,
            action_class: pending.action_class,
            allow_forever: !!(approve && allow_forever),
            next: approve
              ? `Retry ${pending.tool} now with confirmation_token=\"${token}\".`
              : "User denied. Do not retry unless they ask again.",
          };
        },
      }),
  );

  server.registerTool(
    "list_realtime_feeds",
    {
      description:
        "Catalog Lychee realtime / live feeds for research + trading bots. MCP cannot hold vendor websockets — bots poll get_realtime_snapshot.",
    },
    async () =>
      runMcpTool(actor, {
        tool: "list_realtime_feeds",
        actionClass: "orient",
        args: {},
        handler: async () => ({
          ...guidancePreamble(),
          ...catalogRealtimeFeeds(),
          suggest_next: [
            { tool: "get_realtime_snapshot", why: "Poll trades/book/prices for a condition_id or ticker" },
            { tool: "pull_and_compose", why: "Optional human charts alongside the bot loop" },
          ],
        }),
      }),
  );

  server.registerTool(
    "get_realtime_snapshot",
    {
      description:
        "One-shot live snapshot for bots (poll on an interval). Feeds: polymarket:trades, polymarket:orderbook, polymarket:prices, kalshi:market. Returns bot_poll_hint_ms + optional vendor_socket URL.",
      inputSchema: {
        feed: z.string().min(2).max(80),
        condition_id: z.string().max(80).optional(),
        ticker: z.string().max(80).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ feed, condition_id, ticker, limit = 50 }) =>
      runMcpTool(actor, {
        tool: "get_realtime_snapshot",
        actionClass: "sample",
        args: { feed, condition_id, ticker, limit },
        rows: limit,
        summary: `Realtime snapshot ${feed}`,
        handler: async () => ({
          ...guidancePreamble(),
          ...(await getRealtimeSnapshot({ feed, condition_id, ticker, limit })),
          suggest_next: [
            { tool: "get_realtime_snapshot", why: "Poll again after bot_poll_hint_ms" },
            { tool: "pull_and_compose", why: "Land a research chart for the human" },
          ],
        }),
      }),
  );

  server.registerTool(
    "lychee_about",
    {
      description:
        "Short orientation for Lychee MCP. Optional action=jarvis_on / jarvis_pulse if dedicated Jarvis tools are missing from this chat.",
      inputSchema: {
        action: z.enum(["about", "jarvis_on", "jarvis_pulse"]).optional(),
        limit: z.number().int().min(3).max(15).optional(),
      },
    },
    async ({ action = "about", limit = 8 } = {}) => {
      if (action === "jarvis_on") {
        return runMcpTool(actor, {
          tool: "lychee_about",
          actionClass: "orient",
          args: { action },
          handler: async () => ({
            ...guidancePreamble(),
            via: "lychee_about.action=jarvis_on",
            ...jarvisPowerUpPayload(),
          }),
        });
      }
      if (action === "jarvis_pulse") {
        return runMcpTool(actor, {
          tool: "lychee_about",
          actionClass: "orient",
          args: { action, limit },
          handler: async () => ({
            ...guidancePreamble(),
            via: "lychee_about.action=jarvis_pulse",
            ...(await jarvisPulse({ limit })),
          }),
        });
      }
      return textResult({
        ...guidancePreamble(),
        ...catalogCapabilities(),
        jarvis_escape_hatch:
          "Missing jarvis_* tools? Call lychee_about or list_capabilities with action=jarvis_on / jarvis_pulse.",
        resource: mcpResourceUrl(),
        site: getSiteUrl(),
      });
    },
  );

  server.registerTool(
    "get_usage",
    {
      description: "MCP credit balance, recent spend, and delegations.",
    },
    async () => {
      const [usage, ledger, delegations] = await Promise.all([
        getCreditSnapshot(actor.userId),
        recentLedger(actor.userId, 15),
        listDelegations(actor.userId),
      ]);
      return textResult({
        usage,
        recent_ledger: ledger.map((row) => ({
          delta: row.delta,
          reason: row.reason,
          tool: row.tool,
          class: row.class,
          at: row.createdAt,
          unlimited_account: row.unlimited_account,
        })),
        delegations: delegations.map((d) => d.action_class),
        connect_url: `${getSiteUrl()}/mcp`,
      });
    },
  );

  server.registerTool(
    "list_recent_projects",
    {
      description: "List recent Lychee projects (with correct dashboard_url using ?workspace=).",
      inputSchema: {
        limit: z.number().int().min(1).max(30).optional(),
      },
    },
    async ({ limit }) =>
      runMcpTool(actor, {
        tool: "list_recent_projects",
        actionClass: "orient",
        args: { limit },
        handler: async () => ({
          ...guidancePreamble(),
          projects: await listRecentProjects(actor.userId, { limit }),
        }),
      }),
  );

  server.registerTool(
    "get_most_active_markets",
    {
      description: "Rank open Polymarket markets by 24h volume. Returns condition_id + pull hints.",
      inputSchema: {
        limit: z.number().int().min(1).max(40).optional(),
      },
    },
    async ({ limit = 15 }) =>
      runMcpTool(actor, {
        tool: "get_most_active_markets",
        actionClass: "orient",
        args: { limit },
        handler: async () => ({
          as_of: new Date().toISOString(),
          markets: await getMostActivePolymarketMarkets({ limit }),
          next: "Call pull_market_bundle with the top condition_id, then get_lookalike_markets.",
          suggest_next: [
            { tool: "pull_market_bundle", why: "Land holders+trades charts for #1" },
            { tool: "get_lookalike_markets", why: "Related deadlines" },
            { tool: "search_closed_markets", why: "If the question needs settled outcomes / calibration" },
          ],
        }),
      }),
  );

  server.registerTool(
    "search_closed_markets",
    {
      description:
        "Search settled/closed Polymarket markets with winner / yes_won when available. Use for calibration, postmortems, Brier.",
      inputSchema: {
        query: z.string().min(2).max(200),
        limit: z.number().int().min(1).max(40).optional(),
      },
    },
    async ({ query, limit = 20 }) =>
      runMcpTool(actor, {
        tool: "search_closed_markets",
        actionClass: "orient",
        args: { query, limit },
        summary: `Search closed markets "${query}"`,
        handler: async () => ({
          query,
          markets: await searchClosedPolymarketMarkets(query, { limit }),
          next: "preview_prices per condition_id → build forecast rows → analyze_calibration → compose charts.",
          suggest_next: [
            { tool: "preview_prices", why: "YES price history for a forecast horizon" },
            { tool: "analyze_calibration", why: "Brier + reliability bands from forecast/outcome rows" },
            { tool: "pull_and_compose", why: "Land reliability chart_rows in Lychee" },
          ],
        }),
      }),
  );

  server.registerTool(
    "search_markets",
    {
      description: "Search Kalshi and/or Polymarket. Each hit includes a pull hint when possible.",
      inputSchema: {
        query: z.string().min(2).max(200),
        venue: z.enum(["both", "kalshi", "polymarket"]).optional(),
        limit: z.number().int().min(1).max(25).optional(),
      },
    },
    async ({ query, venue = "both", limit = 10 }) =>
      runMcpTool(actor, {
        tool: "search_markets",
        actionClass: "orient",
        args: { query, venue, limit },
        summary: `Search markets for "${query}"`,
        handler: async () => {
          const [kalshi, polymarket] = await Promise.all([
            venue === "polymarket" ? [] : searchKalshi(query, { limit }),
            venue === "kalshi" ? [] : searchPolymarket(query, { limit }),
          ]);
          return {
            ...guidancePreamble(),
            query,
            kalshi,
            polymarket,
            next: "Use condition_id with pull_market_bundle / preview_holders. Use get_lookalike_markets for related deadlines.",
          };
        },
      }),
  );

  server.registerTool(
    "get_lookalike_markets",
    {
      description: "Related contracts in the same Polymarket event (different deadlines / linked questions).",
      inputSchema: {
        condition_id: z.string().min(8).max(120).optional(),
        event_slug: z.string().min(2).max(200).optional(),
        limit: z.number().int().min(1).max(30).optional(),
      },
    },
    async ({ condition_id, event_slug, limit = 12 }) =>
      runMcpTool(actor, {
        tool: "get_lookalike_markets",
        actionClass: "orient",
        args: { condition_id, event_slug, limit },
        handler: async () => ({
          ...guidancePreamble(),
          ...(await getLookalikeMarkets({ conditionId: condition_id, eventSlug: event_slug, limit })),
        }),
      }),
  );

  server.registerTool(
    "estimate_pull",
    {
      description: "Estimate size/cost guidance before a large pull.",
      inputSchema: {
        venue: z.string().optional(),
        query: z.string().optional(),
        rows_requested: z.number().int().min(1).max(500000).optional(),
      },
    },
    async ({ venue, query, rows_requested }) =>
      runMcpTool(actor, {
        tool: "estimate_pull",
        actionClass: "orient",
        args: { venue, query, rows_requested },
        rows: rows_requested || 0,
        handler: async () => ({
          ...(await estimatePullSize({ venue, query, rowsRequested: rows_requested })),
          ...guidancePreamble(),
        }),
      }),
  );

  server.registerTool(
    "compare_venues",
    {
      description:
        "Kalshi ↔ Polymarket gap scan. Pass Kalshi ticker, Polymarket condition_id, or a free-text query. Returns matched candidates + pull hints (no scraping).",
      inputSchema: {
        query: z.string().min(2).max(200).optional(),
        ticker: z.string().min(2).max(80).optional(),
        condition_id: z.string().min(8).max(120).optional(),
        limit: z.number().int().min(1).max(20).optional(),
      },
    },
    async ({ query, ticker, condition_id, limit = 8 }) =>
      runMcpTool(actor, {
        tool: "compare_venues",
        actionClass: "orient",
        args: { query, ticker, condition_id, limit },
        summary: `Compare venues ${ticker || condition_id || query || ""}`,
        handler: async () => ({
          ...guidancePreamble(),
          ...(await compareVenues({ query, ticker, conditionId: condition_id, limit })),
        }),
      }),
  );

  server.registerTool(
    "preview_holders",
    {
      description:
        "Pull Polymarket holders via Lychee (Data API v2, flattened). Requires condition_id. Errors if empty — do not scrape.",
      inputSchema: {
        condition_id: z.string().min(8).max(120),
        limit: z.number().int().min(1).max(2000).optional(),
      },
    },
    async ({ condition_id, limit = 500 }) =>
      runMcpTool(actor, {
        tool: "preview_holders",
        actionClass: "sample",
        args: { condition_id, limit },
        rows: limit,
        summary: `Preview holders for ${condition_id}`,
        handler: async () => {
          const holders = await getPolymarketHolders(condition_id, { limit, includePnl: false });
          return {
            ...guidancePreamble(),
            holders,
            starter_insight: analyzeHolders(holders.rows),
          };
        },
      }),
  );

  server.registerTool(
    "preview_market_activity",
    {
      description:
        "Pull recent Polymarket trades via Lychee (full analysis rows). Requires condition_id. Errors if empty — do not scrape.",
      inputSchema: {
        condition_id: z.string().min(8).max(120),
        limit: z.number().int().min(1).max(2000).optional(),
      },
    },
    async ({ condition_id, limit = 500 }) =>
      runMcpTool(actor, {
        tool: "preview_market_activity",
        actionClass: "sample",
        args: { condition_id, limit },
        rows: limit,
        summary: `Preview activity for ${condition_id}`,
        handler: async () => {
          const trades = await getPolymarketTradesPreview(condition_id, { limit });
          return {
            ...guidancePreamble(),
            ...trades,
            starter_insight: analyzeTape(trades.rows),
          };
        },
      }),
  );

  server.registerTool(
    "preview_prices",
    {
      description: "Pull Polymarket CLOB price history for a condition_id (uses clob_token_ids). Errors if empty — do not scrape.",
      inputSchema: {
        condition_id: z.string().min(8).max(120),
        limit: z.number().int().min(10).max(500).optional(),
        interval: z.string().max(20).optional(),
      },
    },
    async ({ condition_id, limit = 200, interval = "1d" }) =>
      runMcpTool(actor, {
        tool: "preview_prices",
        actionClass: "sample",
        args: { condition_id, limit, interval },
        summary: `Preview prices for ${condition_id}`,
        handler: async () => ({
          ...guidancePreamble(),
          ...(await getPolymarketPrices(condition_id, { limit, interval })),
        }),
      }),
  );

  server.registerTool(
    "preview_orderbook",
    {
      description: "Pull Polymarket CLOB order book levels for a condition_id.",
      inputSchema: {
        condition_id: z.string().min(8).max(120),
      },
    },
    async ({ condition_id }) =>
      runMcpTool(actor, {
        tool: "preview_orderbook",
        actionClass: "sample",
        args: { condition_id },
        summary: `Preview order book for ${condition_id}`,
        handler: async () => ({
          ...guidancePreamble(),
          ...(await getPolymarketOrderbook(condition_id)),
        }),
      }),
  );

  server.registerTool(
    "preview_open_interest",
    {
      description: "Pull Polymarket open interest for a condition_id.",
      inputSchema: {
        condition_id: z.string().min(8).max(120),
      },
    },
    async ({ condition_id }) =>
      runMcpTool(actor, {
        tool: "preview_open_interest",
        actionClass: "sample",
        args: { condition_id },
        handler: async () => ({
          ...guidancePreamble(),
          ...(await getPolymarketOpenInterest(condition_id)),
        }),
      }),
  );

  server.registerTool(
    "preview_trader",
    {
      description:
        "Pull FULL Polymarket wallet records (not metadata): open positions + activity + PnL equity curve. Set include_closed=true for finished/CLOSED positions. Prefer pull_trader_bundle to land charts. Never magic-link login; never substitute lesson snapshots.",
      inputSchema: {
        proxy_wallet: z.string().min(40).max(64),
        limit: z.number().int().min(10).max(200).optional(),
        include_closed: z.boolean().optional(),
      },
    },
    async ({ proxy_wallet, limit = 50, include_closed = false }) =>
      runMcpTool(actor, {
        tool: "preview_trader",
        actionClass: "sample",
        args: { proxy_wallet, limit, include_closed },
        summary: `Preview trader ${proxy_wallet}`,
        handler: async () => ({
          ...guidancePreamble(),
          ...(await getPolymarketTrader(proxy_wallet, {
            limit,
            includeClosed: !!include_closed,
          })),
        }),
      }),
  );

  server.registerTool(
    "pull_trader_bundle",
    {
      description:
        "One-shot trader compose: open positions + optional CLOSED history + activity + PnL portfolio sheets with Lychee-styled chat charts. Full wallet records land as sheets — not metadata stubs.",
      inputSchema: {
        proxy_wallet: z.string().min(40).max(64),
        project_id: z.string().min(8).max(40).optional(),
        project_name: z.string().max(120).optional(),
        label: z.string().max(80).optional(),
        limit: z.number().int().min(10).max(200).optional(),
        include_closed: z.boolean().optional(),
      },
    },
    async (args) =>
      runMcpTool(actor, {
        tool: "pull_trader_bundle",
        actionClass: "sample",
        args,
        summary: `Trader bundle ${args.proxy_wallet}`,
        handler: async () => {
          const includeClosed = args.include_closed !== false;
          const trader = await getPolymarketTrader(args.proxy_wallet, {
            limit: args.limit || 80,
            includeClosed,
          });
          const composed = await pullTraderBundleIntoProject(actor.userId, {
            projectId: args.project_id || "",
            projectName: args.project_name || "",
            proxyWallet: args.proxy_wallet,
            label: args.label || "",
            positions: trader.positions,
            closedPositions: trader.closed_positions || [],
            activity: trader.activity,
            pnl: trader.pnl,
            analysisMarkdown: trader.pnl_summary
              ? `## ${args.label || args.proxy_wallet}\n\n- Economic PnL (last): **${trader.pnl_summary.economic_pnl}**\n- PnL points: ${trader.pnl_summary.points}\n- Open: ${trader.positions.length} · Closed: ${(trader.closed_positions || []).length} · Activity: ${trader.activity.length}`
              : "",
          });
          return {
            ...guidancePreamble(),
            trader_summary: {
              proxy_wallet: trader.proxy_wallet,
              pnl_summary: trader.pnl_summary,
              positions: trader.positions.length,
              closed_positions: (trader.closed_positions || []).length,
              activity: trader.activity.length,
              pnl_points: trader.pnl.length,
            },
            composed,
            chart_images: composed.chart_images || [],
            next: "SHOW chart images. Call get_lychee_skill_score + analyze_trader_theme + search_news. Prefer publish_project — never magic-link or lesson snapshots.",
          };
        },
      }),
  );

  server.registerTool(
    "get_lychee_skill_score",
    {
      description:
        "Lychee Skill Score (−100…100) for a proxy_wallet from finished (CLOSED + redeemable) positions. ±20 ≈ two-sigma. Use for 'is this whale skilled?' — not open-book size alone.",
      inputSchema: {
        proxy_wallet: z.string().min(40).max(64),
        exclude_condition_id: z.string().min(8).max(120).optional(),
      },
    },
    async (args) =>
      runMcpTool(actor, {
        tool: "get_lychee_skill_score",
        actionClass: "analyze",
        args,
        summary: `Skill Score ${args.proxy_wallet}`,
        handler: async () => ({
          ...guidancePreamble(),
          ...(await getLycheeSkillScore(args.proxy_wallet, {
            exclude_condition_id: args.exclude_condition_id || "",
          })),
        }),
      }),
  );

  server.registerTool(
    "analyze_trader_theme",
    {
      description:
        "Score a wallet on a theme (default Fed/rates): match activity/positions, settle hit-rate on closed markets, list open theme exposure. Use after preview_trader when user asks win/loss history on Fed markets.",
      inputSchema: {
        proxy_wallet: z.string().min(40).max(64),
        theme: z.string().max(80).optional(),
        limit: z.number().int().min(20).max(200).optional(),
        max_markets: z.number().int().min(3).max(24).optional(),
      },
    },
    async (args) =>
      runMcpTool(actor, {
        tool: "analyze_trader_theme",
        actionClass: "analyze",
        args,
        summary: `Theme score ${args.proxy_wallet}`,
        handler: async () => ({
          ...guidancePreamble(),
          ...(await analyzeTraderTheme(args.proxy_wallet, {
            theme: args.theme || "fed",
            limit: args.limit || 120,
            maxMarkets: args.max_markets || 12,
          })),
        }),
      }),
  );

  server.registerTool(
    "search_news",
    {
      description:
        "Lychee news headlines for overlays. Prefers news archive (Athena gdelt_news_articles) when configured; else Google News / GDELT. Pair with analyze_trader_theme timestamps. source=auto|archive|google|gdelt.",
      inputSchema: {
        terms: z.array(z.string()).optional(),
        query: z.string().max(200).optional(),
        days: z.number().int().min(1).max(90).optional(),
        limit: z.number().int().min(5).max(80).optional(),
        source: z.enum(["auto", "archive", "google", "gdelt"]).optional(),
      },
    },
    async (args) =>
      runMcpTool(actor, {
        tool: "search_news",
        actionClass: "sample",
        args,
        summary: `News ${args.query || (args.terms || []).join(",")}`,
        handler: async () => ({
          ...guidancePreamble(),
          ...(await searchNewsHeadlines(args)),
        }),
      }),
  );

  server.registerTool(
    "preview_kalshi_market",
    {
      description: "Pull a Kalshi live market snapshot by ticker.",
      inputSchema: {
        ticker: z.string().min(2).max(80),
      },
    },
    async ({ ticker }) =>
      runMcpTool(actor, {
        tool: "preview_kalshi_market",
        actionClass: "sample",
        args: { ticker },
        summary: `Preview Kalshi ${ticker}`,
        handler: async () => ({
          ...guidancePreamble(),
          ...(await getKalshiMarket(ticker)),
        }),
      }),
  );

  server.registerTool(
    "analyze_holders",
    {
      description:
        "Concentration, imbalance, risk checklist, and trade hypotheses from holder rows (pass preview_holders.rows or pull again by condition_id).",
      inputSchema: {
        condition_id: z.string().min(8).max(120).optional(),
        rows: z.array(z.record(z.any())).optional(),
        market_title: z.string().max(200).optional(),
        yes_price: z.number().optional(),
        no_price: z.number().optional(),
      },
    },
    async (args) =>
      runMcpTool(actor, {
        tool: "analyze_holders",
        actionClass: "analyze",
        args: { condition_id: args.condition_id, row_count: args.rows?.length },
        handler: async () => {
          let rows = args.rows;
          let marketTitle = args.market_title || "";
          let yesPrice = args.yes_price;
          let noPrice = args.no_price;
          if ((!rows || !rows.length) && args.condition_id) {
            const holders = await getPolymarketHolders(args.condition_id, { limit: 100 });
            rows = holders.rows;
            try {
              const market = await getPolymarketMarketByCondition(args.condition_id);
              marketTitle = marketTitle || market.title;
              const prices = Array.isArray(market.outcome_prices) ? market.outcome_prices.map(Number) : [];
              if (yesPrice == null && Number.isFinite(prices[0])) yesPrice = prices[0];
              if (noPrice == null && Number.isFinite(prices[1])) noPrice = prices[1];
            } catch {
              /* market meta optional */
            }
          }
          if (!rows?.length) throw new Error("Provide rows or condition_id with holders");
          return {
            ...guidancePreamble(),
            analysis: analyzeHolders(rows, { marketTitle, yesPrice, noPrice }),
            next: "add_insight_blocks with inferences; ensure holders sheet+chart exists via pull_market_bundle or add_sheet_with_chart",
          };
        },
      }),
  );

  server.registerTool(
    "analyze_tape",
    {
      description: "Tape statistics + inference from trade rows or by condition_id.",
      inputSchema: {
        condition_id: z.string().min(8).max(120).optional(),
        rows: z.array(z.record(z.any())).optional(),
        market_title: z.string().max(200).optional(),
      },
    },
    async (args) =>
      runMcpTool(actor, {
        tool: "analyze_tape",
        actionClass: "analyze",
        args: { condition_id: args.condition_id, row_count: args.rows?.length },
        handler: async () => {
          let rows = args.rows;
          if ((!rows || !rows.length) && args.condition_id) {
            const trades = await getPolymarketTradesPreview(args.condition_id, { limit: 100 });
            rows = trades.rows;
          }
          if (!rows?.length) throw new Error("Provide rows or condition_id with trades");
          return {
            analysis: analyzeTape(rows, { marketTitle: args.market_title }),
          };
        },
      }),
  );

  server.registerTool(
    "analyze_calibration",
    {
      description:
        "Brier score + reliability bands from forecast rows. Each row needs forecast (0–1) and outcome_won (0/1). Agent may build rows from search_closed_markets + preview_prices.",
      inputSchema: {
        rows: z.array(z.record(z.any())).min(1).max(500),
        title: z.string().max(200).optional(),
        bins: z.number().int().min(2).max(20).optional(),
        project_id: z.string().min(8).max(40).optional(),
        compose_chart: z.boolean().optional(),
      },
    },
    async (args) =>
      runMcpTool(actor, {
        tool: "analyze_calibration",
        actionClass: "analyze",
        args: { row_count: args.rows?.length, bins: args.bins },
        summary: `Calibration n=${args.rows?.length || 0}`,
        handler: async () => {
          const analysis = analyzeCalibration(args.rows, { title: args.title, bins: args.bins });
          let composed = null;
          if (args.compose_chart && args.project_id && analysis.chart_rows?.length) {
            composed = await addSheetWithChart(actor.userId, args.project_id, {
              title: `${analysis.title} · reliability`,
              rows: analysis.chart_rows,
              preferredColumns: ["band", "avg_forecast", "empirical_win_rate", "count"],
              chartView: "bars",
              table: "mcp_calibration",
            });
            await addInsightBlocks(actor.userId, args.project_id, {
              title: "Calibration notes",
              markdown: analysis.inferences.map((line) => `- ${line}`).join("\n"),
            });
          }
          return {
            analysis,
            composed,
            suggest_next: analysis.suggest_next,
          };
        },
      }),
  );

  server.registerTool(
    "create_research_project",
    {
      description: "Create a new Lychee dashboard project. Returns dashboard_url with ?workspace=.",
      inputSchema: {
        name: z.string().max(120).optional(),
        question: z.string().max(2000).optional(),
      },
    },
    async ({ name, question }) =>
      runMcpTool(actor, {
        tool: "create_research_project",
        actionClass: "compose",
        args: { name, question },
        summary: `Create project ${name || question || ""}`,
        handler: async () => ({
          ...guidancePreamble(),
          project: await createResearchProject(actor.userId, { name, question }),
        }),
      }),
  );

  server.registerTool(
    "open_project",
    {
      description: "Open an existing Lychee project by id.",
      inputSchema: {
        project_id: z.string().min(8).max(40),
      },
    },
    async ({ project_id }) =>
      runMcpTool(actor, {
        tool: "open_project",
        actionClass: "orient",
        args: { project_id },
        handler: async () => {
          const project = await openProject(actor.userId, project_id);
          if (!project) throw new Error("Project not found");
          return { ...guidancePreamble(), project };
        },
      }),
  );

  server.registerTool(
    "add_sheet_with_chart",
    {
      description:
        "Add a real Lychee data sheet + chart block(s) from rows. Prefer this over inventing empty chart shells.",
      inputSchema: {
        project_id: z.string().min(8).max(40),
        title: z.string().max(120),
        rows: z.array(z.record(z.any())).min(1).max(5000),
        preferred_columns: z.array(z.string()).optional(),
        chart_view: z.string().max(40).optional(),
        table: z.string().max(80).optional(),
      },
    },
    async (args) =>
      runMcpTool(actor, {
        tool: "add_sheet_with_chart",
        actionClass: "compose",
        args: { project_id: args.project_id, title: args.title, rows: args.rows?.length },
        rows: args.rows?.length || 0,
        summary: `Add sheet ${args.title}`,
        handler: async () => ({
          ...guidancePreamble(),
          result: await addSheetWithChart(actor.userId, args.project_id, {
            title: args.title,
            rows: args.rows,
            preferredColumns: args.preferred_columns,
            chartView: args.chart_view || "",
            table: args.table || "mcp",
          }),
        }),
      }),
  );

  server.registerTool(
    "add_insight_blocks",
    {
      description: "Add narrative insight text (and optional tiny chart-as-sheet) into a Lychee project.",
      inputSchema: {
        project_id: z.string().min(8).max(40),
        title: z.string().max(120).optional(),
        markdown: z.string().max(8000).optional(),
        chart: z
          .object({
            title: z.string().max(120).optional(),
            seriesKind: z.enum(["bar", "line"]).optional(),
            points: z.array(z.object({ label: z.string(), value: z.number() })).max(40),
          })
          .optional(),
      },
    },
    async (args) =>
      runMcpTool(actor, {
        tool: "add_insight_blocks",
        actionClass: "compose",
        args,
        summary: `Add insight to project ${args.project_id}`,
        handler: async () => ({
          ...guidancePreamble(),
          result: await addInsightBlocks(actor.userId, args.project_id, args),
        }),
      }),
  );

  server.registerTool(
    "pull_market_bundle",
    {
      description:
        "Preferred one-shot: resolve market, pull FULL prices+holders+trades from Lychee, create/open project, add real sheets+charts (+ Lychee-styled inline chat snapshots), optional analysis.",
      inputSchema: {
        condition_id: z.string().min(8).max(120),
        project_id: z.string().min(8).max(40).optional(),
        project_name: z.string().max(120).optional(),
        question: z.string().max(2000).optional(),
        holders_limit: z.number().int().min(10).max(2000).optional(),
        trades_limit: z.number().int().min(10).max(2000).optional(),
        include_analysis: z.boolean().optional(),
      },
    },
    async (args) =>
      runMcpTool(actor, {
        tool: "pull_market_bundle",
        actionClass: "sample",
        args,
        rows: (args.holders_limit || 500) + (args.trades_limit || 500),
        summary: `Bundle pull ${args.condition_id}`,
        handler: async () => {
          const market = await getPolymarketMarketByCondition(args.condition_id);
          const [holders, trades, pricePull] = await Promise.all([
            getPolymarketHolders(args.condition_id, { limit: args.holders_limit || 500 }),
            getPolymarketTradesPreview(args.condition_id, { limit: args.trades_limit || 500 }),
            getPolymarketPrices(args.condition_id, { limit: 240, interval: "1h" }).catch(() => null),
          ]);
          const prices = Array.isArray(market.outcome_prices) ? market.outcome_prices.map(Number) : [];
          const holderAnalysis = analyzeHolders(holders.rows, {
            marketTitle: market.title,
            yesPrice: prices[0],
            noPrice: prices[1],
          });
          const tapeAnalysis = analyzeTape(trades.rows, { marketTitle: market.title });
          const analysisMarkdown =
            args.include_analysis === false
              ? ""
              : [
                  `## ${market.title}`,
                  "",
                  "### Holder inferences",
                  ...holderAnalysis.inferences.map((line) => `- ${line}`),
                  "",
                  "### Tape inferences",
                  ...tapeAnalysis.inferences.map((line) => `- ${line}`),
                  "",
                  "### Trade hypotheses (not advice)",
                  ...holderAnalysis.trade_hypotheses.map(
                    (h) => `- **${h.idea}**: ${h.rationale} Risk: ${h.risk}`,
                  ),
                  "",
                  "### Risk checklist",
                  ...holderAnalysis.risk_checklist.map((line) => `- ${line}`),
                ].join("\n");

          const composed = await pullMarketBundleIntoProject(actor.userId, {
            projectId: args.project_id || "",
            projectName: args.project_name || market.title,
            question: args.question || market.title,
            market,
            holdersRows: holders.rows,
            tradesRows: trades.rows,
            pricesRows: pricePull?.rows || [],
            analysisMarkdown,
          });

          return {
            ...guidancePreamble(),
            market,
            holders_count: holders.count,
            trades_count: trades.trade_count,
            prices_count: pricePull?.rows?.length || 0,
            holder_analysis: holderAnalysis,
            tape_analysis: tapeAnalysis,
            composed,
            chart_images: composed.chart_images || [],
            sheets: composed.sheets,
            next: "SHOW Lychee-styled chart images inline. Drill wallets with pull_trader_bundle + analyze_trader_theme. Overlay search_news. Prefer publish_project for shareable links — do not ask for email magic-link.",
            show_in_chat: composed.show_in_chat,
          };
        },
      }),
  );

  server.registerTool(
    "run_recipe_holder_analysis",
    {
      description:
        "Lychee Holder Analysis recipe: holders+tape charts, risk notes, and top-trader position/activity sheets in one project.",
      inputSchema: {
        condition_id: z.string().min(8).max(120),
        project_id: z.string().min(8).max(40).optional(),
        project_name: z.string().max(120).optional(),
        top_traders: z.number().int().min(1).max(5).optional(),
        holders_limit: z.number().int().min(20).max(2000).optional(),
        trades_limit: z.number().int().min(20).max(2000).optional(),
      },
    },
    async (args) =>
      runMcpTool(actor, {
        tool: "run_recipe_holder_analysis",
        actionClass: "sample",
        args,
        rows: (args.holders_limit || 80) + (args.trades_limit || 80),
        summary: `Holder analysis recipe ${args.condition_id}`,
        handler: async () => ({
          ...guidancePreamble(),
          ...(await runHolderAnalysisRecipe(actor.userId, {
            conditionId: args.condition_id,
            projectId: args.project_id || "",
            projectName: args.project_name || "",
            topTraders: args.top_traders || 3,
            holdersLimit: args.holders_limit || 80,
            tradesLimit: args.trades_limit || 80,
          })),
        }),
      }),
  );

  server.registerTool(
    "run_recipe_trade_history",
    {
      description:
        "Live trade-history recipe (sheet + trade-price chart + tape notes). Full Athena lake history still uses prepare_full_pull.",
      inputSchema: {
        condition_id: z.string().min(8).max(120),
        project_id: z.string().min(8).max(40).optional(),
        project_name: z.string().max(120).optional(),
        trades_limit: z.number().int().min(20).max(300).optional(),
      },
    },
    async (args) =>
      runMcpTool(actor, {
        tool: "run_recipe_trade_history",
        actionClass: "sample",
        args,
        rows: args.trades_limit || 150,
        summary: `Trade history recipe ${args.condition_id}`,
        handler: async () => ({
          ...guidancePreamble(),
          ...(await runTradeHistoryRecipe(actor.userId, {
            conditionId: args.condition_id,
            projectId: args.project_id || "",
            projectName: args.project_name || "",
            tradesLimit: args.trades_limit || 150,
          })),
        }),
      }),
  );

  server.registerTool(
    "pull_and_compose",
    {
      description:
        "Generic compose: pull any live dataset id into a Lychee project as sheet+chart. Prefer pull_market_bundle for holders+trades one-shot.",
      inputSchema: {
        dataset: z.string().min(3).max(80),
        project_id: z.string().min(8).max(40).optional(),
        project_name: z.string().max(120).optional(),
        condition_id: z.string().min(8).max(120).optional(),
        proxy_wallet: z.string().min(40).max(64).optional(),
        ticker: z.string().min(2).max(80).optional(),
        limit: z.number().int().min(10).max(500).optional(),
        interval: z.string().max(20).optional(),
        chart_view: z.string().max(40).optional(),
      },
    },
    async (args) =>
      runMcpTool(actor, {
        tool: "pull_and_compose",
        actionClass: "sample",
        args: {
          dataset: args.dataset,
          condition_id: args.condition_id,
          proxy_wallet: args.proxy_wallet,
          ticker: args.ticker,
        },
        rows: args.limit || 50,
        summary: `Compose ${args.dataset}`,
        handler: async () => {
          const pulled = await resolveDatasetPull(args.dataset, args);
          let projectId = args.project_id || "";
          let dashboardUrl = "";
          if (!projectId) {
            const created = await createResearchProject(actor.userId, {
              name: args.project_name || pulled.title,
              question: pulled.title,
            });
            projectId = created.project_id;
            dashboardUrl = created.dashboard_url;
          }
          const composed = await addSheetWithChart(actor.userId, projectId, {
            title: pulled.title,
            rows: pulled.rows,
            preferredColumns: pulled.preferredColumns,
            chartView: args.chart_view || pulled.chartView || pulled.meta.chart_view || "bars",
            table: pulled.meta.table,
            integrationId: pulled.meta.venue === "kalshi" ? "kalshi-live" : "polymarket",
          });
          return {
            ...guidancePreamble(),
            dataset: pulled.meta,
            row_count: pulled.rows.length,
            composed: { ...composed, dashboard_url: composed.dashboard_url || dashboardUrl },
            chart_images: composed.chart_images || [],
            next: "SHOW chart images. For wallets use analyze_trader_theme + search_news. Prefer publish_project — never magic-link.",
          };
        },
      }),
  );

  server.registerTool(
    "publish_project",
    {
      description: "Publish a Lychee project to a shareable URL. Requires confirmation unless delegated.",
      inputSchema: {
        project_id: z.string().min(8).max(40),
        slug: z.string().max(80).optional(),
        title: z.string().max(120).optional(),
        description: z.string().max(2000).optional(),
        visibility: z.enum(["public", "unlisted"]).optional(),
        confirmation_token: z.string().max(80).optional(),
      },
    },
    async (args) =>
      runMcpTool(actor, {
        tool: "publish_project",
        actionClass: MCP_ACTION_CLASSES.publish,
        args,
        confirmationToken: args.confirmation_token || "",
        summary: `Publish project ${args.project_id}`,
        handler: async () => ({
          ...guidancePreamble(),
          publication: await publishProject(actor.userId, args.project_id, args),
        }),
      }),
  );

  server.registerTool(
    "prepare_full_pull",
    {
      description:
        "Expensive materialize path. Prefer pull_market_bundle. If user insists on huge dumps: warn, confirm, charge.",
      inputSchema: {
        venue: z.enum(["kalshi", "polymarket", "both"]),
        query: z.string().min(2).max(200),
        rows_requested: z.number().int().min(100).max(500000).optional(),
        project_id: z.string().min(8).max(40).optional(),
        confirmation_token: z.string().max(80).optional(),
      },
    },
    async (args) =>
      runMcpTool(actor, {
        tool: "prepare_full_pull",
        actionClass: MCP_ACTION_CLASSES.materialize,
        args,
        rows: args.rows_requested || 5000,
        confirmationToken: args.confirmation_token || "",
        summary: `Full pull ${args.venue} "${args.query}" (~${args.rows_requested || 5000} rows)`,
        handler: async ({ credits }) => ({
          ...guidancePreamble(),
          status: "accepted_expensive_path",
          message:
            "Credits charged. Prefer continuing with pull_market_bundle / add_sheet_with_chart for shareable Lychee research; Athena lake dumps expand next.",
          estimate: await estimatePullSize({
            venue: args.venue,
            query: args.query,
            rowsRequested: args.rows_requested || 5000,
          }),
          project_id: args.project_id || null,
          credits_charged: credits.charged,
        }),
      }),
  );

  return server;
}
