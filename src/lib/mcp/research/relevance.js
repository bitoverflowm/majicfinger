const STOP = new Set(
  "a an the this that for of to in on is are was were be and or what where when how who why there any market markets hot pulse jarvis please pls going on actually right now".split(
    " ",
  ),
);

export function tokens(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

const MONTHS = "january february march april may june july august september october november december".split(" ");

export function relevanceScore(query, title) {
  const q = tokens(query);
  const t = new Set(tokens(title));
  if (!q.length || !t.size) return 0;
  let hit = 0;
  for (const w of q) if (t.has(w)) hit += 1;
  let score = hit / q.length;
  const qYears = String(query).match(/\b20\d{2}\b/g) || [];
  const titleLower = String(title || "").toLowerCase();
  for (const y of qYears) {
    if (!String(title).includes(y)) score *= 0.35;
  }
  for (const m of MONTHS) {
    if (String(query).toLowerCase().includes(m) && !titleLower.includes(m) && !titleLower.includes(m.slice(0, 3))) {
      score *= 0.7;
    }
  }
  return score;
}
