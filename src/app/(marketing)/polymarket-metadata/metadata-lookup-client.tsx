"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildMostNeededView,
  cardEntityPillClass,
  outcomeBadgeClass,
  type MarketCardModel,
  type MostNeededView,
} from "./metadata-most-needed";

export type MetadataSuggestion = {
  entity: "event" | "market";
  id: string;
  slug?: string;
  title: string;
  subtitle?: string;
  conditionId?: string;
  parentEventId?: string;
  parentEventSlug?: string;
  volume24hr?: number;
};

function suggestionKey(s: MetadataSuggestion) {
  return `${s.entity}:${s.id}:${s.slug ?? ""}:${s.conditionId ?? ""}`;
}

function entityTagClass(entity: MetadataSuggestion["entity"]) {
  if (entity === "event") {
    return "bg-emerald-500/15 text-emerald-900 ring-1 ring-emerald-600/25 dark:bg-emerald-400/15 dark:text-emerald-100 dark:ring-emerald-400/35";
  }
  return "bg-violet-500/15 text-violet-900 ring-1 ring-violet-600/25 dark:bg-violet-400/15 dark:text-violet-100 dark:ring-violet-400/35";
}

const LYCHEE_HOME_HREF = "/";

type ResultEntityKind = "event" | "market";

function inferEntityFromMetadataLookupPayload(data: unknown): ResultEntityKind | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const parsed = d.parsed as { kind?: string } | undefined;
  const kind = parsed?.kind;
  if (!kind) return null;
  if (kind === "condition_id" || kind === "clob_token_id") return "market";
  if (kind === "empty") return null;

  const ok = (key: string) => d[key] != null && d[`${key}_error`] == null;

  if (kind === "numeric_id") {
    const hasM = ok("marketById");
    const hasE = ok("eventById");
    if (hasM && !hasE) return "market";
    if (hasE && !hasM) return "event";
    return null;
  }

  if (kind === "slug" || kind === "url_slug") {
    const hasM = ok("marketBySlug");
    const hasE = ok("eventBySlug");
    if (hasM && !hasE) return "market";
    if (hasE && !hasM) return "event";
    return null;
  }

  return null;
}

const suggestionListVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
      staggerChildren: 0.04,
      delayChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const suggestionRowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] },
  },
};

function MetadataField({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-x-3">
      <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 text-sm text-foreground", mono && "break-all font-mono text-[0.7rem] leading-snug")}>
        {children}
      </dd>
    </div>
  );
}

function MarketSummaryCard({
  model,
  compact,
  entityLabel,
}: {
  model: MarketCardModel;
  compact?: boolean;
  entityLabel: "market";
}) {
  const pad = compact ? "p-3.5" : "p-4";
  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-card/80 text-card-foreground shadow-sm backdrop-blur-sm",
        "dark:border-slate-800 dark:bg-slate-950/60",
        pad,
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <span
            className={cn(
              "inline-flex rounded px-1.5 py-0.5 text-[0.65rem] font-semibold capitalize tracking-wide",
              cardEntityPillClass(entityLabel),
            )}
          >
            {entityLabel}
          </span>
          <h4 className={cn("font-semibold leading-snug text-foreground", compact ? "text-sm" : "text-base")}>
            {model.title}
          </h4>
        </div>
      </div>
      <dl className="space-y-2.5">
        {model.entityId ? (
          <MetadataField label="Market ID" mono>
            {model.entityId}
          </MetadataField>
        ) : null}
        {model.slug ? (
          <MetadataField label="Slug" mono>
            {model.slug}
          </MetadataField>
        ) : null}
        {model.conditionId ? (
          <MetadataField label="Condition ID" mono>
            {model.conditionId}
          </MetadataField>
        ) : null}
        {model.oddsLine ? <MetadataField label="Odds / price">{model.oddsLine}</MetadataField> : null}
        {model.volumeLine ? <MetadataField label="Volume">{model.volumeLine}</MetadataField> : null}
      </dl>
      {model.clobTokens.length > 0 ? (
        <div className="mt-4 border-t border-border/70 pt-3 dark:border-slate-800/80">
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
            CLOB tokens
          </p>
          <ul className="space-y-2">
            {model.clobTokens.map((row) => (
              <li
                key={row.tokenId}
                className={cn(
                  "flex flex-col gap-1.5 rounded-lg border border-border/80 bg-muted/25 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between sm:gap-2",
                  row.highlighted && "ring-2 ring-primary/60 ring-offset-2 ring-offset-background dark:ring-offset-slate-950",
                )}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2 py-0.5 text-[0.65rem] font-semibold capitalize",
                      outcomeBadgeClass(row.tone),
                    )}
                  >
                    {row.outcomeLabel}
                  </span>
                </div>
                <code className="block min-w-0 break-all text-[0.68rem] leading-snug text-muted-foreground sm:text-right">
                  {row.tokenId}
                </code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function MostNeededMetadataSection({ view }: { view: MostNeededView }) {
  if (view.focus === "market") {
    return (
      <div className="space-y-3 border-t border-border/60 pt-5 dark:border-slate-800/80">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Most Needed metadata</h3>
        <MarketSummaryCard model={view.primary} entityLabel="market" />
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-border/60 pt-5 dark:border-slate-800/80">
      <h3 className="text-sm font-semibold tracking-tight text-foreground">Most Needed metadata</h3>
      <article
        className="rounded-xl border border-border bg-card/80 p-4 text-card-foreground shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/60"
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <span
              className={cn(
                "inline-flex rounded px-1.5 py-0.5 text-[0.65rem] font-semibold capitalize tracking-wide",
                cardEntityPillClass("event"),
              )}
            >
              event
            </span>
            <h4 className="text-base font-semibold leading-snug text-foreground">{view.primary.title}</h4>
          </div>
        </div>
        <dl className="space-y-2.5">
          {view.primary.entityId ? (
            <MetadataField label="Event ID" mono>
              {view.primary.entityId}
            </MetadataField>
          ) : null}
          {view.primary.slug ? (
            <MetadataField label="Slug" mono>
              {view.primary.slug}
            </MetadataField>
          ) : null}
          {view.primary.volumeLine ? <MetadataField label="Volume">{view.primary.volumeLine}</MetadataField> : null}
          <MetadataField label="Summary">{view.primary.summaryLine}</MetadataField>
        </dl>
      </article>

      {view.subMarkets.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Markets in this event</p>
          <div className="grid gap-3 sm:grid-cols-1">
            {view.subMarkets.map((m, i) => (
              <MarketSummaryCard
                key={`${m.conditionId ?? ""}-${m.entityId ?? ""}-${m.slug ?? ""}-${i}`}
                model={m}
                compact
                entityLabel="market"
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MetadataLookupClient() {
  const rootRef = useRef<HTMLDivElement>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const suggestSeqRef = useRef(0);

  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<MetadataSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [resultEntity, setResultEntity] = useState<ResultEntityKind | null>(null);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (term: string) => {
    const mySeq = ++suggestSeqRef.current;
    suggestAbortRef.current?.abort();

    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSuggestOpen(false);
      setSuggestLoading(false);
      return;
    }

    const ac = new AbortController();
    suggestAbortRef.current = ac;

    setSuggestLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        query: "metadataSuggestions",
        q: trimmed,
        limit_per_type: "18",
      });
      const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
        headers: { Accept: "application/json" },
        signal: ac.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (mySeq !== suggestSeqRef.current) return;

      if (!res.ok) {
        setSuggestions([]);
        setSuggestOpen(false);
        setError(typeof data?.message === "string" ? data.message : "Suggestions failed");
        return;
      }
      const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
      setSuggestions(list as MetadataSuggestion[]);
      setSuggestOpen(list.length > 0);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (e && typeof e === "object" && "name" in e && (e as { name: string }).name === "AbortError") return;
      if (mySeq !== suggestSeqRef.current) return;
      setSuggestions([]);
      setSuggestOpen(false);
      setError(e instanceof Error ? e.message : "Suggestions failed");
    } finally {
      if (mySeq === suggestSeqRef.current) {
        setSuggestLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(q);
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, fetchSuggestions]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setJsonCopied(false);
    if (copyResetRef.current) {
      clearTimeout(copyResetRef.current);
      copyResetRef.current = null;
    }
  }, [jsonText]);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  const copyJsonToClipboard = useCallback(async () => {
    const text = jsonText.trim();
    if (!text || resolveLoading || jsonText === "Loading…") return;
    try {
      await navigator.clipboard.writeText(text);
      setJsonCopied(true);
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => {
        setJsonCopied(false);
        copyResetRef.current = null;
      }, 2000);
    } catch {
      setJsonCopied(false);
    }
  }, [jsonText, resolveLoading]);

  const resolveSelection = useCallback(async (s: MetadataSuggestion) => {
    setSuggestOpen(false);
    setResolveLoading(true);
    setError(null);
    setResultEntity(null);
    try {
      const params = new URLSearchParams({ query: "metadataResolve", entity: s.entity });
      if (s.id) params.set("id", s.id);
      if (s.slug) params.set("slug", s.slug);
      if (s.entity === "market" && s.conditionId) params.set("conditionId", String(s.conditionId));
      const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setJsonText("");
        setResultEntity(null);
        setError(typeof data?.message === "string" ? data.message : "Resolve failed");
        return;
      }
      setJsonText(JSON.stringify(data, null, 2));
      setResultEntity(s.entity);
    } catch (e) {
      setJsonText("");
      setResultEntity(null);
      setError(e instanceof Error ? e.message : "Resolve failed");
    } finally {
      setResolveLoading(false);
    }
  }, []);

  const runFullLookup = useCallback(async () => {
    const trimmed = q.trim();
    if (!trimmed) {
      setError("Enter a search query, ID, slug, token id, or Polymarket URL.");
      return;
    }
    setSuggestOpen(false);
    setResolveLoading(true);
    setError(null);
    setResultEntity(null);
    try {
      const params = new URLSearchParams({ query: "metadataLookup", q: trimmed });
      const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setJsonText("");
        setResultEntity(null);
        setError(typeof data?.message === "string" ? data.message : "Request failed");
        return;
      }
      setJsonText(JSON.stringify(data, null, 2));
      setResultEntity(inferEntityFromMetadataLookupPayload(data));
    } catch (e) {
      setJsonText("");
      setResultEntity(null);
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setResolveLoading(false);
    }
  }, [q]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestOpen && suggestions.length > 0) {
        resolveSelection(suggestions[0]);
        return;
      }
      runFullLookup();
    }
  };

  const actionsBusy = resolveLoading;
  const canCopyJson =
    Boolean(jsonText?.trim()) && !resolveLoading && jsonText !== "Loading…";
  const showLycheeCta =
    Boolean(jsonText) && !resolveLoading && jsonText !== "Loading…";
  const mostNeededView = useMemo(() => {
    if (!jsonText || resolveLoading || jsonText === "Loading…") return null;
    return buildMostNeededView(jsonText, resultEntity, q);
  }, [jsonText, resultEntity, q, resolveLoading]);
  const lycheeAnalyzeLabel =
    resultEntity === "market"
      ? "Analyze this Market in Lychee"
      : resultEntity === "event"
        ? "Analyze this Event in Lychee"
        : "Analyze this Market or Event in Lychee";

  return (
    <div ref={rootRef} className="relative w-full max-w-2xl space-y-4 text-left">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 z-[1] flex h-4 w-4 -translate-y-1/2 items-center justify-center text-muted-foreground">
          <AnimatePresence mode="wait" initial={false}>
            {suggestLoading ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
                className="inline-flex"
              >
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              </motion.span>
            ) : (
              <motion.span
                key="search"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="inline-flex"
              >
                <Search className="h-4 w-4" aria-hidden />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <input
          type="search"
          placeholder="Type a question, id, slug, outcome token id, or paste a polymarket.com link…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          className={cn(
            "flex h-11 w-full rounded-md border border-slate-200 bg-white py-2 pl-10 pr-28 text-base text-foreground ring-offset-white placeholder:text-slate-500 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 md:text-sm dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300",
            suggestLoading && "shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]",
          )}
          aria-label="Polymarket metadata search"
          aria-busy={suggestLoading}
          aria-autocomplete="list"
          aria-expanded={suggestOpen}
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-1">
          <button
            type="button"
            onClick={runFullLookup}
            disabled={actionsBusy}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
            title="Fetch the full debug bundle (all strategies)"
          >
            Debug
          </button>
          <button
            type="button"
            onClick={() => (suggestOpen && suggestions[0] ? resolveSelection(suggestions[0]) : runFullLookup())}
            disabled={actionsBusy}
            className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-secondary/90 disabled:opacity-50 dark:text-secondary-foreground"
          >
            {actionsBusy ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                …
              </span>
            ) : (
              "Go"
            )}
          </button>
        </div>

        <AnimatePresence>
          {suggestOpen && suggestions.length > 0 ? (
            <motion.ul
              key="suggestions"
              role="listbox"
              variants={suggestionListVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-lg border border-border bg-popover py-1 text-left shadow-md"
            >
              {suggestions.map((s) => (
                <motion.li key={suggestionKey(s)} role="option" variants={suggestionRowVariants}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => resolveSelection(s)}
                  >
                    <span className="font-medium text-foreground">{s.title}</span>
                    <span className="text-xs text-muted-foreground">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-medium capitalize tracking-wide",
                          entityTagClass(s.entity),
                        )}
                      >
                        {s.entity}
                      </span>
                      {s.id ? ` · id ${s.id}` : ""}
                      {s.slug ? ` · ${s.slug}` : ""}
                      {s.conditionId ? ` · condition ${String(s.conditionId).slice(0, 10)}…` : ""}
                    </span>
                    {s.subtitle ? (
                      <span className="line-clamp-2 text-xs text-muted-foreground">{s.subtitle}</span>
                    ) : null}
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {suggestLoading ? (
            <motion.p
              key="searching-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full z-40 mt-1 text-center text-xs font-medium text-muted-foreground"
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <span className="inline-flex gap-0.5" aria-hidden>
                  <motion.span
                    className="inline-block h-1 w-1 rounded-full bg-primary/70"
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                  />
                  <motion.span
                    className="inline-block h-1 w-1 rounded-full bg-primary/70"
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.span
                    className="inline-block h-1 w-1 rounded-full bg-primary/70"
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  />
                </span>
                Searching for matches…
              </span>
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <Link
          href="https://twitter.com/misterrpink1"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
        >
          <Image src="/mrpink_pfp.jpg" alt="misterrpink" width={22} height={22} className="rounded-full object-cover" />
          <span>
            built by <span className="font-medium text-foreground">misterrpink</span>
          </span>
        </Link>
      </p>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <label htmlFor="metadata-json-out" className="text-sm font-medium text-muted-foreground">
            Result (JSON)
          </label>
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={copyJsonToClipboard}
              disabled={!canCopyJson}
              title={jsonCopied ? "Copied" : "Copy JSON"}
              aria-label={jsonCopied ? "Copied to clipboard" : "Copy JSON to clipboard"}
              className={cn(
                "relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition-colors",
                "hover:bg-muted hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "disabled:pointer-events-none disabled:opacity-40",
                "dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:ring-offset-slate-950",
              )}
            >
              <span className="sr-only">{jsonCopied ? "Copied" : "Copy"}</span>
              <AnimatePresence mode="wait" initial={false}>
                {jsonCopied ? (
                  <motion.span
                    key="check"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className="inline-flex"
                    aria-hidden
                  >
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className="inline-flex"
                    aria-hidden
                  >
                    <Copy className="h-4 w-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <AnimatePresence initial={false}>
              {jsonCopied ? (
                <motion.p
                  key="copied-label"
                  role="status"
                  aria-live="polite"
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap text-[0.65rem] font-semibold tracking-wide text-emerald-700 dark:text-emerald-400"
                >
                  Copied!
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
        <textarea
          id="metadata-json-out"
          readOnly
          value={jsonText || (resolveLoading ? "Loading…" : "")}
          placeholder="Choose a suggestion or use Go / Enter. Raw Gamma + CLOB fields appear here."
          className={cn(
            "min-h-[280px] w-full rounded-lg border p-4 font-mono text-xs leading-relaxed text-foreground shadow-inner",
            "border-slate-200 bg-white ring-offset-white placeholder:text-slate-500",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2",
            "dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300",
          )}
          spellCheck={false}
        />
        {mostNeededView ? <MostNeededMetadataSection view={mostNeededView} /> : null}
        {showLycheeCta ? (
          <div className="flex flex-col items-center justify-center gap-2 pt-1 sm:flex-row sm:gap-2.5">
            <p className="max-w-md text-center text-xs leading-snug text-muted-foreground sm:max-w-none sm:text-left">
              {lycheeAnalyzeLabel}
            </p>
            <Link
              href={LYCHEE_HOME_HREF}
              className="inline-flex shrink-0 items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
            >
              Open Lychee
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
