"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Newspaper, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIntegrationConnect } from "@/components/dashboardComposer/integrationConnectDialog";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import {
  defaultHistoricalNewsRange,
  HISTORICAL_NEWS_SINCE,
  pullHistoricalNews,
  runHistoricalNews,
} from "@/components/dashboardComposer/historicalNewsRun";
import { HistoricalNewsPreview } from "@/components/dashboardComposer/historicalNewsPreview";
import { cleanTerms } from "@/lib/newsQuery";
import { cn } from "@/lib/utils";

const EXAMPLES = ["Fed", "Bitcoin", "election", "OPEC", "hurricane"];

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
      <label className="text-[12px] font-semibold text-foreground">Keywords</label>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
        Headlines must mention every keyword. Press Enter or comma to add.
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
          aria-label="Add keyword"
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

function PreviewPane({ status, error, rows, label }) {
  if (status === "idle") {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-start overflow-y-auto bg-[#e6edf3] px-6 pb-6 pt-12 dark:bg-[#1c232b]">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <Newspaper className="size-4 text-muted-foreground" aria-hidden />
          What this looks like in Lychee
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-foreground/90">
          Match keywords across news headlines since 2019, then land them as a sheet on your dashboard.
        </p>
        <HistoricalNewsPreview />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-start overflow-y-auto bg-[#e6edf3] px-6 pb-6 pt-12 dark:bg-[#1c232b]">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
        <Newspaper className="size-4 text-muted-foreground" aria-hidden />
        Preview
      </div>
      {status === "loading" ? (
        <div className="mt-8 flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Searching headlines…
        </div>
      ) : null}
      {error ? (
        <p className="mt-4 text-[13px] text-destructive">{error}</p>
      ) : null}
      {status === "ready" && !rows.length ? (
        <p className="mt-4 text-[13px] text-muted-foreground">No headlines matched in that window.</p>
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
                      {row.published_at ? String(row.published_at).slice(0, 10) : "—"}
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
 * Historical-tab build step for news: keywords + date range → sheet.
 * Mirrors the guided filter step used by other historical integrations.
 */
export function HistoricalNewsBuild({ onBack, Title = "h2", Description = "p" }) {
  const connect = useIntegrationConnect();
  const canvas = useWorkspaceCanvas();
  const defaults = useMemo(() => defaultHistoricalNewsRange(), []);
  const [terms, setTerms] = useState([]);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [label, setLabel] = useState("");
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const ready = terms.length > 0 && from && to && from <= to && !!canvas;

  const preview = () => {
    if (!terms.length || !from || !to || from > to) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setError("");
    setRows([]);
    pullHistoricalNews({ terms, from, to, signal: controller.signal })
      .then((pulled) => {
        if (controller.signal.aborted) return;
        setRows(pulled.rows);
        setLabel(pulled.label);
        setStatus("ready");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Couldn't load headlines.");
        setStatus("error");
      });
  };

  const go = () => {
    if (!ready) return;
    void runHistoricalNews({
      terms,
      from,
      to,
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
            <Title className="text-xl font-semibold tracking-tight text-foreground">Historical News</Title>
            <Description className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Pull matching headlines since {HISTORICAL_NEWS_SINCE.slice(0, 4)} into a sheet — keywords and a date
              range, then Save and Go.
            </Description>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-4">
          <KeywordField terms={terms} onChange={setTerms} />
          <div>
            <label className="text-[12px] font-semibold text-foreground">Date range</label>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              Archive coverage starts {HISTORICAL_NEWS_SINCE}.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] font-medium text-muted-foreground">From</span>
                <input
                  type="date"
                  min={HISTORICAL_NEWS_SINCE}
                  max={to || undefined}
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-neutral-400 focus:ring-2 focus:ring-black/5 dark:focus:border-neutral-500 dark:focus:ring-white/10"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-muted-foreground">To</span>
                <input
                  type="date"
                  min={from || HISTORICAL_NEWS_SINCE}
                  max={defaults.to}
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-neutral-400 focus:ring-2 focus:ring-black/5 dark:focus:border-neutral-500 dark:focus:ring-white/10"
                />
              </label>
            </div>
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={!terms.length || !from || !to || from > to || status === "loading"}
              onClick={preview}
            >
              {status === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Preview headlines
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
            className={cn("bg-[#2f6fed] text-white hover:bg-[#2f6fed]/90")}
            onClick={go}
          >
            Save and Go
            <ArrowRight />
          </Button>
        </div>
      </div>
      <PreviewPane status={status} error={error} rows={rows} label={label} />
    </div>
  );
}
