/**
 * Compact SVG chart snapshots for MCP chat (inline image content + markdown).
 * Clients that render MCP ImageContent / markdown images show these without a click.
 */

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickNumeric(row, keys) {
  for (const key of keys) {
    const n = toNum(row?.[key]);
    if (n != null) return n;
  }
  return null;
}

function pickLabel(row, keys, fallback) {
  for (const key of keys) {
    const v = row?.[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return fallback;
}

export function svgToImageContent(svg, { title = "Lychee chart" } = {}) {
  const data = Buffer.from(String(svg), "utf8").toString("base64");
  return {
    type: "image",
    data,
    mimeType: "image/svg+xml",
    title,
  };
}

export function imageMarkdown(image, alt = "Lychee chart") {
  if (!image?.data) return "";
  const mime = image.mimeType || "image/svg+xml";
  return `![${alt}](data:${mime};base64,${image.data})`;
}

/** Horizontal / vertical bar chart from labeled values. */
export function renderBarsSvg(rows, {
  title = "Chart",
  labelKeys = ["name", "pseudonym", "label", "proxy_wallet", "outcome"],
  valueKeys = ["amount", "size", "value", "price", "shares"],
  maxBars = 12,
  width = 720,
  height = 360,
} = {}) {
  const points = (rows || [])
    .map((row, i) => ({
      label: pickLabel(row, labelKeys, `#${i + 1}`).slice(0, 22),
      value: pickNumeric(row, valueKeys),
    }))
    .filter((p) => p.value != null && p.value >= 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, maxBars);
  if (!points.length) return null;

  const max = Math.max(...points.map((p) => p.value), 1e-9);
  const padL = 140;
  const padR = 24;
  const padT = 48;
  const padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const barH = Math.min(28, innerH / points.length - 6);
  const gap = (innerH - barH * points.length) / Math.max(1, points.length);

  const bars = points
    .map((p, i) => {
      const y = padT + i * (barH + gap);
      const w = Math.max(2, (p.value / max) * innerW);
      return `
      <rect x="${padL}" y="${y}" width="${w}" height="${barH}" rx="6" fill="url(#lycheeBar)"/>
      <text x="${padL - 10}" y="${y + barH * 0.72}" text-anchor="end" fill="#cbd5e1" font-size="12" font-family="ui-sans-serif,system-ui">${esc(p.label)}</text>
      <text x="${padL + w + 8}" y="${y + barH * 0.72}" fill="#f8fafc" font-size="11" font-family="ui-sans-serif,system-ui">${esc(formatCompact(p.value))}</text>`;
    })
    .join("");

  return wrapSvg(
    width,
    height,
    title,
    `
    <defs>
      <linearGradient id="lycheeBar" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#f97316"/>
        <stop offset="100%" stop-color="#fb923c"/>
      </linearGradient>
    </defs>
    ${bars}`,
  );
}

/** Price / tape line from chronological rows. */
export function renderLineSvg(rows, {
  title = "Price",
  xKeys = ["timestamp", "t", "time", "createdAt"],
  yKeys = ["price", "yes_price", "mid", "value"],
  maxPoints = 80,
  width = 720,
  height = 360,
} = {}) {
  const points = (rows || [])
    .map((row, i) => ({
      xLabel: pickLabel(row, xKeys, String(i)),
      y: pickNumeric(row, yKeys),
      i,
    }))
    .filter((p) => p.y != null);
  if (points.length < 2) return null;

  const step = Math.max(1, Math.ceil(points.length / maxPoints));
  const sampled = points.filter((_, i) => i % step === 0 || i === points.length - 1);
  const ys = sampled.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(1e-9, maxY - minY);
  const padL = 48;
  const padR = 20;
  const padT = 48;
  const padB = 36;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const coords = sampled.map((p, i) => {
    const x = padL + (i / Math.max(1, sampled.length - 1)) * innerW;
    const y = padT + (1 - (p.y - minY) / span) * innerH;
    return { x, y, yVal: p.y };
  });
  const d = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${d} L${coords[coords.length - 1].x.toFixed(1)},${padT + innerH} L${coords[0].x.toFixed(1)},${padT + innerH} Z`;

  return wrapSvg(
    width,
    height,
    title,
    `
    <defs>
      <linearGradient id="lycheeLineFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f97316" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#lycheeLineFill)"/>
    <path d="${d}" fill="none" stroke="#fb923c" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${coords[coords.length - 1].x}" cy="${coords[coords.length - 1].y}" r="4" fill="#fff7ed" stroke="#f97316" stroke-width="2"/>
    <text x="${padL}" y="${height - 12}" fill="#94a3b8" font-size="11" font-family="ui-sans-serif,system-ui">${esc(formatCompact(minY))} → ${esc(formatCompact(maxY))}</text>`,
  );
}

export function snapshotForSheet({ title, rows, chartView = "bars" }) {
  const view = String(chartView || "bars").toLowerCase();
  let svg = null;
  if (view === "trade-price" || view === "price" || view === "line" || view === "liveline" || view === "activity") {
    svg = renderLineSvg(rows, { title });
  } else if (view === "order-book") {
    svg = renderBarsSvg(rows, {
      title,
      labelKeys: ["side", "outcome", "label"],
      valueKeys: ["size", "amount", "quantity", "price"],
    });
  } else {
    // bars / treemap / default — ranked bars read well in chat
    svg = renderBarsSvg(rows, { title });
  }
  if (!svg) {
    svg = renderBarsSvg(rows, { title }) || renderLineSvg(rows, { title });
  }
  if (!svg) return null;
  const image = svgToImageContent(svg, { title });
  return {
    title,
    chart_view: view,
    markdown: imageMarkdown(image, title),
    image,
  };
}

/** Animated-ish Jarvis power-up card (SVG). */
export function jarvisPowerUpSvg({ subtitle = "Proactive Lychee watch online" } = {}) {
  return wrapSvg(
    720,
    280,
    "JARVIS MODE",
    `
    <defs>
      <radialGradient id="jarvisGlow" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.55"/>
        <stop offset="70%" stop-color="#0ea5e9" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="jarvisRing" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#7dd3fc"/>
        <stop offset="100%" stop-color="#0369a1"/>
      </linearGradient>
    </defs>
    <circle cx="360" cy="130" r="90" fill="url(#jarvisGlow)">
      <animate attributeName="r" values="78;96;78" dur="2.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="360" cy="130" r="54" fill="none" stroke="url(#jarvisRing)" stroke-width="3" opacity="0.9">
      <animate attributeName="stroke-dasharray" values="0 340;170 170;340 0" dur="2.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="360" cy="130" r="28" fill="#0ea5e9" opacity="0.85">
      <animate attributeName="opacity" values="0.45;1;0.45" dur="1.6s" repeatCount="indefinite"/>
    </circle>
    <text x="360" y="220" text-anchor="middle" fill="#e0f2fe" font-size="28" font-weight="700" font-family="ui-sans-serif,system-ui" letter-spacing="0.18em">JARVIS ONLINE</text>
    <text x="360" y="248" text-anchor="middle" fill="#7dd3fc" font-size="13" font-family="ui-sans-serif,system-ui">${esc(subtitle)}</text>`,
  );
}

export function jarvisPowerUpImage() {
  return svgToImageContent(jarvisPowerUpSvg(), { title: "Jarvis power-up" });
}

function wrapSvg(width, height, title, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
  <rect width="100%" height="100%" rx="18" fill="#0b1220"/>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="17" fill="none" stroke="#1e293b"/>
  <text x="24" y="30" fill="#f8fafc" font-size="16" font-weight="600" font-family="ui-sans-serif,system-ui">${esc(title)}</text>
  <text x="${width - 24}" y="30" text-anchor="end" fill="#64748b" font-size="11" font-family="ui-sans-serif,system-ui">Lychee</text>
  ${body}
</svg>`;
}

function formatCompact(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
  if (Math.abs(v) < 1 && Math.abs(v) > 0) return v.toFixed(3);
  return String(Math.round(v * 1000) / 1000);
}

/** Collect chart_images from a tool payload (nested sheets / composed). */
export function collectChartImages(payload) {
  const out = [];
  const seen = new Set();
  const push = (snap) => {
    const img = snap?.image || snap;
    if (!img?.data || seen.has(img.data.slice(0, 64))) return;
    seen.add(img.data.slice(0, 64));
    out.push({
      type: "image",
      data: img.data,
      mimeType: img.mimeType || "image/svg+xml",
      title: snap?.title || img.title || "Lychee chart",
    });
  };
  if (!payload || typeof payload !== "object") return out;
  if (Array.isArray(payload.chart_images)) payload.chart_images.forEach(push);
  if (payload.chart_snapshot) push(payload.chart_snapshot);
  if (payload.jarvis_power_up) push(payload.jarvis_power_up);
  if (Array.isArray(payload.sheets)) {
    for (const sheet of payload.sheets) {
      if (sheet?.chart_snapshot) push(sheet.chart_snapshot);
      if (Array.isArray(sheet?.chart_images)) sheet.chart_images.forEach(push);
    }
  }
  if (payload.composed?.chart_snapshot) push(payload.composed.chart_snapshot);
  if (payload.result?.chart_snapshot) push(payload.result.chart_snapshot);
  return out.slice(0, 6);
}

export function chartLeadMarkdown(images) {
  if (!images?.length) return "";
  return images
    .map((img, i) => imageMarkdown(img, img.title || `Chart ${i + 1}`))
    .join("\n\n");
}
