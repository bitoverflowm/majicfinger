"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/lib/hooks";
import Login from "@/components/login";

export default function McpApprovePage() {
  const { token } = useParams();
  const user = useUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const returnPath = `/mcp/approve/${token}`;

  useEffect(() => {
    if (!token) return;
    fetch(`/api/mcp/confirm/${token}`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) setError(json.message || "Not found");
        else setData(json.data);
      })
      .catch(() => setError("Could not load confirmation"));
  }, [token]);

  async function resolve(approve, allowForever = false) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/mcp/confirm/${token}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve, allow_forever: allowForever }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.message || "Failed");
      return;
    }
    setDone(approve ? (allowForever ? "Approved forever for this action class." : "Approved once.") : "Denied.");
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-lg px-4 py-8">
          <h1 className="text-2xl font-semibold">Approve MCP action</h1>
          <p className="mt-2 text-sm text-zinc-600">Sign in to approve or deny this Lychee MCP request.</p>
        </div>
        <Login fromHome redirectTo={returnPath} />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Approve MCP action</h1>
        {data ? (
          <div className="mt-4 space-y-2 text-sm text-zinc-700">
            <p>
              <span className="font-medium">Tool:</span> {data.tool}
            </p>
            <p>
              <span className="font-medium">Class:</span> {data.action_class}
            </p>
            <p>
              <span className="font-medium">Credits:</span> {data.credit_quote}
            </p>
            <p>
              <span className="font-medium">Summary:</span> {data.summary || "—"}
            </p>
            <p>
              <span className="font-medium">Status:</span> {data.status}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">Loading…</p>
        )}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {done ? <p className="mt-3 text-sm text-emerald-700">{done}</p> : null}
        {data?.status === "pending" && data.owned_by_viewer ? (
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => resolve(true, false)}
              className="rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Approve once
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => resolve(true, true)}
              className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              Always allow this class
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => resolve(false, false)}
              className="rounded-full px-4 py-2.5 text-sm font-medium text-red-700 disabled:opacity-50"
            >
              Deny
            </button>
          </div>
        ) : null}
        <p className="mt-4 text-xs text-zinc-500">
          After approving, ask the agent to retry the same tool with the confirmation token.
        </p>
      </div>
    </main>
  );
}
