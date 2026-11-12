"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/hooks";
import Login from "@/components/login";

const MCP_URL = "https://lycheedata.com/api/mcp";
const STARTER_PROMPT = `Using Lychee only (do not scrape Polymarket HTML):
1) Call get_most_active_markets
2) pick #1, call pull_market_bundle with its condition_id
3) call get_lookalike_markets for that market
4) summarize holder concentration + risk, and give me the dashboard_url (?workspace=)
5) offer to publish_project so I can share it`;

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
            Sign in to connect ChatGPT as a Lychee research partner.
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
          <h1 className="text-4xl font-semibold tracking-tight">Add Lychee to ChatGPT</h1>
          <p className="max-w-2xl text-base text-zinc-600">
            Signed in as <span className="font-medium text-zinc-900">{user.email}</span>
            {user.user_name ? ` (@${user.user_name})` : ""}. Use the{" "}
            <strong>Plugins → MCPs</strong> path (same place as custom plugins like Higgsfield) — not
            Coding → Connections (that is Mac remote control).
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
              <h2 className="text-lg font-semibold">1. Create the ChatGPT plugin (3 fields)</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
                <li>ChatGPT → search settings for <strong>MCP servers</strong> → <strong>Plugins</strong></li>
                <li>
                  Add custom MCP → name <code className="rounded bg-zinc-100 px-1">lychee</code>
                </li>
                <li>
                  Connection: <strong>Server URL</strong> (or Streamable HTTP) — not STDIO / not Tunnel
                </li>
                <li>
                  URL: <code className="rounded bg-zinc-100 px-1.5 py-0.5">{resource}</code>
                </li>
                <li>Auth: <strong>OAuth</strong> · leave advanced OAuth alone · create · approve Lychee</li>
                <li>
                  Start a <strong>new chat</strong> and enable the <strong>lychee</strong> plugin for that chat
                </li>
              </ol>
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
                  {copied === "prompt" ? "Copied prompt" : "Copy starter prompt"}
                </button>
              </div>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100 whitespace-pre-wrap">
                {STARTER_PROMPT}
              </pre>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold">2. What “working” looks like</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
                <li>ChatGPT calls Lychee tools (holders/trades) — not random Polymarket scraping</li>
                <li>
                  Dashboard link uses <code className="rounded bg-zinc-100 px-1">?workspace=</code> and opens
                  the new project
                </li>
                <li>Sheets + Lychee charts appear (not empty chart shells)</li>
                <li>Optional: publish for a shareable research URL</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold">3. Credits</h2>
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
              <h2 className="text-lg font-semibold">4. Personal access token (Cursor only)</h2>
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
