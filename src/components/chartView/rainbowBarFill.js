/**
 * Palette pick per bar (row × series). `shuffleNonce` lets the user reshuffle assignments
 * without changing data; 0 gives the default deterministic mapping.
 */
export function rainbowBarFillFromPalette(activePalette, rowIndex, seriesIndex, xPivot, shuffleNonce = 0) {
  if (!Array.isArray(activePalette) || !activePalette.length) return null;
  const key = String(xPivot ?? rowIndex) + "\0" + String(seriesIndex);
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const nonce = Number(shuffleNonce) || 0;
  const mixed = (h ^ rowIndex * 0x9e3779b1 ^ seriesIndex * 0x85ebca77 ^ nonce * 0xc2b2ae35) >>> 0;
  return activePalette[mixed % activePalette.length];
}
