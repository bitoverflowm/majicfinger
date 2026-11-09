"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Link2, Loader2, Lock } from "lucide-react";
import { WorkspaceCanvas, WorkspaceCanvasProvider } from "@/components/dashboardComposer/workspaceCanvas";
import { SpectrumLoadingState } from "@/components/ui/spectrum-loading-state";
import { pageIdForTab } from "@/lib/workspaceDashboardDocument";
import { loadPublishedProject, unlockPublishedProject } from "@/lib/workspacePublishClient";
import { cn } from "@/lib/utils";

function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "";
}

function CopyLink() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-medium text-foreground hover:bg-muted"
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Link2 className="size-3.5" aria-hidden />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

function TopBar({ handle, slug }) {
  return (
    <div className="sticky top-0 z-50 flex h-14 items-center justify-between gap-3 border-b border-border/70 bg-background/90 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Lychee home">
          <Image src="/logo.png" width={24} height={24} alt="" className="size-6 rounded-full object-contain" />
          <span className="text-[14px] font-semibold tracking-tight text-foreground">Lychee</span>
        </Link>
        <span className="truncate font-mono text-[12px] text-muted-foreground">
          lycheedata.com/{handle}/{slug}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <CopyLink />
        <Link
          href="/"
          className="inline-flex h-8 items-center rounded-lg bg-[#0d99ff] px-3 text-[13px] font-medium text-white hover:bg-[#0b87e0]"
        >
          Build your own
        </Link>
      </div>
    </div>
  );
}

function Header({ handle, picture, title, description, labels, category, mode, updatedAt, headerUrl }) {
  const [more, setMore] = useState(false);
  const long = description.length > 360;
  return (
    <header className="mx-auto w-full max-w-5xl px-4 pb-6 pt-8 sm:px-6">
      {headerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={headerUrl} alt="" className="mb-6 aspect-[4/1] w-full rounded-2xl border border-border/60 object-cover" />
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          {picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={picture} alt="" className="size-5 rounded-full object-cover" />
          ) : (
            <span className="size-5 rounded-full bg-gradient-to-br from-sky-400 to-violet-500" aria-hidden />
          )}
          <span className="font-medium text-foreground">@{handle}</span>
        </span>
        <span aria-hidden>·</span>
        {mode === "snapshot" ? (
          <span>Snapshot from {formatDate(updatedAt)}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            Live{updatedAt ? ` · updated ${formatDate(updatedAt)}` : ""}
          </span>
        )}
        {category ? (
          <>
            <span aria-hidden>·</span>
            <span>{category}</span>
          </>
        ) : null}
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
      {description ? (
        <div className="mt-3 max-w-3xl">
          <p className={cn("whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground", long && !more && "line-clamp-4")}>{description}</p>
          {long ? (
            <button type="button" onClick={() => setMore((value) => !value)} className="mt-1 text-[13px] font-medium text-foreground hover:underline">
              {more ? "Show less" : "Read more"}
            </button>
          ) : null}
        </div>
      ) : null}
      {labels.length ? (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Labels">
          {labels.map((label) => (
            <li key={label} className="rounded-full border border-border px-2.5 py-0.5 text-[12px] text-muted-foreground">
              {label}
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}

function PasswordGate({ handle, slug }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="mx-auto mt-6 w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        const result = await unlockPublishedProject(handle, slug, password);
        setBusy(false);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        router.refresh();
      }}
    >
      <span className="mx-auto grid size-10 place-items-center rounded-full bg-[#e5f4ff] text-[#0d99ff] dark:bg-[#1f3347]">
        <Lock className="size-4" aria-hidden />
      </span>
      <h2 className="mt-3 text-[15px] font-semibold text-foreground">This dashboard needs a password</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">Ask @{handle} for it.</p>
      <label htmlFor="published-password" className="sr-only">
        Password
      </label>
      <input
        id="published-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="mt-4 h-9 w-full rounded-lg border border-border bg-background px-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[#0d99ff]/40"
      />
      {error ? <p className="mt-2 text-[12px] text-rose-600">{error}</p> : null}
      <button
        type="submit"
        disabled={busy || !password}
        className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#0d99ff] text-[13px] font-medium text-white hover:bg-[#0b87e0] disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Open dashboard
      </button>
    </form>
  );
}

function CanvasTabs({ tabs, activeId, onSelect }) {
  if (tabs.length < 2) return null;
  return (
    <div role="tablist" aria-label="Dashboard tabs" className="relative z-30 flex shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto bg-background px-4 py-3 sm:px-6">
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(tab.id)}
            className={cn(
              "inline-flex h-7 shrink-0 items-center rounded-md border border-border px-2.5 text-xs font-medium shadow-sm",
              selected ? "bg-card text-foreground" : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.name || "Tab"}
          </button>
        );
      })}
    </div>
  );
}

function PublishedCanvas({ doc }) {
  const tabs = Array.isArray(doc?.tabs) ? doc.tabs : [];
  const [tabId, setTabId] = useState(doc?.active_tab_id || tabs[0]?.id || "");
  return (
    <section aria-label="Dashboard" className="relative flex h-[100svh] flex-col border-t border-border/70">
      <CanvasTabs tabs={tabs} activeId={tabId} onSelect={setTabId} />
      <div className="relative min-h-0 flex-1">
        <WorkspaceCanvasProvider publishedDoc={doc} pageId={pageIdForTab(tabId || "welcome")}>
          <WorkspaceCanvas />
        </WorkspaceCanvasProvider>
      </div>
    </section>
  );
}

function Summary({ summary, mode, handle }) {
  if (!summary.length) return null;
  return (
    <section aria-labelledby="published-summary" className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <h2 id="published-summary" className="text-lg font-semibold text-foreground">
        What&apos;s on this dashboard
      </h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Built by @{handle} on Lychee with Polymarket and Kalshi data.{" "}
        {mode === "snapshot" ? "The numbers are a snapshot from when it was published." : "It updates as the markets move."}
      </p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        {summary.map((tab) => (
          <div key={tab.id} className="rounded-xl border border-border/70 p-4">
            <dt className="text-[14px] font-semibold text-foreground">{tab.name}</dt>
            {tab.about ? <dd className="mt-1 text-[13px] text-muted-foreground">{tab.about}</dd> : null}
            {tab.pieces.length ? <dd className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{tab.pieces.join(" · ")}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  );
}

/** A published project's public page. */
export function PublishedProjectView({ handle, picture, slug, title, description, labels, category, mode, updatedAt, headerUrl, locked, initialDoc, summary }) {
  const [doc, setDoc] = useState(initialDoc);
  const [error, setError] = useState("");

  useEffect(() => {
    if (locked || doc) return undefined;
    let alive = true;
    loadPublishedProject(handle, slug).then((result) => {
      if (!alive) return;
      if (result.ok) setDoc(result.data);
      else setError(result.message);
    });
    return () => {
      alive = false;
    };
  }, [doc, handle, locked, slug]);

  return (
    <div className="min-h-svh bg-background">
      <TopBar handle={handle} slug={slug} />
      <Header
        handle={handle}
        picture={picture}
        title={title}
        description={description}
        labels={labels}
        category={category}
        mode={mode}
        updatedAt={updatedAt}
        headerUrl={headerUrl}
      />
      {locked ? (
        <PasswordGate handle={handle} slug={slug} />
      ) : doc ? (
        <PublishedCanvas doc={doc} />
      ) : (
        <div className="flex h-[60svh] items-center justify-center border-t border-border/70">
          {error ? <p className="text-[13px] text-muted-foreground">{error}</p> : <SpectrumLoadingState label="Loading dashboard" />}
        </div>
      )}
      <Summary summary={summary} mode={mode} handle={handle} />
      <footer className="border-t border-border/70 px-4 py-8 text-center text-[13px] text-muted-foreground">
        Made with{" "}
        <Link href="/" className="font-medium text-foreground hover:underline">
          Lychee
        </Link>{" "}
        · prediction market dashboards anyone can build
      </footer>
    </div>
  );
}
