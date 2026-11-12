"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@/lib/hooks";
import Login from "@/components/login";

function AuthorizeInner() {
  const user = useUser();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const query = useMemo(() => {
    const obj = {};
    params.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }, [params]);

  const returnPath = useMemo(() => {
    const sp = new URLSearchParams(query).toString();
    return `/mcp/authorize${sp ? `?${sp}` : ""}`;
  }, [query]);

  async function approve() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/mcp/oauth/complete", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.message || "Authorization failed");
      return;
    }
    window.location.href = json.redirect_to;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-lg px-4 py-8">
          <h1 className="text-2xl font-semibold">Connect Lychee MCP</h1>
          <p className="mt-2 text-sm text-zinc-600">Sign in to authorize ChatGPT / Claude / Cursor.</p>
        </div>
        <Login fromHome redirectTo={returnPath} />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Authorize Lychee MCP</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Allow this client to use Lychee as <span className="font-medium">{user.email}</span>? It can search
          markets, build projects, and publish when you confirm.
        </p>
        <dl className="mt-4 space-y-2 rounded-xl bg-zinc-50 p-4 text-xs text-zinc-600">
          <div>
            <dt className="font-medium text-zinc-800">Client</dt>
            <dd className="break-all">{query.client_id || "unknown"}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-800">Redirect</dt>
            <dd className="break-all">{query.redirect_uri || "—"}</dd>
          </div>
        </dl>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={approve}
          className="mt-5 w-full rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Approving…" : "Approve"}
        </button>
      </div>
    </main>
  );
}

export default function McpAuthorizePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-zinc-500">Loading…</div>}>
      <AuthorizeInner />
    </Suspense>
  );
}
