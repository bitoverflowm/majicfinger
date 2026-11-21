"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Newspaper, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIntegrationConnect } from "@/components/dashboardComposer/integrationConnectDialog";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import {
  NEWS_LIVE_LOOKBACKS,
  pullNewsLive,
  runNewsLive,
} from "@/components/dashboardComposer/newsLiveRun";
import { NewsLivePreview } from "@/components/dashboardComposer/newsLivePreview";
import { cleanTerms } from "@/lib/newsQuery";
import { cn } from "@/lib/utils";

const EXAMPLES = ["Fed", "Bitcoin", "election", "OPEC", "hurricane"];
const POLL_MS = 60_000;

function KeywordField({ terms, onChange }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const commit = (raw) => {
    const next = cleanTerms([...(terms || []), ...String(raw || "").split(/[,\n]+/)]);
    onChange(next);
    setDraft("");
  };

  return (
    <div>
      <label className="text-[12px] font-semibold text-foreground">Keyword filters</label>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
        Live headlines must mention every keyword. Press Enter or comma to add.
      </p>
      <div
        className="mt-2 flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 py-1.5 focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-black/5 dark:focus-within:border-neutral-500 dark:focus-within:ring-white/10"
        onClick={() => inputRef.current?.focus()}
      >
        {(terms || []).map((term) => (
          <span
            key={term}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[12px] text-foreground"
          >
            {term}
            <button
              type="button"
              aria-label={`Remove ${term}`}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                onChange((terms || []).filter((item) => item !== term));
              }}
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              if (draft.trim()) commit(draft);
            } else if (event.key === "Backspace" && !draft && terms?.length) {
              onChange(terms.slice(0, -1));
            }
          }}
          onBlur={() => {
            if (draft.trim()) commit(draft);
          }}
          placeholder={terms?.length ? "" : "e.g. Fed, rates"}
          aria-label="Add keyword filter"
          className="min-w-[8rem] flex-1 bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      {!terms?.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onChange(cleanTerms([...(terms || []), example]))}
              className="rounded-full border border-border px-3 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PreviewPane({ status, error, rows, label, live }) {
  if (status === "idle") {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-start overflow-y-auto bg-[#e6edf3] px-6 pb-6 pt-12 dark:bg-[#1c232b]">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <Newspaper className="size-4 text-muted-foreground" aria-hidden />
          What this looks like in Lychee
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-foreground/90">
          Filter the live news feed, then land matching headlines as a sheet that refreshes as stories arrive.
        </p>
        <NewsLivePreview />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-start overflow-y-auto bg-[#e6edf3] px-6 pb-6 pt-12 dark:bg-[#1c232b]">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
        <Newspaper className="size-4 text-muted-foreground" aria-hidden />
        Live preview
        {live ? (
          <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            <span className="relative flex size-1.5" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        ) : null}
      </div>
      {status === "loading" ? (
        <div className="mt-8 flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Listening for headlines…
        </div>
      ) : null}
      {error ? <p className="mt-4 text-[13px] text-destructive">{error}</p> : null}
      {status === "ready" && !rows.length ? (
        <p className="mt-4 text-[13px] text-muted-foreground">No live headlines matched those filters yet.</p>
      ) : null}
      {rows.length ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
          <div className="border-b border-border/50 px-3 py-2 text-[12px] font-semibold text-foreground">
            {label} · {rows.length.toLocaleString()} row{rows.length === 1 ? "" : "s"}
          </div>
          <div className="max-h-[22rem] overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Published</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 40).map((row, index) => (
                  <tr key={`${row.url || row.title}-${index}`} className="border-t border-border/40">
                    <td className="max-w-[14rem] truncate px-3 py-2 text-[12px] font-medium text-foreground">
                      {row.title || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[12px] text-muted-foreground">
                      {row.source || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {row.published_at ? String(row.published_at).slice(0, 16).replace("T", " ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Present-tab build step for live news: keyword filters + lookback → sheet.
 */
export function NewsLiveBuild({ onBack, Title = "h2", Description = "p" }) {
  const connect = useIntegrationConnect();
  const canvas = useWorkspaceCanvas();
  const [terms, setTerms] = useState([]);
  const [lookback, setLookback] = useState("24h");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [label, setLabel] = useState("");
  const [live, setLive] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const ready = terms.length > 0 && !!canvas;

  const load = (quiet = false) => {
    if (!terms.length) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!quiet) {
      setStatus("loading");
      setError("");
    }
    pullNewsLive({ terms, lookback, signal: controller.signal })
      .then((pulled) => {
        if (controller.signal.aborted) return;
        setRows(pulled.rows);
        setLabel(pulled.label);
        setStatus("ready");
        setLive(true);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Couldn't load live headlines.");
        setStatus("error");
        setLive(false);
      });
  };

  useEffect(() => {
    if (status !== "ready" || !terms.length) return undefined;
    const timer = window.setInterval(() => load(true), POLL_MS);
    return () => window.clearInterval(timer);
    // Re-arm when filters change after a successful preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional poll loop
  }, [status, terms, lookback]);

  const go = () => {
    if (!ready) return;
    void runNewsLive({
      terms,
      lookback,
      canvas,
      close: () => connect?.close?.(),
    });
  };

  return (
    <div className="grid min-h-0 min-w-0 flex-1 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <div className="flex min-h-0 flex-col bg-background">
        <div className="flex items-start gap-2 px-6 pb-3 pt-6">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to integrations"
              className="-ml-1.5 mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <Title className="text-xl font-semibold tracking-tight text-foreground">News Live</Title>
            <Description className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Filter the real-time news feed, preview matching headlines, then Save and Go to put them on a sheet.
            </Description>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-4">
          <KeywordField terms={terms} onChange={setTerms} />
          <div>
            <label className="text-[12px] font-semibold text-foreground">Lookback</label>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              How far back to listen before Save and Go.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {NEWS_LIVE_LOOKBACKS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLookback(item.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[12px] transition-colors",
                    lookback === item.id
                      ? "border-[#2f6fed] bg-[#e7f0ff] text-foreground dark:border-blue-400 dark:bg-blue-500/15"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={!terms.length || status === "loading"}
              onClick={() => load(false)}
            >
              {status === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Preview live feed
            </Button>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 px-6 py-4">
          {onBack ? (
            <Button type="button" variant="outline" onClick={onBack}>
              Previous
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={!ready}
            className="bg-[#2f6fed] text-white hover:bg-[#2f6fed]/90"
            onClick={go}
          >
            Save and Go
            <ArrowRight />
          </Button>
        </div>
      </div>
      <PreviewPane status={status} error={error} rows={rows} label={label} live={live} />
    </div>
  );
}
