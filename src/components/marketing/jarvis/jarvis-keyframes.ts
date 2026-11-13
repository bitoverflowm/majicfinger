/** Keyframes for the /jarvis demos. Inject once alongside `FEATURE_KEYFRAMES`. */
export const JARVIS_KEYFRAMES = `
@keyframes jx-spin { to { transform: rotate(360deg); } }
@keyframes jx-breathe { 0%, 100% { transform: scale(.92); opacity: .55; } 50% { transform: scale(1.06); opacity: .95; } }
@keyframes jx-boot { 0% { transform: scale(.35); opacity: 0; filter: blur(6px); } 60% { transform: scale(1.08); opacity: 1; filter: none; } 100% { transform: scale(1); opacity: 1; } }
@keyframes jx-ping { from { transform: scale(.7); opacity: .7; } to { transform: scale(1.9); opacity: 0; } }
@keyframes jx-blip { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.5); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
@keyframes jx-dot { 0%, 80%, 100% { transform: translateY(0); opacity: .35; } 40% { transform: translateY(-3px); opacity: 1; } }
@keyframes jx-pop { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes jx-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes jx-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes jx-scan { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.jx-scanline { background: linear-gradient(90deg, transparent 0%, color-mix(in oklch, var(--secondary) 55%, transparent) 50%, transparent 100%); background-size: 200% 100%; animation: jx-scan 2.4s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .features-showcase [class*="jx-"] { animation: none !important; transition: none !important; }
}
`;
