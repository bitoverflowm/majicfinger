/**
 * Connects to a Lychee MCP server over HTTP (local dev by default) with a personal access token.
 * Reads LYCHEE_MCP_TOKEN and LYCHEE_MCP_URL from the environment or .env.local.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// `quiet` matters: the stdio bridge must never print to stdout.
dotenv.config({ path: path.join(ROOT, ".env.local"), quiet: true });

export const MCP_URL = process.env.LYCHEE_MCP_URL || "http://localhost:3000/api/mcp";
export const SITE_URL = new URL(MCP_URL).origin;

export async function connectLycheeMcp({ name = "lychee-eval", retryMs = 90_000, log = console.error } = {}) {
  const token = String(process.env.LYCHEE_MCP_TOKEN || "").trim();
  if (!token) {
    throw new Error(
      `LYCHEE_MCP_TOKEN is not set. Sign in at ${SITE_URL}/mcp, create a personal access token, and add LYCHEE_MCP_TOKEN=... to .env.local.`,
    );
  }

  const deadline = Date.now() + retryMs;
  for (let attempt = 1; ; attempt += 1) {
    const client = new Client({ name, version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    });
    try {
      await client.connect(transport);
      return client;
    } catch (err) {
      const message = err?.message || String(err);
      if (/401|unauthorized/i.test(message)) {
        throw new Error(`Lychee MCP rejected the token at ${MCP_URL}. Create a fresh one at ${SITE_URL}/mcp.`);
      }
      if (Date.now() > deadline) throw new Error(`Could not reach Lychee MCP at ${MCP_URL}: ${message}`);
      log(`[lychee-mcp] ${MCP_URL} not ready (attempt ${attempt}: ${message}); retrying…`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

/** Text parts joined, plus the JSON body when the text ends in one (tool results lead with markdown). */
export function readToolResult(result) {
  const content = Array.isArray(result?.content) ? result.content : [];
  const text = content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n");
  const images = content.filter((part) => part.type === "image").length;
  return { text, images, json: parseTrailingJson(text), isError: Boolean(result?.isError) };
}

function parseTrailingJson(text) {
  const start = text.search(/^\{/m);
  if (start < 0) return null;
  try {
    return JSON.parse(text.slice(start));
  } catch {
    return null;
  }
}
