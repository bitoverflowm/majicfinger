"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  eventCloseSeries,
  formatProbability,
  holderLabel,
  partialCaption,
  sheetRecords,
} from "@/lib/visualizations/datasetDescriptor";

function num(value) {
  const n = Number(String(value ?? "").trim().replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function displayLabel(record, dataset) {
  if (dataset.datasetType === "holders") return holderLabel(record, dataset.fields) || "Holder";
  const fields = dataset.fields || {};
  const outcome = String(record[fields.outcome] ?? "").trim();
  const label = String(record[fields.label] ?? record[fields.market] ?? "").trim();
  if (label && outcome && outcome.toLowerCase() !== label.toLowerCase()) return `${label} · ${outcome}`;
  return label || outcome || "Row";
}

function rankedRows(dataset, records, limit) {
  const field = dataset.fields?.value;
  const rows = records
    .map((record) => ({ label: displayLabel(record, dataset), value: num(record[field]) }))
    .filter((row) => row.value != null && row.label);
  const diverging = dataset.datasetType === "positions_closed";
  rows.sort((a, b) => (diverging ? Math.abs(b.value) - Math.abs(a.value) : b.value - a.value));
  return rows.slice(0, limit || 10);
}

export function DatasetSummary({ sheet, dataset, view, limit = 10 }) {
  const records = useMemo(() => sheetRecords(sheet), [sheet]);
  const note = partialCaption(dataset, {
    shown: Math.min(limit, records.length),
    loaded: records.length,
    noun: view?.noun || "rows",
  });
  const rows = useMemo(() => rankedRows(dataset, records, limit), [dataset, limit, records]);
  const valueField = dataset.fields?.value;
  const single = records.length === 1 ? records[0] : null;
  const headline = single ? num(single[dataset.fields?.price || valueField]) : null;

  if (view?.view === "metric" || view?.view === "spec") {
    const shown = dataset.units?.price === "probability" && dataset.datasetType !== "open_interest" && dataset.datasetType !== "tick_size" && headline != null
      ? formatProbability(headline)
      : headline == null
        ? "—"
        : String(single?.[valueField] ?? headline);
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col justify-center px-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{view.label}</p>
        <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">{shown}</p>
        {dataset.datasetType === "tick_size" ? <p className="mt-1 text-[12px] text-muted-foreground">Minimum price increment</p> : null}
        {note ? <p className="mt-2 text-[11px] text-muted-foreground">{note}</p> : null}
      </div>
    );
  }

  if (view?.view === "quote" || view?.view === "quote-table") {
    const shown = records.slice(0, 8);
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-auto px-4 py-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{view.label}</p>
        {shown.map((row, index) => {
          const bid = num(row[dataset.fields?.bid]);
          const ask = num(row[dataset.fields?.ask]);
          const spread = bid != null && ask != null ? ask - bid : null;
          return (
            <div key={index} className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate">{displayLabel(row, dataset)}</span>
              <span className="shrink-0 font-mono tabular-nums">
                {bid != null ? formatProbability(bid) : "—"} / {ask != null ? formatProbability(ask) : "—"}
                {spread != null ? ` · ${formatProbability(spread)}` : ""}
              </span>
            </div>
          );
        })}
        {note ? <p className="text-[11px] text-muted-foreground">{note}</p> : null}
      </div>
    );
  }

  if (view?.view === "overview") {
    const row = records[0] || {};
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col justify-center gap-1 px-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{view.label}</p>
        <p className="text-[15px] font-semibold leading-snug">{displayLabel(row, dataset)}</p>
        {row[dataset.fields?.status] ? <p className="text-[12px] text-muted-foreground">{String(row[dataset.fields.status])}</p> : null}
        {note ? <p className="text-[11px] text-muted-foreground">{note}</p> : null}
      </div>
    );
  }

  if (!rows.length) {
    return <p className="px-3 text-[12px] text-muted-foreground">This {view?.label || "view"} has nothing to draw yet.</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col px-2 pb-2">
      <p className="px-1 pb-1 text-[11px] text-muted-foreground">
        {view?.label}
        {note ? ` · ${note}` : ""}
      </p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
            <CartesianGrid horizontal={false} strokeDasharray="2 4" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#2E5CFF">
              {view?.view === "diverging"
                ? rows.map((row, index) => <Cell key={`${row.label}-${index}`} fill={row.value < 0 ? "#fb7185" : "#28CC95"} />)
                : null}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function EventLinesChart({ sheet, dataset }) {
  const [market, setMarket] = useState("");
  const series = useMemo(
    () => eventCloseSeries(sheetRecords(sheet), dataset.fields || {}),
    [dataset.fields, sheet],
  );
  const visible = series.slice(0, 5);
  const active = visible.filter((item) => !market || item.market === market);
  const times = [...new Set(active.flatMap((item) => item.points.map((point) => point.t)))].sort((a, b) => a - b);
  const data = times.map((time) => {
    const row = { time };
    for (const item of active) {
      const point = item.points.find((entry) => entry.t === time);
      if (point) row[item.market] = point.price;
    }
    return row;
  });
  if (series.length < 2) {
    return <p className="px-3 text-[12px] text-muted-foreground">This event has one market. Its candles stay on that market.</p>;
  }
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col px-2 pb-2">
      <div className="flex items-center gap-2 px-1 pb-1">
        <p className="text-[11px] text-muted-foreground">Closing price by market</p>
        <select
          aria-label="Market"
          value={market}
          onChange={(event) => setMarket(event.target.value)}
          className="ml-auto max-w-[12rem] truncate rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px]"
        >
          <option value="">Up to five markets</option>
          {visible.map((item) => (
            <option key={item.market} value={item.market}>{item.market}</option>
          ))}
        </select>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, 1]} />
            <Tooltip />
            {active.map((item, index) => (
              <Line
                key={item.market}
                type="linear"
                dataKey={item.market}
                stroke={["#2E5CFF", "#28CC95", "#fb7185", "#f59e0b", "#a78bfa"][index % 5]}
                dot={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
