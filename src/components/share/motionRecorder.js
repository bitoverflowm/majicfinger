/**
 * The chart-forming animation behind share videos and GIFs, drawn frame by frame on a canvas:
 * the line draws itself across the period, the value counts along with it, and headlines pop up
 * where they broke. The same drawing feeds the live preview, the video and the GIF.
 *
 * A scene: `{ title, subtitle, handle, url, valueKind: "cents" | "usd", series: [{ label, points: [{ t, v }] }],
 * news: [{ t, title, source }], theme: "dark" | "light", colors: [from, to], logo, drawMs, holdMs }`.
 */

const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";
const UP = "#28cc95";
const DOWN = "#fb7185";
/** Each headline stays up for this share of the drawing before the next takes over. */
const CALLOUT_SPAN = 0.16;

function ease(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

export function formatMotionValue(value, kind) {
  if (!Number.isFinite(value)) return "—";
  if (kind === "cents") return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}¢`;
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatChange(first, last, kind) {
  if (!Number.isFinite(first) || !Number.isFinite(last)) return "";
  const diff = last - first;
  if (kind === "cents") return `${diff >= 0 ? "+" : "−"}${Math.abs(diff * 100).toFixed(1)}¢`;
  return `${diff >= 0 ? "+" : "−"}${formatMotionValue(Math.abs(diff), kind).replace("−", "")}`;
}

function dayLabel(ms, spanMs) {
  const date = new Date(ms);
  return spanMs < 2 * 86_400_000
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function valueAt(points, t) {
  if (!points.length) return NaN;
  if (t <= points[0].t) return points[0].v;
  for (let index = 1; index < points.length; index += 1) {
    const b = points[index];
    if (b.t < t) continue;
    const a = points[index - 1];
    const k = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
    return a.v + (b.v - a.v) * k;
  }
  return points[points.length - 1].v;
}

/** The scene's time range and value range, worked out once. */
export function prepareScene(scene) {
  const all = scene.series.flatMap((line) => line.points);
  const t0 = Math.min(...all.map((point) => point.t));
  const t1 = Math.max(...all.map((point) => point.t));
  let lo = Math.min(...all.map((point) => point.v));
  let hi = Math.max(...all.map((point) => point.v));
  if (scene.valueKind === "cents") {
    lo = Math.max(0, lo - 0.04);
    hi = Math.min(1, hi + 0.04);
  }
  const pad = (hi - lo) * 0.12 || Math.abs(hi) * 0.1 || 1;
  const news = (scene.news || []).filter((item) => item.t >= t0 && item.t <= t1).sort((a, b) => a.t - b.t);
  return { ...scene, t0, t1, lo: lo - (scene.valueKind === "cents" ? 0 : pad), hi: hi + (scene.valueKind === "cents" ? 0 : pad), news };
}

export function sceneDuration(scene) {
  return (scene.drawMs || 6000) + (scene.holdMs || 1800);
}

/** Paints the frame `elapsed` ms into the animation on a `width` × `height` canvas. */
export function drawMotionFrame(ctx, scene, elapsed, width, height) {
  const dark = scene.theme !== "light";
  const [from, to] = scene.colors || ["#0d99ff", "#28cc95"];
  const unit = Math.min(width, height) / 100;
  const pad = width * 0.065;
  const ink = dark ? "#ffffff" : "#111318";
  const soft = dark ? "rgba(255,255,255,0.58)" : "rgba(17,19,24,0.58)";
  const faint = dark ? "rgba(255,255,255,0.1)" : "rgba(17,19,24,0.08)";

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = dark ? "#0b0d12" : "#f6f7f9";
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, width * 1.1);
  glow.addColorStop(0, `${from}${dark ? "40" : "26"}`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  const bar = ctx.createLinearGradient(0, 0, width, 0);
  bar.addColorStop(0, from);
  bar.addColorStop(1, to);
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, width, unit * 1.1);

  // Header: logo, name, handle.
  let y = pad * 0.9;
  const logoSize = unit * 6;
  if (scene.logo?.complete && scene.logo.naturalWidth) ctx.drawImage(scene.logo, pad, y, logoSize, logoSize);
  ctx.fillStyle = ink;
  ctx.font = `600 ${unit * 3.4}px ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillText("Lychee", pad + logoSize + unit * 1.8, y + logoSize / 2);
  if (scene.handle) {
    ctx.font = `${unit * 2.8}px ${MONO}`;
    ctx.fillStyle = soft;
    ctx.textAlign = "right";
    ctx.fillText(`@${scene.handle}`, width - pad, y + logoSize / 2);
    ctx.textAlign = "left";
  }
  y += logoSize + unit * 4;

  // Title and subtitle.
  ctx.textBaseline = "top";
  ctx.fillStyle = ink;
  ctx.font = `600 ${unit * 5.2}px ${FONT}`;
  for (const line of wrap(ctx, scene.title, width - pad * 2, 2)) {
    ctx.fillText(line, pad, y);
    y += unit * 6.4;
  }
  if (scene.subtitle) {
    ctx.fillStyle = soft;
    ctx.font = `${unit * 3}px ${FONT}`;
    for (const line of wrap(ctx, scene.subtitle, width - pad * 2, 1)) {
      ctx.fillText(line, pad, y + unit * 0.4);
      y += unit * 4.2;
    }
  }
  y += unit * 2.5;

  // Where the line has got to.
  const progress = ease(Math.min(1, Math.max(0, elapsed / (scene.drawMs || 6000))));
  const now = scene.t0 + (scene.t1 - scene.t0) * progress;
  const lead = scene.series[0];
  const firstValue = lead.points[0]?.v;
  const current = valueAt(lead.points, now);
  const rising = current >= firstValue;
  ctx.fillStyle = rising ? UP : DOWN;
  ctx.font = `700 ${unit * 11}px ${MONO}`;
  ctx.fillText(formatMotionValue(current, scene.valueKind), pad, y);
  const valueWidth = ctx.measureText(formatMotionValue(current, scene.valueKind)).width;
  ctx.font = `600 ${unit * 3.6}px ${MONO}`;
  ctx.fillText(formatChange(firstValue, current, scene.valueKind), pad + valueWidth + unit * 2.5, y + unit * 1.2);
  ctx.fillStyle = soft;
  ctx.font = `${unit * 2.8}px ${FONT}`;
  ctx.fillText(`${lead.label ? `${lead.label} · ` : ""}${dayLabel(now, scene.t1 - scene.t0)}`, pad + valueWidth + unit * 2.5, y + unit * 6.4);
  y += unit * 14;

  // Plot.
  const footer = unit * 11;
  const plot = { x: pad, y, w: width - pad * 2 - unit * 9, h: height - y - footer - unit * 6 };
  const xOf = (t) => plot.x + ((t - scene.t0) / Math.max(1, scene.t1 - scene.t0)) * plot.w;
  const yOf = (v) => plot.y + plot.h - ((v - scene.lo) / Math.max(1e-9, scene.hi - scene.lo)) * plot.h;

  ctx.strokeStyle = faint;
  ctx.lineWidth = Math.max(1, unit * 0.15);
  ctx.fillStyle = soft;
  ctx.font = `${unit * 2.4}px ${MONO}`;
  ctx.textBaseline = "middle";
  for (let index = 0; index <= 3; index += 1) {
    const v = scene.lo + ((scene.hi - scene.lo) * index) / 3;
    const gy = yOf(v);
    ctx.beginPath();
    ctx.moveTo(plot.x, gy);
    ctx.lineTo(plot.x + plot.w, gy);
    ctx.stroke();
    ctx.fillText(formatMotionValue(v, scene.valueKind), plot.x + plot.w + unit * 1.5, gy);
  }
  ctx.textBaseline = "top";
  ctx.fillText(dayLabel(scene.t0, scene.t1 - scene.t0), plot.x, plot.y + plot.h + unit * 1.5);
  ctx.textAlign = "right";
  ctx.fillText(dayLabel(scene.t1, scene.t1 - scene.t0), plot.x + plot.w, plot.y + plot.h + unit * 1.5);
  ctx.textAlign = "left";

  scene.series.forEach((line, lineIndex) => {
    const shown = line.points.filter((point) => point.t <= now);
    if (!shown.length) return;
    const head = { t: now, v: valueAt(line.points, now) };
    const path = [...shown, head];
    const stroke = ctx.createLinearGradient(plot.x, 0, plot.x + plot.w, 0);
    stroke.addColorStop(0, lineIndex ? `${to}99` : from);
    stroke.addColorStop(1, lineIndex ? `${from}99` : to);
    if (!lineIndex) {
      const area = ctx.createLinearGradient(0, plot.y, 0, plot.y + plot.h);
      area.addColorStop(0, `${from}44`);
      area.addColorStop(1, `${from}00`);
      ctx.beginPath();
      path.forEach((point, index) => (index ? ctx.lineTo(xOf(point.t), yOf(point.v)) : ctx.moveTo(xOf(point.t), yOf(point.v))));
      ctx.lineTo(xOf(head.t), plot.y + plot.h);
      ctx.lineTo(xOf(path[0].t), plot.y + plot.h);
      ctx.closePath();
      ctx.fillStyle = area;
      ctx.fill();
    }
    ctx.beginPath();
    path.forEach((point, index) => (index ? ctx.lineTo(xOf(point.t), yOf(point.v)) : ctx.moveTo(xOf(point.t), yOf(point.v))));
    ctx.strokeStyle = stroke;
    ctx.lineWidth = unit * (lineIndex ? 0.45 : 0.7);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (lineIndex) ctx.setLineDash([unit, unit]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!lineIndex) {
      ctx.fillStyle = to;
      ctx.shadowColor = to;
      ctx.shadowBlur = unit * 3;
      ctx.beginPath();
      ctx.arc(xOf(head.t), yOf(head.v), unit * 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });

  // Headlines: a dot where each broke, and a card for the latest one while it's fresh.
  const passed = scene.news.filter((item) => item.t <= now);
  passed.forEach((item, index) => {
    const px = xOf(item.t);
    const py = yOf(valueAt(lead.points, item.t));
    ctx.fillStyle = dark ? "#0b0d12" : "#ffffff";
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = unit * 0.45;
    ctx.beginPath();
    ctx.arc(px, py, unit * 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fbbf24";
    ctx.font = `700 ${unit * 1.7}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), px, py + unit * 0.1);
    ctx.textAlign = "left";
  });
  const latest = passed[passed.length - 1];
  if (latest) {
    const age = (now - latest.t) / Math.max(1, scene.t1 - scene.t0);
    const holding = progress >= 1 && latest === scene.news[scene.news.length - 1];
    const alpha = holding ? 1 : Math.max(0, Math.min(1, age < 0.02 ? age / 0.02 : (CALLOUT_SPAN - age) / 0.03));
    if (alpha > 0) {
      ctx.globalAlpha = alpha;
      const boxW = Math.min(plot.w * 0.62, unit * 62);
      ctx.font = `600 ${unit * 2.9}px ${FONT}`;
      const lines = wrap(ctx, latest.title, boxW - unit * 5, 3);
      const boxH = unit * 7.5 + lines.length * unit * 3.8;
      const px = xOf(latest.t);
      const py = yOf(valueAt(lead.points, latest.t));
      const bx = Math.min(Math.max(plot.x, px - boxW / 2), plot.x + plot.w - boxW);
      const above = py - boxH - unit * 3 > plot.y;
      const by = above ? py - boxH - unit * 3 : Math.min(py + unit * 3, plot.y + plot.h - boxH);
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = unit * 3;
      ctx.fillStyle = dark ? "#171a22" : "#ffffff";
      roundRect(ctx, bx, by, boxW, boxH, unit * 1.8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#fbbf2466";
      ctx.lineWidth = unit * 0.25;
      ctx.stroke();
      ctx.textBaseline = "top";
      ctx.fillStyle = "#fbbf24";
      ctx.font = `700 ${unit * 2.2}px ${FONT}`;
      const label = `NEWS ${scene.news.indexOf(latest) + 1}${latest.source ? ` · ${latest.source}` : ""} · ${dayLabel(latest.t, 0)}`;
      ctx.fillText(label.toUpperCase().slice(0, 60), bx + unit * 2.5, by + unit * 2.2);
      ctx.fillStyle = ink;
      ctx.font = `600 ${unit * 2.9}px ${FONT}`;
      lines.forEach((line, index) => ctx.fillText(line, bx + unit * 2.5, by + unit * 5.6 + index * unit * 3.8));
      ctx.globalAlpha = 1;
    }
  }

  // Footer.
  ctx.strokeStyle = faint;
  ctx.lineWidth = Math.max(1, unit * 0.15);
  ctx.beginPath();
  ctx.moveTo(pad, height - footer);
  ctx.lineTo(width - pad, height - footer);
  ctx.stroke();
  ctx.textBaseline = "middle";
  ctx.fillStyle = ink;
  ctx.font = `600 ${unit * 3}px ${FONT}`;
  ctx.fillText("Made with Lychee", pad, height - footer / 2);
  const room = width - pad * 2 - ctx.measureText("Made with Lychee").width - unit * 3;
  ctx.fillStyle = soft;
  ctx.font = `${unit * 2.8}px ${MONO}`;
  ctx.textAlign = "right";
  let link = scene.url || "lycheedata.com";
  if (ctx.measureText(link).width > room) link = link.replace(/^([^/]+)\/.+\/([^/]+)$/, "$1/…/$2");
  while (link.length > 4 && ctx.measureText(link).width > room) link = `${link.slice(0, -2)}…`;
  ctx.fillText(link, width - pad, height - footer / 2);
  ctx.restore();
}

/** The best format this browser can record a canvas in, MP4 first. */
export function motionVideoType() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

/** Plays the scene once on an off-screen canvas while recording it. Resolves a video Blob. */
export async function recordMotionVideo(scene, { width, height, fps = 30, onProgress } = {}) {
  const type = motionVideoType();
  if (!type) throw new Error("This browser can't record video. Try Chrome, Edge or Safari, or download a GIF.");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  drawMotionFrame(ctx, scene, 0, width, height);
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 10_000_000 });
  const chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data?.size) chunks.push(event.data);
  };
  const stopped = new Promise((resolve) => {
    recorder.onstop = resolve;
  });
  const total = sceneDuration(scene);
  recorder.start(250);
  await new Promise((resolve) => {
    const start = performance.now();
    const tick = (time) => {
      const elapsed = time - start;
      drawMotionFrame(ctx, scene, Math.min(elapsed, total), width, height);
      onProgress?.(Math.min(1, elapsed / total));
      if (elapsed < total) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());
  return new Blob(chunks, { type: type.split(";")[0] });
}

/** Draws the scene frame by frame into a looping GIF. Resolves a GIF Blob. */
export async function recordMotionGif(scene, { width, height, fps = 15, onProgress } = {}) {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const drawMs = scene.drawMs || 6000;
  const frames = Math.max(2, Math.round((drawMs / 1000) * fps));
  // One palette for every frame, taken from the finished chart, keeps colors steady and the file small.
  drawMotionFrame(ctx, scene, sceneDuration(scene), width, height);
  const palette = quantize(ctx.getImageData(0, 0, width, height).data, 256);
  const gif = GIFEncoder();
  for (let index = 0; index <= frames; index += 1) {
    const last = index === frames;
    drawMotionFrame(ctx, scene, last ? sceneDuration(scene) : (index / frames) * drawMs, width, height);
    const pixels = applyPalette(ctx.getImageData(0, 0, width, height).data, palette);
    gif.writeFrame(pixels, width, height, { palette: index ? undefined : palette, delay: last ? scene.holdMs || 1800 : Math.round(1000 / fps) });
    onProgress?.(index / frames);
    if (index % 4 === 3) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}

/**
 * Up to `max` headlines worth showing: precisely timed ones, spread across the period, favouring
 * those that sit next to the biggest price moves.
 */
export function pickMotionNews(articles, points, max = 5) {
  if (!points?.length) return [];
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const span = Math.max(1, t1 - t0);
  const window = span * 0.04;
  const scored = (articles || [])
    .filter((article) => article?.title && article.precision !== "day" && article.t >= t0 && article.t <= t1)
    .map((article) => ({ article, move: Math.abs(valueAt(points, article.t + window) - valueAt(points, article.t - window)) }))
    .sort((a, b) => b.move - a.move);
  const picked = [];
  for (const entry of scored) {
    if (picked.some((item) => Math.abs(item.t - entry.article.t) < span * CALLOUT_SPAN * 0.9)) continue;
    const source = String(entry.article.source || "").replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
    picked.push({ t: entry.article.t, title: entry.article.title, source });
    if (picked.length >= max) break;
  }
  return picked.sort((a, b) => a.t - b.t);
}

/** Thins a line to about `count` points for drawing. */
export function thinPoints(points, count = 400) {
  if (points.length <= count) return points;
  const step = (points.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, index) => points[Math.round(index * step)]);
}
