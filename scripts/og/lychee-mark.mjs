/** Vector redraw of the Lychee logo mark (public/logo.png). viewBox 0 0 100 120. */
export const MARK_ASPECT = 92 / 70;

export function lycheeMarkSvg(color = "#fff", { size = 100, tight = false } = {}) {
  const cx = 47;
  const cy = 61;
  const n = 23;
  const bumps = Array.from({ length: n }, (_, i) => {
    const a = Math.PI * (1.0 + (i / (n - 1)) * 1.0);
    const rx = 27.6 + (i % 3 === 1 ? 0.6 : 0);
    const ry = 24.5 + (i % 2 ? 0.5 : -0.3);
    const r = 2.7 + (i % 3) * 0.25;
    return `<circle cx="${(cx + Math.cos(a) * rx).toFixed(2)}" cy="${(cy + Math.sin(a) * ry).toFixed(2)}" r="${r.toFixed(2)}"/>`;
  }).join("");
  const sideBumps = [
    [19.4, 64.5, 2.8], [19.8, 69.5, 2.7], [20.6, 74.2, 2.6], [74.8, 63.5, 2.7], [74.4, 68.4, 2.6],
  ].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("");
  const box = tight ? { vb: "16.6 14.4 70 92", w: size, hgt: size * MARK_ASPECT } : { vb: "0 0 100 120", w: size, hgt: size * 1.2 };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${box.w}" height="${box.hgt}" viewBox="${box.vb}">
  <g fill="${color}">
    <path d="M20.2 77.6 C18.4 64 19.4 49 30 40 C38.5 34 56 34 64.5 39.5 C75 46 77 60 74.6 72 Q63 64.8 47.6 65.6 Q31.6 67.2 20.2 77.6 Z"/>
    ${bumps}${sideBumps}
    <path d="M37.6 20.2 Q37.8 16.4 42 16.6 Q46.4 17 46.2 20.8 L47.6 37.4 L43.2 37.6 L41.4 23.8 Q37.4 23.6 37.6 20.2 Z"/>
    <path d="M49.4 32.4 C57.4 22.2 72 19.2 85 25 C72.6 23.2 60.4 25.6 49.4 32.4 Z"/>
  </g>
  <g fill="none" stroke="${color}" stroke-linecap="round">
    <path d="M49.4 32.4 C57.4 22.2 72 19.2 85 25 C75.2 32.6 61 35.6 49.4 32.4 Z" stroke-width="1"/>
    <path d="M21.6 77.8 C23 92.6 34.4 104.4 48.2 104.4 C61.8 104.4 72.2 90.4 73.6 72.2" stroke-width="0.95"/>
  </g>
</svg>`;
}
