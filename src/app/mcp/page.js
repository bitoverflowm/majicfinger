"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/hooks";
import Login from "@/components/login";

const MCP_URL = "https://lycheedata.com/api/mcp";

const STARTER_PROMPT = `Be my Lychee research assistant (walk me through it):
1) Restate your plan in 1–2 sentences
2) Call list_research_flows, then get_most_active_markets (or search_closed_markets if I need settled races)
3) pull_market_bundle / preview_prices early and share the dashboard_url (?workspace=) so I can watch charts
4) Analyze (holders / tape / calibration) and tell me which Lychee sources you used
5) Ask me one question, then suggest 2–4 next pulls
6) Offer publish_project when it's shareable
Never scrape Polymarket/Kalshi HTML — only Lychee tools.`;

const TOOL_ROWS = [
  ["list_capabilities / list_research_flows / list_datasets", "Orient — what you can pull and how pieces compose"],
  ["get_most_active_markets / search_markets / search_closed_markets", "Find open or settled markets (+ winners)"],
  ["get_lookalike_markets / compare_venues", "Related deadlines · Kalshi↔Polymarket gaps"],
  ["preview_holders / preview_market_activity / preview_prices / preview_orderbook", "Sample pulls (prices are callable)"],
  ["preview_trader / preview_kalshi_market / preview_open_interest", "Trader + Kalshi + OI samples"],
  ["pull_market_bundle / pull_and_compose / run_recipe_*", "Land real Lychee sheets + charts"],
  ["analyze_holders / analyze_tape / analyze_calibration", "Risk, tape, Brier / reliability"],
  ["add_sheet_with_chart / add_insight_blocks / publish_project", "Compose + shareable research"],
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
              </div>
              <p className="mt-3 break-all rounded-xl bg-zinc-950 px-4 py-3 font-mono text-xs text-zinc-100">
                {resource}
              </p>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100 whitespace-pre-wrap">
                {STARTER_PROMPT}
              </pre>
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
                <li>It asks you questions and suggests next looks</li>
                <li>Optional publish → shareable research URL</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold">Troubleshooting</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
                <li>
                  <strong>Tools look stale / “not exposed”</strong> — start a new chat and re-enable the
                  lychee plugin (clients cache tool schemas).
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
