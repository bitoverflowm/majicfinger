/**
 * Rich table for a trader activity sheet.
 * Type tags are the activity codes on the pull. The filter row appears
 * only when more than one code is present.
 */

const TYPE_LABELS = {
  TRADE: "Trade",
  SPLIT: "Split",
  MERGE: "Merge",
  REDEEM: "Redeem",
  REWARD: "Reward",
  CONVERSION: "Conversion",
  YIELD: "Yield",
  MAKER_REBATE: "Maker rebate",
  TAKER_REBATE: "Taker rebate",
  REFERRAL_REWARD: "Referral reward",
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  TIP: "Tip",
};

const TYPE_ORDER = Object.keys(TYPE_LABELS);

const TONES = {
  TRADE: "sky",
  SPLIT: "violet",
  MERGE: "amber",
  REDEEM: "emerald",
  REWARD: "teal",
  CONVERSION: "orange",
  YIELD: "lime",
  MAKER_REBATE: "cyan",
  TAKER_REBATE: "cyan",
  REFERRAL_REWARD: "teal",
  DEPOSIT: "emerald",
  WITHDRAWAL: "rose",
  TIP: "fuchsia",
};

const SIDES = new Set(["BUY", "SELL", "IN", "OUT"]);

const COMPACT_SCALE = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };

function text(row, ...keys) {
  for (const key of keys) {
    if (!key) continue;
    const value = row?.[key];
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function num(value) {
  if (value == null || value === "") return null;
  const raw = String(value).trim().replace(/[$,\s]/g, "").replace(/\u2212/g, "-");
  if (!raw) return null;
  const compact = raw.match(/^(-?\d+(?:\.\d+)?)([kmbt])$/i);
  const n = compact ? Number(compact[1]) * COMPACT_SCALE[compact[2].toLowerCase()] : Number(raw);
  return Number.isFinite(n) ? n : null;
}

function epochMs(value) {
  if (value == null || value === "") return null;
  const raw = String(value).trim().replace(/,/g, "");
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && Math.abs(numeric) > 1e9) {
    return Math.abs(numeric) < 1e12 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function activityTypeLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return TYPE_LABELS[raw.toUpperCase()] || raw;
}

export function activityTypeTone(value) {
  return TONES[String(value || "").trim().toUpperCase()] || "neutral";
}

/** Clock time when the page is one day, otherwise month, day, and time. */
export function activityTimeLabel(ms, sameDay) {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "";
  if (sameDay) {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {{ fields?: Record<string, string> }} [dataset]
 */
export function buildActivityRichTable(records, dataset) {
  const fields = dataset?.fields || {};
  const rows = (records || [])
    .map((record) => {
      const type = text(record, fields.type, "type").toUpperCase();
      const title = text(record, fields.label, "title");
      const outcome = text(record, fields.outcome, "outcome");
      const side = text(record, fields.side, "side").toUpperCase();
      const icon = text(record, fields.icon, "icon");
      const name = text(record, fields.name, "name") || text(record, "pseudonym");
      return {
        ms: epochMs(record?.[fields.time] ?? record?.timestamp),
        type,
        title,
        outcome: title && outcome && outcome.toLowerCase() !== title.toLowerCase() ? outcome : outcome && !title ? outcome : "",
        side: SIDES.has(side) ? side : "",
        size: num(record?.[fields.size] ?? record?.size),
        usdc: num(record?.[fields.value] ?? record?.usdc_size),
        price: num(record?.[fields.price] ?? record?.price),
        icon: /^https?:\/\//i.test(icon) ? icon : "",
        name,
        combo: /^(true|yes)$/i.test(text(record, fields.combo, "is_combo")),
      };
    })
    .filter((row) => row.type || row.title || row.ms != null || row.size != null || row.usdc != null);

  const times = rows.map((row) => row.ms).filter((ms) => ms != null);
  const sameDay = times.length > 0 && Math.max(...times) - Math.min(...times) < 24 * 60 * 60 * 1000;
  const labeled = rows.map((row) => ({
    ...row,
    time: row.ms != null ? activityTimeLabel(row.ms, sameDay) : "",
  }));

  const counts = new Map();
  for (const row of labeled) {
    if (!row.type) continue;
    counts.set(row.type, (counts.get(row.type) || 0) + 1);
  }
  const tags = [...counts.entries()]
    .sort((a, b) => {
      const ai = TYPE_ORDER.indexOf(a[0]);
      const bi = TYPE_ORDER.indexOf(b[0]);
      if (ai === -1 && bi === -1) return a[0].localeCompare(b[0]);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    })
    .map(([type, count]) => ({ type, label: activityTypeLabel(type), count, tone: activityTypeTone(type) }));

  const names = [...new Set(labeled.map((row) => row.name).filter(Boolean))];
  return {
    caption: names.length === 1 ? names[0] : "",
    tags: tags.length > 1 ? tags : [],
    rows: labeled,
    showSide: labeled.some((row) => row.side),
    showSize: labeled.some((row) => row.size != null),
    showUsdc: labeled.some((row) => row.usdc != null),
    showPrice: labeled.some((row) => row.price != null),
  };
}
