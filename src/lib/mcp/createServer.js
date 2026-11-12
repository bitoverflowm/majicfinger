import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runMcpTool } from "@/lib/mcp/runTool";
import { guidancePreamble, textResult } from "@/lib/mcp/toolResult";
import {
  estimatePullSize,
  getPolymarketHolders,
  getPolymarketTradesPreview,
  searchKalshi,
  searchPolymarket,
} from "@/lib/mcp/data/providers";
import {
  addInsightBlocks,
  createResearchProject,
  listRecentProjects,
  openProject,
  publishProject,
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
    version: "0.1.0",
  });

  server.registerTool(
    "lychee_about",
    {
      description:
        "Lychee MCP orientation: research-partner mode, resource URL, and how to work with the user.",
    },
    async () =>
      textResult({
        ...guidancePreamble(),
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
    "get_usage",
    {
      description: "Show MCP credit balance, recent spend, and delegations for the signed-in Lychee user.",
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
      description: "List the user's recent Lychee workspace projects so you can continue prior work.",
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
    "search_markets",
    {
      description:
        "Search Kalshi and/or Polymarket markets for a research question. Prefer this before large pulls.",
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
            next_suggestions: [
              "Pick a condition_id / ticker and call preview_market_activity or preview_holders.",
              "Compare venues with the same query if researching gaps.",
            ],
          };
        },
      }),
  );

  server.registerTool(
    "estimate_pull",
    {
      description: "Estimate size/cost guidance before a large historical or trades pull.",
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
        "Sample Polymarket holders for a market (condition id). Returns a small preview + starter insight, not a full dump.",
      inputSchema: {
        condition_id: z.string().min(8).max(120),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async ({ condition_id, limit = 20 }) =>
      runMcpTool(actor, {
        tool: "preview_holders",
        actionClass: "sample",
        args: { condition_id, limit },
        summary: `Preview holders for ${condition_id}`,
        handler: async () => {
          const holders = await getPolymarketHolders(condition_id, { limit, includePnl: true });
          const top = holders.preview.slice(0, 5);
          return {
            ...guidancePreamble(),
            holders,
            starter_insight: {
              top_holders: top,
              note: top.length
                ? "Holder concentration preview ready. Consider adding this to a research project chart/sheet next."
                : "No holders in preview.",
            },
          };
        },
      }),
  );

  server.registerTool(
    "preview_market_activity",
    {
      description:
        "Sample recent Polymarket trades for a condition id and return a small preview plus starter stats.",
      inputSchema: {
        condition_id: z.string().min(8).max(120),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async ({ condition_id, limit = 25 }) =>
      runMcpTool(actor, {
        tool: "preview_market_activity",
        actionClass: "sample",
        args: { condition_id, limit },
        summary: `Preview activity for ${condition_id}`,
        handler: async () => ({
          ...guidancePreamble(),
          ...(await getPolymarketTradesPreview(condition_id, { limit })),
        }),
      }),
  );

  server.registerTool(
    "create_research_project",
    {
      description:
        "Create a new regular Lychee dashboard project for this research (teammate style). Prefer new unless user names an existing project.",
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
          if (!project) {
            throw new Error("Project not found");
          }
          return { ...guidancePreamble(), project };
        },
      }),
  );

  server.registerTool(
    "add_insight_blocks",
    {
      description:
        "Add insight text and/or a simple chart snapshot into a Lychee project so the web dashboard stays in sync.",
      inputSchema: {
        project_id: z.string().min(8).max(40),
        title: z.string().max(120).optional(),
        markdown: z.string().max(8000).optional(),
        chart: z
          .object({
            title: z.string().max(120).optional(),
            seriesKind: z.enum(["bar", "line"]).optional(),
            valueTitle: z.string().max(120).optional(),
            labelTitle: z.string().max(120).optional(),
            points: z
              .array(
                z.object({
                  label: z.string(),
                  value: z.number(),
                }),
              )
              .max(40),
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
    "publish_project",
    {
      description:
        "Publish a Lychee project to a shareable URL. Requires confirmation unless the user delegated publish.",
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
        "Expensive materialize step. Prefer previews first. If the user insists on full data, warn, confirm, then fulfill. Returns a credit quote and confirmation flow; full lake materialize expands in later phases.",
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
        handler: async ({ credits }) => {
          const estimate = await estimatePullSize({
            venue: args.venue,
            query: args.query,
            rowsRequested: args.rows_requested || 5000,
          });
          // Phase 2 vertical: confirmation + credit accounting works; deep Athena materialize
          // wires next. Still create/open project guidance so the agent keeps composing.
          return {
            ...guidancePreamble(),
            status: "accepted_expensive_path",
            message:
              "Full materialize is confirmed and credited. For this private ChatGPT test build, continue by sampling + composing the dashboard; Athena full-sheet materialize hooks land next.",
            estimate,
            project_id: args.project_id || null,
            credits_charged: credits.charged,
            recommended_next: [
              "search_markets / preview_* for the narrowed set",
              "create_research_project or open_project",
              "add_insight_blocks with findings",
              "publish_project when the user wants a share link",
            ],
          };
        },
      }),
  );

  return server;
}
