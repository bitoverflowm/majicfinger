function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hslToRgb(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hh < 60) {
    rp = c;
    gp = x;
  } else if (hh < 120) {
    rp = x;
    gp = c;
  } else if (hh < 180) {
    gp = c;
    bp = x;
  } else if (hh < 240) {
    gp = x;
    bp = c;
  } else if (hh < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: h * 360, s, l };
}

function rgbToHex({ r, g, b }) {
  const h = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function hslToHex(h, s, l) {
  return rgbToHex(hslToRgb(h, clamp(s, 0, 1), clamp(l, 0, 1)));
}

/** @returns {{ r: number, g: number, b: number } | null} */
export function parseColorToRgb(input) {
  if (input == null) return null;
  const s = String(input).trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const hsl = /^hsl\(\s*([-\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)$/i.exec(s);
  if (hsl) {
    const h = Number(hsl[1]);
    const ss = Number(hsl[2]) / 100;
    const l = Number(hsl[3]) / 100;
    return hslToRgb(h, ss, l);
  }
  return null;
}

/**
 * Build `count` distinct hex colors from palette stops: multi-stop RGB blend, then small HSL nudges so
 * neighboring gradient bins do not collapse to identical fills.
 * @param {string[]} palette
 * @param {number} count
 * @returns {string[]}
 */
export function extrapolateColorsFromPalette(palette, count) {
  const stops = (palette || []).map(parseColorToRgb).filter(Boolean);
  if (count <= 0) return [];
  if (stops.length === 0) {
    return Array.from({ length: count }, (_, i) => {
      const t = count === 1 ? 0.5 : i / (count - 1);
      return hslToHex(220, 0.35, 0.22 + 0.55 * t);
    });
  }
  if (stops.length === 1) {
    const { h, s, l } = rgbToHsl(stops[0]);
    return Array.from({ length: count }, (_, i) => {
      const t = count === 1 ? 0 : i / (count - 1);
      const span = clamp(36 + count * 0.4, 36, 110);
      const hueWalk = (i * 137.5083568965) % span;
      const h2 = (h + hueWalk - span / 2 + t * 22) % 360;
      const s2 = clamp(s * (0.7 + 0.3 * Math.sin(i * 0.85 + 0.4)), 0.18, 0.96);
      const l2 = clamp(l + 0.2 * Math.sin(i * 0.65 + t * Math.PI) + (t - 0.5) * 0.14, 0.16, 0.84);
      return hslToHex(h2, s2, l2);
    });
  }
  const k = stops.length;
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const pos = t * (k - 1);
    const j = Math.min(Math.floor(pos), k - 2);
    const f = pos - j;
    const r = lerp(stops[j].r, stops[j + 1].r, f);
    const g = lerp(stops[j].g, stops[j + 1].g, f);
    const b = lerp(stops[j].b, stops[j + 1].b, f);
    const hsl = rgbToHsl({ r: Math.round(r), g: Math.round(g), b: Math.round(b) });
    const spread = count > k ? clamp(10 + count / k, 10, 32) : 14;
    const golden = (i * 137.5083568965) % spread;
    const h3 = (hsl.h + golden - spread / 2 + Math.sin(i * 2.17) * 5) % 360;
    const s3 = clamp(hsl.s + (((i * 11) % 5) - 2) * 0.035, 0.14, 0.98);
    const l3 = clamp(hsl.l + (((i * 7) % 5) - 2) * 0.028, 0.13, 0.9);
    out.push(hslToHex(h3, s3, l3));
  }
  return out;
}

/** Pick near-black or near-white label color for a hex background. */
export function contrastTextForBackground(hex) {
  const rgb = parseColorToRgb(hex);
  if (!rgb) return "rgba(255,255,255,0.95)";
  const lin = [rgb.r, rgb.g, rgb.b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return L > 0.45 ? "rgba(17,24,39,0.92)" : "rgba(255,255,255,0.95)";
}

export function contrastStrokeForBackground(hex) {
  const rgb = parseColorToRgb(hex);
  if (!rgb) return "rgba(255,255,255,0.85)";
  const lin = [rgb.r, rgb.g, rgb.b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return L > 0.45 ? "rgba(17,24,39,0.2)" : "rgba(255,255,255,0.88)";
}
