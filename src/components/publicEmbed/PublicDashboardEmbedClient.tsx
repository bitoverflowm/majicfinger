"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StateProviderV2 } from "@/context/stateContextV2";
import { BentoBase } from "@/app/dashboard/components/bentoBase";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

type Payload = {
  success: boolean;
  data?: { project_name?: string; project_data?: unknown[] };
  message?: string;
};

export default function PublicDashboardEmbedClient({
  username,
  slug,
}: {
  username: string;
  slug: string;
}) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dash, setDash] = useState<unknown[]>([]);
  const [bentoContainer, setBentoContainer] = useState({
    background: "dotPattern",
    background_color: "",
  });

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    setPayload(null);
    fetch(
      `/api/public/dashboards/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
    )
      .then((r) => r.json())
      .then((j: Payload) => {
        if (cancelled) return;
        if (!j?.success) {
          setErr(j?.message || "Not found");
          return;
        }
        setPayload(j);
        const pd = j.data?.project_data;
        setDash(Array.isArray(pd) ? pd : []);
      })
      .catch(() => {
        if (!cancelled) setErr("Failed to load dashboard");
      });
    return () => {
      cancelled = true;
    };
  }, [username, slug]);

  if (err) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <p>{err}</p>
        <Link href={SITE} className="text-foreground underline">
          Lychee Data
        </Link>
      </div>
    );
  }

  if (!payload?.success) {
    return (
      <div className="flex min-h-[240px] items-center justify-center p-6 text-sm text-muted-foreground">
        Loading dashboard…
      </div>
    );
  }

  return (
    <StateProviderV2 initialSettings={{ viewing: "dashboard", demo: false }}>
      <div className="w-full px-6 py-10 sm:px-10">
        <BentoBase
          data={dash}
          dashView
          demo={false}
          readOnly
          bentoContainer={bentoContainer}
          setDashData={setDash}
          setBentoContainer={setBentoContainer}
          viewing="dashboard"
          setViewing={() => {}}
        />
        <footer className="mt-8 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
          <span>Made with </span>
          <Link href={SITE} className="font-medium text-foreground underline">
            Lychee Data
          </Link>
          <span> · </span>
          <Link
            href={`${SITE}/${encodeURIComponent(username)}/dashboards/${encodeURIComponent(slug)}`}
            className="underline"
          >
            Open dashboard
          </Link>
          {payload.data?.project_name ? (
            <span className="block pt-1 opacity-80">{payload.data.project_name}</span>
          ) : null}
        </footer>
      </div>
    </StateProviderV2>
  );
}
