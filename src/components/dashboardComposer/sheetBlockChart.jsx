"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReadyTradeSheet, tradeTickerFromBlock } from "@/components/dashboardComposer/fullTradeSheet";
import { TradePriceChart } from "@/components/dashboardComposer/tradePriceChart";

function parseChartNumber(value) {
  const raw = String(value ?? "")
    .trim()
    .replace(/¢$/, "")
    .replace(/,/g, "");
  if (!raw) return null;
  const match = raw.match(/^(-?\d+(?:\.\d+)?)\s*([KMB])?$/i);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  const scale = { K: 1e3, M: 1e6, B: 1e9 }[(match[2] || "").toUpperCase()] || 1;
  return n * scale;
}

function looksLikeDates(labels) {
  const sample = labels.filter(Boolean).slice(0, 8);
  if (sample.length < 2) return false;
  const dated = sample.filter((label) => /\d/.test(label) && !Number.isNaN(Date.parse(label))).length;
  return dated / sample.length >= 0.6;
}

export function chartSeriesFromSheet(block) {
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  const cells = block?.cells || {};
  const rowIndexes = new Set();
  for (const key of Object.keys(cells)) {
    const row = Number(String(key).split(",")[1]);
    if (Number.isFinite(row)) rowIndexes.add(row);
  }
  const rows = [...rowIndexes].sort((a, b) => a - b);
  if (!columns.length || !rows.length) return null;

  const stats = columns.map((column, index) => {
    let numeric = 0;
    let filled = 0;
    for (const row of rows) {
      const text = cells[`${index},${row}`];
      if (text == null || text === "") continue;
      filled += 1;
      if (parseChartNumber(text) != null) numeric += 1;
    }
    return { index, title: column.title || `Column ${index + 1}`, numeric, filled };
  });
  const numeric = stats.filter((column) => column.filled && column.numeric / column.filled >= 0.6);
  const value =
    numeric.find((column) => /volume/i.test(column.title)) ||
    numeric.find((column) => /price/i.test(column.title)) ||
    numeric[0];
  if (!value) return null;
  const label = stats.find((column) => column.index !== value.index && column.filled && column.numeric / column.filled < 0.6);

  const data = [];
  for (const row of rows) {
    const n = parseChartNumber(cells[`${value.index},${row}`]);
    if (n == null) continue;
    data.push({
      label: label ? String(cells[`${label.index},${row}`] || row + 1) : String(row + 1),
      value: n,
    });
  }
  if (!data.length) return null;
  return {
    data: data.slice(0, 80),
    valueTitle: value.title,
    labelTitle: label?.title || "Row",
    kind: looksLikeDates(data.map((point) => point.label)) ? "line" : "bar",
    truncated: data.length > 80,
  };
}

function isTradeSheet(sheet) {
  if (!sheet) return false;
  if (tradeTickerFromBlock(sheet)) return true;
  const titles = (sheet.columns || []).map((column) => String(column?.title || "").trim().toLowerCase());
  return titles.includes("yes price") && titles.some((title) => title.includes("created"));
}

function matrixFromCells(sheet) {
  const columns = sheet?.columns || [];
  const cells = sheet?.cells || {};
  let max = -1;
  for (const key of Object.keys(cells)) {
    const row = Number(String(key).split(",")[1]);
    if (Number.isFinite(row)) max = Math.max(max, row);
  }
  if (max < 0) return [];
  const rows = [];
  for (let row = 0; row <= max; row += 1) {
    rows.push(columns.map((_, column) => cells[`${column},${row}`] ?? ""));
  }
  return rows;
}

export function SheetBlockChart({ sheet }) {
  const fullSheet = useReadyTradeSheet(sheet?.id);
  if (isTradeSheet(sheet)) {
    return <TradePriceChart columns={sheet.columns} rows={fullSheet?.rows || matrixFromCells(sheet)} />;
  }
  const series = chartSeriesFromSheet(sheet);
  if (!sheet) {
    return <p className="px-3 text-[12px] text-muted-foreground">The source table is no longer on this tab.</p>;
  }
  if (!series) {
    return <p className="px-3 text-[12px] text-muted-foreground">This table has no numeric column to chart yet.</p>;
  }

  const Chart = series.kind === "line" ? LineChart : BarChart;
  return (
    <div className="flex min-h-0 flex-1 flex-col px-2 pb-2">
      <p className="px-1 pb-1 text-[11px] text-muted-foreground">
        {series.valueTitle}
        {series.labelTitle ? ` by ${series.labelTitle}` : ""}
        {series.truncated ? " · first 80 rows" : ""}
      </p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={series.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis
              tick={{ fontSize: 10 }}
              width={48}
              tickFormatter={(value) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)}
            />
            <Tooltip />
            {series.kind === "line" ? (
              <Line type="monotone" dataKey="value" name={series.valueTitle} stroke="#0d99ff" strokeWidth={2} dot={false} />
            ) : (
              <Bar dataKey="value" name={series.valueTitle} fill="#0d99ff" radius={[3, 3, 0, 0]} />
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
