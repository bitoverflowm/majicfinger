"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/hooks";
import Login from "@/components/login";
import { CRAZY_WORKFLOWS } from "@/lib/mcp/data/crazyWorkflows";

const MCP_URL = "https://lycheedata.com/api/mcp";

const STARTER_PROMPT = `Be my Lychee research assistant (walk me through it):
1) Ask me: Would you like to turn Jarvis mode on? If yes → jarvis_on (show power-up) + jarvis_pulse and tell me interesting things without waiting
2) If I haven't named a market yet: call list_crazy_workflows and pitch 3 ambitious workflows — wait for my pick (or pick for me if I say so)
3) Restate your plan in 1–2 sentences
4) Orient with list_research_flows / get_most_active_markets (or search_closed_markets for settled races)
5) pull_market_bundle / preview_prices early — SHOW Chart 1/2 inline (not only links) and PASTE share.open_now_markdown
6) Analyze on FULL Lychee rows (holders / tape / calibration) — don't stop at tiny previews
7) Ask me one question, then suggest 2–4 next pulls (offer a wilder workflow pivot when useful)
8) Offer publish_project when it's shareable — PASTE publication.url + og_image_url
While Jarvis is on: pulse at the start of every turn.
Never scrape Polymarket/Kalshi HTML — only Lychee tools.
For a trading bot: list_realtime_feeds → poll get_realtime_snapshot.`;

const JARVIS_PROMPT = `Turn Jarvis mode on.
1) Call jarvis_on (or list_capabilities with action=jarvis_on if jarvis_on is missing) and show the power-up animation
2) Call jarvis_pulse (or list_capabilities action=jarvis_pulse) — tell me 1–3 interesting markets/trades without me asking
3) Never say Jarvis tools are "not exposed" — use the list_capabilities action escape hatch
4) Keep pulsing at the start of every later message while Jarvis stays on
5) When I bite: pull_market_bundle, SHOW charts inline, analyze full rows
Only Lychee tools. Start a new chat if your tool list looks stale.`;

const TOOL_ROWS = [
  ["list_capabilities / list_research_flows / list_crazy_workflows", "Orient + ambitious workflow pitches"],
  ["jarvis_on / jarvis_pulse", "Proactive briefs + power-up (ask first)"],
  ["list_datasets / list_realtime_feeds / get_realtime_snapshot", "Datasets + live bot snapshots (poll)"],
  ["get_most_active_markets / search_markets / search_closed_markets", "Find open or settled markets (+ winners)"],
  ["get_lookalike_markets / compare_venues", "Related deadlines · Kalshi↔Polymarket gaps"],
  ["preview_holders / preview_market_activity / preview_prices / preview_orderbook", "Full analysis pulls (not tiny previews)"],
  ["preview_trader / preview_kalshi_market / preview_open_interest", "Trader + Kalshi + OI samples"],
  ["pull_market_bundle / pull_and_compose / run_recipe_*", "Land Lychee sheets + inline chart images"],
  ["analyze_holders / analyze_tape / analyze_calibration", "Risk, tape, Brier / reliability"],
  ["add_sheet_with_chart / add_insight_blocks / publish_project", "Compose + shareable URL + OG preview"],
];

export default function McpConnectPage() {
  const user = useUser();
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState(null);
  const [tokenMeta, setTokenMeta] = useState(null);
  const [freshToken, setFreshToken] = useState("");
  const [resource, setResource] = useState(MCP_URL);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  async function refresh() {
    setError("");
    const [usageRes, tokenRes] = await Promise.all([
      fetch("/api/mcp/usage", { credentials: "include" }),
      fetch("/api/mcp/tokens", { credentials: "include" }),
    ]);
    if (!usageRes.ok || !tokenRes.ok) {
      setError("Could not load MCP settings.");
      setLoading(false);
      return;
    }
    const usageJson = await usageRes.json();
    const tokenJson = await tokenRes.json();
    setUsage(usageJson.data);
    setResource(usageJson.data?.resource || resource);
    setTokenMeta(tokenJson.data?.token || null);
    setLoading(false);
  }

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    refresh();
  }, [user]);

  async function copy(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setError("Could not copy — select the text manually.");
    }
  }

  async function createToken() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/mcp/tokens", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "chatgpt-test" }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.message || "Could not create token");
      return;
    }
    setFreshToken(json.data.token);
    await refresh();
  }

  async function revokeToken() {
    setBusy(true);
    await fetch("/api/mcp/tokens", { method: "DELETE", credentials: "include" });
    setFreshToken("");
    setBusy(false);
    await refresh();
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-lg px-4 py-10">
          <h1 className="text-3xl font-semibold tracking-tight">Lychee MCP</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Sign in to connect ChatGPT / Claude / Cursor as a Lychee research assistant.
          </p>
        </div>
        <Login fromHome redirectTo="/mcp" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#fafafa_45%,_#f4f4f5)] text-zinc-900">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12">
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-orange-700/80">Lychee MCP</p>
          <h1 className="text-4xl font-semibold tracking-tight">Lychee research assistant</h1>
          <p className="max-w-2xl text-base text-zinc-600">
            Model Context Protocol lets ChatGPT / Claude / Cursor call Lychee tools directly — pull
            source-of-truth data, land charts as it thinks, analyze on top, and publish shareable
            research. Signed in as{" "}
            <span className="font-medium text-zinc-900">{user.email}</span>
            {user.user_name ? ` (@${user.user_name})` : ""}.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/dashboard" className="underline underline-offset-4">
              Open dashboard
            </Link>
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <>
            <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold">Pick your AI tool</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Remote <strong>Streamable HTTP</strong> to the URL below. ChatGPT uses Plugins → MCPs
                (not Coding → Connections). After deploy, start a <strong>new chat</strong> so tool
                schemas refresh.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-zinc-500">
                      <th className="py-2 pr-3">Client</th>
                      <th className="py-2">How to connect</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-700">
                    <tr className="border-b border-zinc-100">
                      <td className="py-2 pr-3 font-medium">ChatGPT</td>
                      <td className="py-2">Settings → MCP servers → Plugins → custom Streamable HTTP + OAuth</td>
                    </tr>
                    <tr className="border-b border-zinc-100">
                      <td className="py-2 pr-3 font-medium">Claude</td>
                      <td className="py-2">Add remote MCP connector → same URL + OAuth</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-medium">Cursor</td>
                      <td className="py-2">
                        Bearer PAT (<code className="rounded bg-zinc-100 px-1">lychee_pat_…</code>) in MCP config
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copy(resource, "url")}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                >
                  {copied === "url" ? "Copied URL" : "Copy MCP URL"}
                </button>
                <button
                  type="button"
                  onClick={() => copy(STARTER_PROMPT, "prompt")}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
                >
                  {copied === "prompt" ? "Copied prompt" : "Copy walkthrough prompt"}
                </button>
                <button
                  type="button"
                  onClick={() => copy(JARVIS_PROMPT, "jarvis")}
                  className="rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-950"
                >
                  {copied === "jarvis" ? "Copied" : "Turn Jarvis mode on"}
                </button>
              </div>
              <p className="mt-3 break-all rounded-xl bg-zinc-950 px-4 py-3 font-mono text-xs text-zinc-100">
                {resource}
              </p>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100 whitespace-pre-wrap">
                {STARTER_PROMPT}
              </pre>
            </section>

            <section className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-zinc-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-sky-950">Jarvis mode</h2>
              <p className="mt-2 text-sm text-zinc-600">
                On session start the agent should ask: <em>Would you like to turn Jarvis mode on?</em>{" "}
                If yes, it plays a power-up animation and starts surfacing interesting markets/trades
                without you fishing for updates. (Chat hosts can&apos;t push with zero messages — Jarvis
                pulses each turn / when you say &quot;pulse&quot;.)
              </p>
              <button
                type="button"
                onClick={() => copy(JARVIS_PROMPT, "jarvis-card")}
                className="mt-4 rounded-full bg-sky-700 px-4 py-2 text-sm font-medium text-white"
              >
                {copied === "jarvis-card" ? "Copied Jarvis prompt" : "Copy · Turn Jarvis mode on"}
              </button>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold">Try a wild workflow</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Copy a prompt into your connected chat. The agent can also call{" "}
                <code className="rounded bg-zinc-100 px-1">list_crazy_workflows</code> and pitch three of
                these on its own when you&apos;re open-ended.
              </p>
              <div className="mt-4 grid gap-3">
                {CRAZY_WORKFLOWS.map((workflow) => (
                  <article
                    key={workflow.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-zinc-900">{workflow.vibe}</h3>
                        <p className="mt-1 text-sm text-zinc-600">{workflow.hook}</p>
                        <p className="mt-2 font-mono text-[11px] text-zinc-500">
                          {workflow.tools.slice(0, 4).join(" · ")}
                          {workflow.tools.length > 4 ? " · …" : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copy(workflow.prompt, `wf-${workflow.id}`)}
                        className="shrink-0 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800"
                      >
                        {copied === `wf-${workflow.id}` ? "Copied" : "Copy prompt"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold">Available tools</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Prefer named flows over inventing scrapes. If a tool is listed here, the agent should{" "}
                <strong>call</strong> it — not claim it is missing.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-zinc-500">
                      <th className="py-2 pr-3">Tools</th>
                      <th className="py-2">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOOL_ROWS.map(([tools, purpose]) => (
                      <tr key={tools} className="border-b border-zinc-100 align-top">
                        <td className="py-2 pr-3 font-mono text-xs text-zinc-800">{tools}</td>
                        <td className="py-2 text-zinc-700">{purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold">What “working” looks like</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
                <li>Agent names Lychee sources/tools as it pulls</li>
                <li>
                  Charts appear on a <code className="rounded bg-zinc-100 px-1">?workspace=</code> dashboard
                  while the chat continues
                </li>
                <li>Asks to turn Jarvis on → power-up → unprompted interesting-market briefs</li>
                <li>Open-ended chats: pitches 3 wild workflows, then runs the one you pick</li>
                <li>When it says Chart 1 / Chart 2, the chart image shows inline (plus a workspace link)</li>
                <li>Analysis uses full live rows; only huge historical dumps stay gated</li>
                <li>Optional publish → shareable research URL</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold">Troubleshooting</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
                <li>
                  <strong>Tools look stale / “not exposed” / Jarvis missing</strong> — start a{" "}
                  <strong>new chat</strong> and re-enable the lychee plugin (ChatGPT caches tool schemas).
                  Until refreshed, the agent can still run Jarvis via{" "}
                  <code className="rounded bg-zinc-100 px-1">list_capabilities</code> with{" "}
                  <code className="rounded bg-zinc-100 px-1">action=jarvis_on</code>.
                </li>
                <li>
                  <strong>Wrong Connections panel</strong> — ChatGPT Coding → Connections is Mac remote
                  control; use Plugins → MCPs.
                </li>
                <li>
                  <strong>Empty holders</strong> — need a real <code className="rounded bg-zinc-100 px-1">condition_id</code>{" "}
                  from search / active markets (v2 holders are flattened server-side).
                </li>
                <li>
                  <strong>Auth</strong> — OAuth for ChatGPT/Claude; PAT only for Cursor.
                </li>
              </ul>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold">Credits</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Owner accounts are unlimited; every call still lands in the ledger for billing tests.
              </p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-zinc-50 p-4">
                  <dt className="text-zinc-500">Balance</dt>
                  <dd className="text-xl font-semibold">
                    {usage?.usage?.unlimited ? "Unlimited" : usage?.usage?.balance ?? "—"}
                  </dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-4">
                  <dt className="text-zinc-500">Lifetime spent (tracked)</dt>
                  <dd className="text-xl font-semibold">{usage?.usage?.lifetime_spent ?? 0}</dd>
                </div>
              </dl>
              {!!usage?.ledger?.length && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-zinc-500">
                        <th className="py-2 pr-3">When</th>
                        <th className="py-2 pr-3">Delta</th>
                        <th className="py-2 pr-3">Tool</th>
                        <th className="py-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.ledger.slice(0, 12).map((row) => (
                        <tr key={String(row._id)} className="border-b border-zinc-100">
                          <td className="py-2 pr-3">{new Date(row.createdAt).toLocaleString()}</td>
                          <td className="py-2 pr-3">{row.delta}</td>
                          <td className="py-2 pr-3">{row.tool || "—"}</td>
                          <td className="py-2">{row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold">Personal access token (Cursor)</h2>
              <p className="mt-2 text-sm text-zinc-600">
                ChatGPT should use OAuth. For Cursor, Bearer{" "}
                <code className="rounded bg-zinc-100 px-1">lychee_pat_…</code>.
              </p>
              {tokenMeta ? (
                <p className="mt-3 text-sm">
                  Active token prefix <code>{tokenMeta.prefix}…</code>
                  {tokenMeta.last_used_at
                    ? ` · last used ${new Date(tokenMeta.last_used_at).toLocaleString()}`
                    : " · not used yet"}
                </p>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">No active token.</p>
              )}
              {freshToken ? (
                <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
                  <p className="font-medium">Copy now — shown once</p>
                  <code className="mt-2 block break-all">{freshToken}</code>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={createToken}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {tokenMeta ? "Regenerate token" : "Create token"}
                </button>
                {tokenMeta ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={revokeToken}
                    className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    Revoke
                  </button>
                ) : null}
              </div>
            </section>
          </>
        )}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </main>
  );
}
