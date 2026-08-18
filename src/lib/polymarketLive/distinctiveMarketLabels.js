/** @param {string} title */
function words(title) {
  return String(title || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Drop shared leading/trailing words so overlay tabs keep only the variable
 * part of a market question (e.g. "Gavin Newsom" from two nomination markets).
 *
 * @param {string[]} titles
 * @returns {string[]}
 */
export function distinctiveMarketLabels(titles) {
  const cleaned = (titles || []).map((title) => String(title || "").trim());
  if (cleaned.length <= 1) return cleaned;
  if (new Set(cleaned).size <= 1) return cleaned;

  const tokenized = cleaned.map(words);
  if (tokenized.some((tokens) => !tokens.length)) return cleaned;

  let prefixCount = 0;
  while (
    tokenized.every(
      (tokens) => tokens[prefixCount] && tokens[prefixCount] === tokenized[0][prefixCount],
    )
  ) {
    prefixCount += 1;
  }

  let suffixCount = 0;
  while (
    tokenized.every((tokens) => {
      const index = tokens.length - 1 - suffixCount;
      return index >= prefixCount && tokens[index] === tokenized[0][tokenized[0].length - 1 - suffixCount];
    })
  ) {
    suffixCount += 1;
  }

  const parts = tokenized.map((tokens, index) => {
    const slice = tokens.slice(prefixCount, suffixCount ? tokens.length - suffixCount : tokens.length);
    let body = slice.join(" ").replace(/^[\s,;:·\-–—]+|[\s,;:·\-–—?!.]+$/g, "").trim();
    const letterCount = (body.match(/[A-Za-z]/g) || []).length;
    if (letterCount < 3 && prefixCount > 0) {
      body = `${tokens[prefixCount - 1]} ${body}`.trim();
    }
    return body || cleaned[index];
  });

  const uniqueParts = new Set(parts);
  const uniqueTitles = new Set(cleaned);
  if (uniqueParts.size < uniqueTitles.size) return cleaned;
  return parts;
}
