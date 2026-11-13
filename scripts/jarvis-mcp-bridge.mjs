#!/usr/bin/env node
/**
 * Stdio MCP server for Cursor that forwards to the local Lychee MCP (`npm run dev`) and logs every tool call.
 * Wired up in .cursor/mcp.json as "lychee-local". Needs LYCHEE_MCP_TOKEN in .env.local.
 *
 * Calls are appended to jarvis-evals/out/calls.jsonl; the latest full result is jarvis-evals/out/last-call.json.
 * stdout carries the MCP protocol, so all diagnostics go to stderr.
 */
import fs from "node:fs";
import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ROOT, connectLycheeMcp, readToolResult } from "./lib/lychee-mcp-client.mjs";

const OUT_DIR = path.join(ROOT, "jarvis-evals", "out");
const TOOL_TIMEOUT_MS = 5 * 60_000;

const remote = await connectLycheeMcp({ name: "cursor-lychee-bridge" });
const capabilities = remote.getServerCapabilities() || {};

const server = new Server(
  { name: "lychee-local", version: "1.0.0" },
  {
    capabilities: {
      tools: {},
      ...(capabilities.resources ? { resources: {} } : {}),
      ...(capabilities.prompts ? { prompts: {} } : {}),
    },
    instructions: remote.getInstructions(),
  },
);

server.setRequestHandler(ListToolsRequestSchema, (req) => remote.listTools(req.params));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const started = Date.now();
  try {
    const result = await remote.callTool(req.params, undefined, { timeout: TOOL_TIMEOUT_MS });
    logCall(req.params, started, { result });
    return result;
  } catch (err) {
    logCall(req.params, started, { error: err?.message || String(err) });
    throw err;
  }
});

if (capabilities.resources) {
  server.setRequestHandler(ListResourcesRequestSchema, (req) => remote.listResources(req.params));
  server.setRequestHandler(ListResourceTemplatesRequestSchema, (req) => remote.listResourceTemplates(req.params));
  server.setRequestHandler(ReadResourceRequestSchema, (req) => remote.readResource(req.params));
}
if (capabilities.prompts) {
  server.setRequestHandler(ListPromptsRequestSchema, (req) => remote.listPrompts(req.params));
  server.setRequestHandler(GetPromptRequestSchema, (req) => remote.getPrompt(req.params));
}

await server.connect(new StdioServerTransport());
console.error("[lychee-local] bridge ready");

function logCall(params, started, { result, error }) {
  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const read = result ? readToolResult(result) : null;
    const entry = {
      at: new Date(started).toISOString(),
      ms: Date.now() - started,
      tool: params.name,
      args: params.arguments || {},
      is_error: error ? true : read.isError,
      error: error || undefined,
      images: read?.images ?? 0,
      text: read?.text,
    };
    fs.appendFileSync(path.join(OUT_DIR, "calls.jsonl"), `${JSON.stringify(entry)}\n`);
    fs.writeFileSync(path.join(OUT_DIR, "last-call.json"), JSON.stringify(entry, null, 2));
  } catch (err) {
    console.error("[lychee-local] could not write call log:", err?.message || err);
  }
}
