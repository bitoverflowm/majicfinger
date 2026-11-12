import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runMcpTool } from "@/lib/mcp/runTool";
import { guidancePreamble, textResult } from "@/lib/mcp/toolResult";
import {
  catalogCapabilities,
  estimatePullSize,
  getLookalikeMarkets,
  getMostActivePolymarketMarkets,
  getPolymarketHolders,
  getPolymarketMarketByCondition,
  getPolymarketTradesPreview,
  searchKalshi,
  searchPolymarket,
} from "@/lib/mcp/data/providers";
import { analyzeHolders, analyzeTape } from "@/lib/mcp/data/stats";
import {
  addInsightBlocks,
  addSheetWithChart,
  createResearchProject,
  listRecentProjects,
  openProject,
  publishProject,
  pullMarketBundleIntoProject,
} from "@/lib/mcp/workspace";
import { getCreditSnapshot, recentLedger } from "@/lib/mcp/credits";
import { listDelegations } from "@/lib/mcp/confirm";
import { MCP_ACTION_CLASSES, mcpResourceUrl } from "@/lib/mcp/config";
import { getSiteUrl } from "@/lib/site";

/**
 * @param {object} actor resolveMcpActor result
 */
export function createLycheeMcpServer(actor) {
  const server = new McpServer({
    name: "lychee-mcp",
    version: "0.2.0",
  });

  server.registerPrompt(
    "lychee_research",
    {
      description: "Run a Lychee-native research workflow ending in charts + optional publish.",
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
              guidancePreamble().identity,
              "",
              `Question: ${question}`,
              "",
              "Steps:",
              "1) list_capabilities if unsure",
              "2) get_most_active_markets or search_markets — keep condition_id values",
              "3) get_lookalike_markets for related deadlines",
              "4) pull_market_bundle (preferred) OR preview_holders + preview_market_activity + add_sheet_with_chart",
              "5) analyze_holders + analyze_tape — write inferences into add_insight_blocks",
              "6) Return the dashboard_url (?workspace=). Offer publish_project for sharing.",
              "Never scrape venue HTML. Never invent empty chart shells without sheet data.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.registerTool(
    "list_capabilities",
    {
      description:
        "Catalog of Lychee MCP tools, ids (condition_id/ticker), and the research compose loop. Call this when unsure what you can pull.",
    },
    async () =>
      textResult({
        ...guidancePreamble(),
        ...catalogCapabilities(),
        resource: mcpResourceUrl(),
        site: getSiteUrl(),
        user: {
          email: actor.user?.email || null,
          handle: actor.user?.user_name || null,
          owner_unlimited_credits: actor.isOwner,
          membership: actor.hasMembership,
        },
      }),
  );

  server.registerTool(
    "lychee_about",
    {
      description: "Short orientation for Lychee MCP research-partner mode.",
    },
    async () =>
      textResult({
        ...guidancePreamble(),
        ...catalogCapabilities(),
        resource: mcpResourceUrl(),
        site: getSiteUrl(),
      }),
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
          ...guidancePreamble(),
          as_of: new Date().toISOString(),
          markets: await getMostActivePolymarketMarkets({ limit }),
          next: "Call pull_market_bundle with the top condition_id, then get_lookalike_markets.",
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
    "preview_holders",
    {
      description:
        "Pull Polymarket holders via Lychee (Data API v2, flattened). Requires condition_id. Errors if empty — do not scrape.",
      inputSchema: {
        condition_id: z.string().min(8).max(120),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ condition_id, limit = 50 }) =>
      runMcpTool(actor, {
        tool: "preview_holders",
        actionClass: "sample",
        args: { condition_id, limit },
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
      description: "Pull recent Polymarket trades via Lychee. Requires condition_id. Errors if empty — do not scrape.",
      inputSchema: {
        condition_id: z.string().min(8).max(120),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ condition_id, limit = 50 }) =>
      runMcpTool(actor, {
        tool: "preview_market_activity",
        actionClass: "sample",
        args: { condition_id, limit },
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
            ...guidancePreamble(),
            analysis: analyzeTape(rows, { marketTitle: args.market_title }),
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
        rows: z.array(z.record(z.any())).min(1).max(500),
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
        "Preferred one-shot: resolve market, pull holders+trades from Lychee, create/open project, add real sheets+charts, optional analysis text. Returns dashboard_url (?workspace=).",
      inputSchema: {
        condition_id: z.string().min(8).max(120),
        project_id: z.string().min(8).max(40).optional(),
        project_name: z.string().max(120).optional(),
        question: z.string().max(2000).optional(),
        holders_limit: z.number().int().min(10).max(200).optional(),
        trades_limit: z.number().int().min(10).max(200).optional(),
        include_analysis: z.boolean().optional(),
      },
    },
    async (args) =>
      runMcpTool(actor, {
        tool: "pull_market_bundle",
        actionClass: "sample",
        args,
        rows: (args.holders_limit || 50) + (args.trades_limit || 50),
        summary: `Bundle pull ${args.condition_id}`,
        handler: async () => {
          const market = await getPolymarketMarketByCondition(args.condition_id);
          const [holders, trades] = await Promise.all([
            getPolymarketHolders(args.condition_id, { limit: args.holders_limit || 50 }),
            getPolymarketTradesPreview(args.condition_id, { limit: args.trades_limit || 50 }),
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
            analysisMarkdown,
          });

          return {
            ...guidancePreamble(),
            market,
            holders_count: holders.count,
            trades_count: trades.trade_count,
            holder_analysis: holderAnalysis,
            tape_analysis: tapeAnalysis,
            composed,
            next: "Share composed.dashboard_url with the user. Optionally get_lookalike_markets, then publish_project.",
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
