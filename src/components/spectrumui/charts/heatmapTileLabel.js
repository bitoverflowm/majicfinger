/** Monospace average advance ≈ 0.6em. */
export function estimateCharWidth(fontSize) {
  return Math.max(4, fontSize * 0.6);
}

/**
 * Shrink font as tile shrinks and as the label grows longer.
 * @param {number} tw
 * @param {number} th
 * @param {string} label
 * @param {"full" | "compact" | "ticker"} tier
 */
export function tileLabelFontSize(tw, th, label, tier) {
  const areaBased = Math.sqrt(Math.max(1, tw * th)) / 6.5;
  const len = String(label || "").length;
  const lengthFactor =
    len <= 18 ? 1 : len <= 32 ? 0.9 : len <= 48 ? 0.78 : len <= 72 ? 0.68 : len <= 100 ? 0.6 : 0.52;
  let size = areaBased * lengthFactor;
  if (tier === "compact") size *= 0.88;
  if (tier === "ticker") size *= 0.82;
  const min = tier === "ticker" ? 7 : 8;
  const max = tier === "full" ? 15 : tier === "compact" ? 12 : 10;
  return Math.max(min, Math.min(max, size));
}

/**
 * Prefer fewer words in smaller tiles before wrapping.
 * @param {string} label
 * @param {"full" | "compact" | "ticker"} tier
 */
export function labelCopyForTier(label, tier) {
  const text = String(label || "").trim();
  if (!text) return "";
  const words = text.split(/\s+/).filter(Boolean);
  if (tier === "ticker") {
    if (words.length <= 2 && text.length <= 16) return text;
    const short = words.slice(0, 2).join(" ");
    return short.length > 16 ? `${short.slice(0, 15)}…` : short;
  }
  if (tier === "compact") {
    if (words.length <= 5 && text.length <= 42) return text;
    return words.slice(0, 5).join(" ");
  }
  return text;
}

/**
 * Word-wrap into at most `maxLines`, appending … when clipped.
 * @returns {{ lines: string[]; truncated: boolean }}
 */
export function wrapTileLabel(label, { maxWidth, fontSize, maxLines = 2 } = {}) {
  const words = String(label || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length || !(maxWidth > 0) || !(fontSize > 0) || maxLines < 1) {
    return { lines: [], truncated: false };
  }

  const maxChars = Math.max(3, Math.floor(maxWidth / estimateCharWidth(fontSize)));
  /** @type {string[]} */
  const lines = [];
  let line = "";
  let wordIdx = 0;

  const pushHardWord = (word) => {
    if (word.length <= maxChars) {
      lines.push(word);
      return;
    }
    lines.push(`${word.slice(0, Math.max(1, maxChars - 1))}…`);
  };

  while (wordIdx < words.length && lines.length < maxLines) {
    const word = words[wordIdx];
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
      wordIdx += 1;
      continue;
    }
    if (line) {
      lines.push(line);
      line = "";
      continue;
    }
    pushHardWord(word);
    wordIdx += 1;
  }

  if (line && lines.length < maxLines) {
    lines.push(line);
    line = "";
  }

  const truncated = wordIdx < words.length || !!line;
  if (truncated && lines.length) {
    const lastIdx = lines.length - 1;
    const last = lines[lastIdx];
    if (last.endsWith("…")) {
      // already ellipsized (hard word truncate)
    } else if (last.length >= maxChars) {
      lines[lastIdx] = `${last.slice(0, Math.max(1, maxChars - 1))}…`;
    } else {
      lines[lastIdx] = `${last}…`;
    }
  }

  return { lines, truncated };
}
