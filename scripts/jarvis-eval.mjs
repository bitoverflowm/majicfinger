#!/usr/bin/env node
/**
 * Replays the Jarvis cases in jarvis-evals/cases against the local Lychee MCP and checks each response.
 *
 *   npm run jarvis:eval              # every case
 *   npm run jarvis:eval -- pulse x-  # only cases whose id contains "pulse" or "x-"
 *
 * Needs `npm run dev` and LYCHEE_MCP_TOKEN in .env.local. Full responses land in jarvis-evals/out/latest/<id>.json.
 *
 * A case is one JSON file:
 *   { "id", "expectation": "what a good answer looks like, in words",
 *     "kind": "tool", "tool": "jarvis_pulse", "args": {}            // calls an MCP tool
 *     "kind": "x_mention", "text": "@lychee_data …", "parent_text"   // runs the X reply dry run
 *     "expect": { … checks below … } }
 *
 * Checks run on the response text (tool output, or the drafted X reply) and its JSON:
 *   contains / not_contains   strings, case-insensitive
 *   matches / not_matches     regex sources, case-insensitive
 *   min_chars / max_chars     length of the text
 *   is_error                  tool calls only; defaults to false
 *   images_min                tool calls only; inline images returned
 *   paths                     { "alerts.length": { "min": 1 }, "intent.mode": { "equals": "gap" },
 *                               "status": { "in": ["ok", "partial"] }, "condition_id": { "exists": true } }
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, SITE_URL, connectLycheeMcp, readToolResult } from "./lib/lychee-mcp-client.mjs";

const CASES_DIR = path.join(ROOT, "jarvis-evals", "cases");
const OUT_DIR = path.join(ROOT, "jarvis-evals", "out", "latest");
const PREVIEW_CHARS = 700;

const filters = process.argv.slice(2);
const cases = fs
  .readdirSync(CASES_DIR)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .map((file) => ({ file, ...JSON.parse(fs.readFileSync(path.join(CASES_DIR, file), "utf8")) }))
  .filter((c) => !filters.length || filters.some((f) => c.id.includes(f)));

if (!cases.length) {
  console.error(`No cases match ${filters.join(", ") || "(all)"} in ${path.relative(ROOT, CASES_DIR)}`);
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
let mcp = null;
const failed = [];

for (const testCase of cases) {
  const started = Date.now();
  let subject;
  try {
    subject = testCase.kind === "x_mention" ? await runXMention(testCase) : await runTool(testCase);
  } catch (err) {
    subject = { text: "", json: null, error: err?.message || String(err) };
  }
  const ms = Date.now() - started;
  const problems = subject.error ? [`request failed: ${subject.error}`] : check(testCase, subject);
  fs.writeFileSync(
    path.join(OUT_DIR, `${testCase.id}.json`),
    JSON.stringify({ case: testCase, ms, problems, response: subject }, null, 2),
  );

  if (problems.length) {
    failed.push(testCase.id);
    console.log(`\n✗ ${testCase.id}  (${ms}ms)`);
    if (testCase.expectation) console.log(`  expected: ${testCase.expectation}`);
    for (const problem of problems) console.log(`  - ${problem}`);
    console.log(indent(preview(subject.text)));
  } else {
    console.log(`✓ ${testCase.id}  (${ms}ms)`);
  }
}

console.log(`\n${cases.length - failed.length}/${cases.length} passed. Full responses: ${path.relative(ROOT, OUT_DIR)}/`);
await mcp?.close();
process.exit(failed.length ? 1 : 0);

async function runTool(testCase) {
  mcp ||= await connectLycheeMcp({ name: "jarvis-eval", retryMs: 120_000 });
  const result = await mcp.callTool({ name: testCase.tool, arguments: testCase.args || {} }, undefined, {
    timeout: 5 * 60_000,
  });
  return readToolResult(result);
}

async function runXMention(testCase) {
  const res = await fetch(`${SITE_URL}/api/x-jarvis/dry-run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: testCase.text,
      parent_text: testCase.parent_text || "",
      author_handle: testCase.author_handle || "jarvis_eval",
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) throw new Error(body?.message || `HTTP ${res.status}`);
  return { text: body.data?.draft_reply || "", json: body.data, isError: false, images: 0 };
}

function check(testCase, subject) {
  const expect = testCase.expect || {};
  const text = subject.text || "";
  const lower = text.toLowerCase();
  const problems = [];

  if (testCase.kind !== "x_mention" && Boolean(subject.isError) !== Boolean(expect.is_error)) {
    problems.push(expect.is_error ? "expected an error result" : "tool returned an error result");
  }
  for (const s of expect.contains || []) if (!lower.includes(s.toLowerCase())) problems.push(`missing "${s}"`);
  for (const s of expect.not_contains || []) if (lower.includes(s.toLowerCase())) problems.push(`should not contain "${s}"`);
  for (const re of expect.matches || []) if (!new RegExp(re, "i").test(text)) problems.push(`no match for /${re}/`);
  for (const re of expect.not_matches || []) {
    const hit = text.match(new RegExp(re, "i"));
    if (hit) problems.push(`should not match /${re}/ (found "${hit[0]}")`);
  }
  if (expect.min_chars != null && text.length < expect.min_chars) problems.push(`${text.length} chars, want ≥ ${expect.min_chars}`);
  if (expect.max_chars != null && text.length > expect.max_chars) problems.push(`${text.length} chars, want ≤ ${expect.max_chars}`);
  if (expect.images_min != null && (subject.images || 0) < expect.images_min) {
    problems.push(`${subject.images || 0} inline images, want ≥ ${expect.images_min}`);
  }

  for (const [keyPath, rule] of Object.entries(expect.paths || {})) {
    if (!subject.json) {
      problems.push(`${keyPath}: response has no JSON body`);
      continue;
    }
    const value = getPath(subject.json, keyPath);
    const shown = JSON.stringify(value);
    if (rule.exists === true && value == null) problems.push(`${keyPath} is missing`);
    if (rule.exists === false && value != null) problems.push(`${keyPath} should be absent, got ${shown}`);
    if ("equals" in rule && JSON.stringify(value) !== JSON.stringify(rule.equals)) {
      problems.push(`${keyPath} = ${shown}, want ${JSON.stringify(rule.equals)}`);
    }
    if (rule.in && !rule.in.some((v) => JSON.stringify(v) === shown)) problems.push(`${keyPath} = ${shown}, want one of ${JSON.stringify(rule.in)}`);
    if (rule.min != null && !(Number(value) >= rule.min)) problems.push(`${keyPath} = ${shown}, want ≥ ${rule.min}`);
    if (rule.max != null && !(Number(value) <= rule.max)) problems.push(`${keyPath} = ${shown}, want ≤ ${rule.max}`);
  }
  return problems;
}

function getPath(obj, keyPath) {
  return keyPath.split(".").reduce((value, key) => (value == null ? undefined : value[key]), obj);
}

function preview(text) {
  if (!text) return "(empty response)";
  return text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS)}…` : text;
}

function indent(text) {
  return text
    .split("\n")
    .map((line) => `    │ ${line}`)
    .join("\n");
}
