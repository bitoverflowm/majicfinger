"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { PanelRightClose, PanelRightOpen, Waypoints, X } from "lucide-react";

import { BorderBeam } from "@/components/magicui/border-beam";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { buildProvenanceGraph, PROVENANCE_NODE_SIZE } from "@/components/dashboardComposer/provenanceGraph";
import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";

const TONE = {
  kalshi: { accent: "#28CC95", flicker: "rgb(40, 204, 149)", kicker: "Source data" },
  polymarket: { accent: "#2E5CFF", flicker: "rgb(46, 92, 255)", kicker: "Source data" },
  source: { accent: "#0d99ff", flicker: "rgb(13, 153, 255)", kicker: "Source data" },
  filter: { accent: "#0d99ff", flicker: "rgb(13, 153, 255)", kicker: "Attribute filters" },
  enrichment: { accent: "#28CC95", flicker: "rgb(40, 204, 149)", kicker: "Enrichment" },
  sheet: { accent: "#0d99ff", flicker: "rgb(13, 153, 255)", kicker: "Sheet" },
  chart: { accent: "#2E5CFF", flicker: "rgb(46, 92, 255)", kicker: "Chart" },
  text: { accent: "#737373", flicker: "rgb(115, 115, 115)", kicker: "Text" },
  tab: { accent: "#737373", flicker: "rgb(115, 115, 115)", kicker: "Tab" },
};

export function ProvenanceMapButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Provenance"
        title="Provenance"
        onClick={() => setOpen(true)}
        className="inline-flex size-7 items-center justify-center rounded-md text-neutral-700 hover:bg-black/[0.05] dark:text-neutral-200 dark:hover:bg-white/10"
      >
        <Waypoints className="size-4" aria-hidden />
      </button>
      {open ? <ProvenanceMap onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ProvenanceMap({ onClose }) {
  const canvas = useWorkspaceCanvas();
  const ctx = useMyStateV2();
  const reduce = useReducedMotion();
  const [selectedId, setSelectedId] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  const tabs = Array.isArray(ctx?.workspaceStartTabs) && ctx.workspaceStartTabs.length
    ? ctx.workspaceStartTabs
    : canvas?.previewTabs;

  const graph = useMemo(
    () =>
      buildProvenanceGraph({
        name: canvas?.dashboardName,
        tabs,
        blocksByPage: canvas?.blocksByPage,
        tables: canvas?.tables,
        dataSheets: ctx?.dataSheets,
      }),
    [canvas?.blocksByPage, canvas?.dashboardName, canvas?.previewTabs, canvas?.tables, ctx?.dataSheets, ctx?.workspaceStartTabs, tabs],
  );

  const selected = graph.nodes.find((item) => item.id === selectedId) || null;
  const related = useMemo(() => relatedIds(graph, selectedId), [graph, selectedId]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const accent = toneFor(selected?.tone).accent;

  return createPortal(
    <div className="fixed inset-0 z-[640] flex bg-[#f5f5f5] text-foreground dark:bg-[#1e1e1e]" role="dialog" aria-label="Provenance">
      <FlickeringGrid
        className="pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]"
        squareSize={3}
        gridGap={6}
        flickerChance={0.12}
        color={accent === "#171717" ? "rgb(13, 153, 255)" : accent}
        maxOpacity={0.18}
      />
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Provenance</p>
            <h2 className="text-[18px] font-semibold tracking-tight">{graph.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            {detailOpen ? null : (
              <button
                type="button"
                aria-label="Show details"
                title="Show details"
                onClick={() => setDetailOpen(true)}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background shadow-sm hover:bg-accent"
              >
                <PanelRightOpen className="size-4" aria-hidden />
              </button>
            )}
            <button
              type="button"
              aria-label="Close provenance"
              onClick={onClose}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background shadow-sm hover:bg-accent"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </header>
        <div
          className="relative min-h-0 flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
          onPointerDown={(event) => {
            if (event.target !== event.currentTarget && !event.target.closest("[data-provenance-board]")) return;
            drag.current = { x: event.clientX, y: event.clientY, pan };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            setPan({
              x: drag.current.pan.x + (event.clientX - drag.current.x),
              y: drag.current.pan.y + (event.clientY - drag.current.y),
            });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        >
          <div
            data-provenance-board=""
            className="absolute left-0 top-0"
            style={{ width: graph.width, height: graph.height, transform: `translate(${pan.x}px, ${pan.y}px)` }}
          >
            <svg className="absolute inset-0 h-full w-full" aria-hidden>
              {graph.edges.map((item) => {
                if (!item.fromNode || !item.toNode) return null;
                const dim = selectedId && !related.has(item.from) && !related.has(item.to);
                const x1 = item.fromNode.x + PROVENANCE_NODE_SIZE.w;
                const y1 = item.fromNode.y + PROVENANCE_NODE_SIZE.h / 2;
                const x2 = item.toNode.x;
                const y2 = item.toNode.y + PROVENANCE_NODE_SIZE.h / 2;
                const mid = (x1 + x2) / 2;
                return (
                  <path
                    key={item.id}
                    d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={dim ? "rgba(120,120,120,0.25)" : "rgba(13,153,255,0.85)"}
                    strokeWidth={dim ? 1 : 1.6}
                  />
                );
              })}
            </svg>
            {graph.nodes.map((item, index) => (
              <ProvenanceNode
                key={item.id}
                node={item}
                index={index}
                reduce={reduce}
                selected={item.id === selectedId}
                dim={Boolean(selectedId) && !related.has(item.id)}
                onSelect={() => {
                  const next = selectedId === item.id ? "" : item.id;
                  setSelectedId(next);
                  if (next) setDetailOpen(true);
                }}
              />
            ))}
          </div>
        </div>
      </div>
      {detailOpen ? (
        <aside className="relative z-10 m-4 flex w-[320px] shrink-0 flex-col rounded-xl border border-border/70 bg-background p-4 shadow-sm">
          <button
            type="button"
            aria-label="Hide details"
            title="Hide details"
            onClick={() => setDetailOpen(false)}
            className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-black/[0.05] dark:hover:bg-white/10"
          >
            <PanelRightClose className="size-4" aria-hidden />
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto pt-6">
            {selected ? <NodeDetail node={selected} /> : <EmptyDetail count={graph.nodes.length} />}
          </div>
        </aside>
      ) : null}
    </div>,
    document.body,
  );
}

function ProvenanceNode({ node, index, reduce, selected, dim, onSelect }) {
  const tone = toneFor(node.tone);
  return (
    <motion.button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: dim ? 0.38 : 1, y: 0 }}
      transition={{ delay: reduce ? 0 : Math.min(index * 0.03, 0.4), duration: 0.28 }}
      className={cn(
        "absolute overflow-hidden rounded-xl border bg-background/95 px-3 py-2.5 text-left shadow-sm backdrop-blur-md transition hover:-translate-y-0.5",
        selected ? "border-transparent" : "border-border/70",
      )}
      style={{ left: node.x, top: node.y, width: PROVENANCE_NODE_SIZE.w, height: PROVENANCE_NODE_SIZE.h }}
    >
      {selected ? <BorderBeam size={80} duration={7} borderWidth={1.4} colorFrom={tone.accent} colorTo="#0d99ff" /> : null}
      <span className="block text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: tone.accent }}>
        {tone.kicker}
      </span>
      <span className="mt-1 block truncate text-[13px] font-semibold text-foreground">{node.title}</span>
      <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{node.subtitle}</span>
    </motion.button>
  );
}

function NodeDetail({ node }) {
  const tone = toneFor(node.tone);
  const facts = node.facts || {};
  const rows = [
    ["Label", node.title],
    ["Kind", tone.kicker],
    facts.lake ? ["Source", facts.lake] : null,
    facts.table ? ["Table", facts.table] : null,
    facts.integrationId ? ["Integration", facts.integrationId] : null,
    facts.rowCount ? ["Rows", Number(facts.rowCount).toLocaleString()] : null,
    facts.limit ? ["Row limit", Number(facts.limit).toLocaleString()] : null,
    facts.sortLine ? ["Sort", facts.sortLine] : null,
    facts.join?.match ? ["Join", facts.join.match === "outcomeToken" ? "Outcome token" : facts.join.match] : null,
    facts.join?.key ? ["Join key", facts.join.key] : null,
    facts.enrichment ? ["Enrichment", facts.enrichment] : null,
    facts.detail ? ["Detail", facts.detail] : null,
    facts.summary ? ["Summary", facts.summary] : null,
    facts.parentSheetId ? ["Comes from", facts.parentSheetId] : null,
  ].filter(Boolean);
  const filters = facts.attributeLines?.length ? facts.attributeLines : facts.filterText ? [facts.filterText] : [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: tone.accent }}>
          {tone.kicker}
        </p>
        <h3 className="mt-1 text-[16px] font-semibold leading-snug">{node.title}</h3>
        {node.subtitle ? <p className="mt-1 text-[13px] text-muted-foreground">{node.subtitle}</p> : null}
      </div>
      <dl className="flex flex-col gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border/70 px-3 py-2">
            <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 break-words text-[13px] text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      {filters.length ? (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Filters</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {filters.map((line) => (
              <li key={line} className="rounded-lg border border-border/70 bg-[#f5f5f5] px-3 py-2 text-[13px] dark:bg-[#1e1e1e]">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function EmptyDetail({ count }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Full path</p>
      <p className="text-[15px] font-semibold">Select a node</p>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {count > 1
          ? "Source data flows through attribute filters and enrichments into the sheets on each tab. Drag to move the map."
          : "This project has no placed sheets yet. A save and run will show the lake, table, filters, and enrichments here."}
      </p>
    </div>
  );
}

function toneFor(tone) {
  return TONE[tone] || TONE.source;
}

function relatedIds(graph, selectedId) {
  const ids = new Set();
  if (!selectedId) return ids;
  ids.add(selectedId);
  let grew = true;
  while (grew) {
    grew = false;
    for (const edge of graph.edges) {
      if (ids.has(edge.from) && !ids.has(edge.to)) {
        ids.add(edge.to);
        grew = true;
      }
      if (ids.has(edge.to) && !ids.has(edge.from)) {
        ids.add(edge.from);
        grew = true;
      }
    }
  }
  return ids;
}
