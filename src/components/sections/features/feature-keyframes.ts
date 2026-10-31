/** Keyframes shared by the homepage feature demos and the guide animations. Inject once per page section. */
export const FEATURE_KEYFRAMES = `
@keyframes fx-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes fx-word { from { opacity: 0; transform: translateY(4px); filter: blur(4px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes fx-draw { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes fx-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes fx-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes fx-fade-out { to { opacity: 0; } }
@keyframes fx-slide-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
@keyframes fx-flash { from { box-shadow: 0 0 0 0 rgba(47,111,237,.45); border-color: #2f6fed; } to { box-shadow: 0 0 0 7px rgba(47,111,237,0); } }
@keyframes fx-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.fx-skeleton { background: linear-gradient(90deg, var(--muted) 25%, var(--border) 50%, var(--muted) 75%); background-size: 200% 100%; animation: fx-shimmer 1.2s linear 1; }
.fx-shimmer-text { background: linear-gradient(90deg, var(--muted-foreground) 0%, var(--primary) 50%, var(--muted-foreground) 100%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: fx-shimmer 1.8s linear infinite; }
.fx-morph { transition: d .6s cubic-bezier(.165,.84,.44,1); }
.fx-bar { transition: y .6s cubic-bezier(.165,.84,.44,1), height .6s cubic-bezier(.165,.84,.44,1); }
@media (prefers-reduced-motion: reduce) {
  :is(.features-showcase, .guide-animation) [class*="fx-"] { animation: none !important; transition: none !important; }
  :is(.features-showcase, .guide-animation) .fx-skel { display: none; }
}
`;
