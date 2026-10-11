const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const COUNT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function text(row, ...keys) {
  for (const key of keys) {
    if (!key) continue;
    const value = row?.[key];
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function number(row, ...keys) {
  for (const key of keys) {
    if (!key || row?.[key] == null || String(row[key]).trim() === "") continue;
    const raw = String(row[key]).trim().replace(/[$,]/g, "");
    const match = raw.match(/^(-?\d+(?:\.\d+)?)\s*([KMB])?$/i);
    if (!match) continue;
    const n = Number(match[1]);
    if (!Number.isFinite(n)) continue;
    const scale = { K: 1e3, M: 1e6, B: 1e9 }[(match[2] || "").toUpperCase()] || 1;
    return n * scale;
  }
  return null;
}

function present(records, key) {
  return (records || []).some((row) => row?.[key] != null && String(row[key]).trim() !== "");
}

export function shortWallet(value) {
  const wallet = String(value || "").trim();
  if (!/^0x[a-fA-F0-9]{10,}$/.test(wallet)) return wallet;
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

export function traderInitials(name, wallet) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  if (words.length === 1 && words[0].length >= 2) return words[0].slice(0, 2).toUpperCase();
  const tail = String(wallet || "").replace(/^0x/i, "");
  return (tail.slice(0, 2) || "?").toUpperCase();
}

export function formatSignedUsd(value) {
  if (!Number.isFinite(value)) return "—";
  const body = MONEY.format(Math.abs(value));
  if (value < 0) return `−${body}`;
  if (value > 0) return `+${body}`;
  return body;
}

export function formatUsd(value) {
  if (!Number.isFinite(value)) return "—";
  if (value < 0) return formatSignedUsd(value);
  return MONEY.format(value);
}

export function formatShares(value) {
  if (!Number.isFinite(value)) return "—";
  return COUNT.format(value);
}

/** Top traders for the horizontal rank chart, in leaderboard order. */
export function leaderboardBarRows(records, dataset, limit = 10) {
  const fields = dataset?.fields || {};
  const money = dataset?.units?.metric === "usdc";
  const rows = [];
  for (const record of records || []) {
    const value = number(record, fields.value, "pnl", "value");
    if (value == null) continue;
    const name = text(record, fields.label, "user_name", "nickname", "name")
      || shortWallet(text(record, fields.wallet, "user_id", "proxy_wallet", "social_id"))
      || "Trader";
    const eventTitle = text(record, fields.event);
    const rank = number(record, fields.rank, "rank");
    rows.push({
      name: eventTitle ? `${name} · ${eventTitle}` : name,
      short: name.length > 18 ? `${name.slice(0, 17)}…` : name,
      value,
      display: money ? formatSignedUsd(value) : formatShares(value),
      rank: rank != null && rank > 0 ? rank : null,
    });
  }
  rows.sort((a, b) => {
    if (a.rank != null && b.rank != null) return a.rank - b.rank;
    if (a.rank != null) return -1;
    if (b.rank != null) return 1;
    return b.value - a.value;
  });
  return rows.slice(0, limit || 10);
}

function queryCaption(source, keys) {
  const first = source[0] || {};
  return keys
    .filter((key) => present(source, key) && source.every((row) => text(row, key) === text(first, key)))
    .map((key) => text(first, key));
}

function whenLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const numeric = Number(raw);
  const date = Number.isFinite(numeric) && numeric > 1e9
    ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
    : new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.split(",")[0];
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function kindLabel(value) {
  const kind = String(value || "").trim().toLowerCase();
  if (kind === "combo") return "Combo";
  if (kind === "market") return "Market";
  return kind;
}

/**
 * Biggest-win rows. The event stays one title, including a combo's joined legs.
 */
function buildBiggestWinsTable(source, dataset) {
  const fields = dataset?.fields || {};
  const rows = source
    .map((record) => {
      const name = text(record, fields.label, "user_name", "name");
      const wallet = text(record, fields.wallet, "user_id");
      const avatar = text(record, fields.avatar, "profile_image");
      const event = text(record, fields.event, "event_title");
      const kind = kindLabel(text(record, fields.kind, "kind"));
      const when = whenLabel(text(record, fields.resolved, "resolved_at"));
      return {
        name: name || shortWallet(wallet) || "Trader",
        wallet,
        avatar: /^https?:\/\//i.test(avatar) ? avatar : "",
        rank: number(record, fields.rank, "win_rank"),
        pnl: number(record, fields.value, "pnl"),
        stake: number(record, fields.stake, "initial_value"),
        event,
        kind,
        when,
      };
    })
    .filter((row) => row.name || row.event || row.rank != null);

  rows.sort((a, b) => {
    const aRank = a.rank != null && a.rank > 0 ? a.rank : Number.POSITIVE_INFINITY;
    const bRank = b.rank != null && b.rank > 0 ? b.rank : Number.POSITIVE_INFINITY;
    if (aRank !== bRank) return aRank - bRank;
    return (b.pnl ?? 0) - (a.pnl ?? 0);
  });

  const maxPnl = Math.max(1, ...rows.map((row) => Math.abs(row.pnl || 0)));
  const showRank = rows.some((row) => row.rank != null && row.rank > 0);
  return {
    caption: queryCaption(source, ["time_period", "category"]),
    columns: [
      showRank ? { id: "rank", label: "Rank" } : null,
      { id: "trader", label: "Trader" },
      { id: "win", label: "Win" },
      { id: "pnl", label: "PnL" },
    ].filter(Boolean),
    rows: rows.map((row) => ({
      ...row,
      pnlShare: row.pnl == null ? 0 : Math.abs(row.pnl) / maxPnl,
    })),
  };
}

/**
 * Rows for the stats Visual Table. Missing columns are omitted.
 * @param {Array<Record<string, unknown>>} records
 * @param {{ fields?: Record<string, string>, datasetType?: string }} [dataset]
 */
export function buildVisualTable(records, dataset) {
  const source = Array.isArray(records) ? records : [];
  if (dataset?.datasetType === "biggest_wins") return buildBiggestWinsTable(source, dataset);
  const fields = dataset?.fields || {};
  const hasColumn = (key) => source.some((row) => row && Object.prototype.hasOwnProperty.call(row, key));
  const showRank = present(source, fields.rank || "rank") || hasColumn(fields.rank || "rank");
  const showVolume = present(source, fields.volume || "volume") || hasColumn(fields.volume || "volume");
  const showVerified = present(source, fields.verified || "verified") || hasColumn(fields.verified || "verified");
  const showHandle = present(source, fields.handle || "x_username") || hasColumn(fields.handle || "x_username");
  const showPnl = present(source, "pnl") || present(source, fields.value || "value") || hasColumn("pnl") || hasColumn(fields.value || "value");
  const rows = source
    .map((record) => {
      const name = text(record, fields.label, "user_name", "nickname", "name");
      const wallet = text(record, fields.wallet, "user_id", "proxy_wallet", "social_id");
      const handle = text(record, fields.handle, "x_username");
      const avatar = text(record, fields.avatar, "profile_image");
      const rank = number(record, fields.rank, "rank");
      const pnl = number(record, "pnl", fields.value, "value");
      const volume = number(record, fields.volume, "volume");
      const verified = /^(true|yes|1)$/i.test(text(record, fields.verified, "verified"));
      return {
        name: name || shortWallet(wallet) || "Trader",
        wallet,
        handle: handle.replace(/^@/, ""),
        avatar: /^https?:\/\//i.test(avatar) ? avatar : "",
        rank,
        pnl,
        volume,
        verified,
      };
    })
    .filter((row) => row.name || row.wallet || row.rank != null);

  rows.sort((a, b) => {
    const aRank = a.rank != null && a.rank > 0 ? a.rank : Number.POSITIVE_INFINITY;
    const bRank = b.rank != null && b.rank > 0 ? b.rank : Number.POSITIVE_INFINITY;
    if (aRank !== bRank) return aRank - bRank;
    return (b.pnl ?? 0) - (a.pnl ?? 0);
  });

  const maxPnl = Math.max(1, ...rows.map((row) => Math.abs(row.pnl || 0)));
  const maxVolume = Math.max(1, ...rows.map((row) => Math.abs(row.volume || 0)));
  const caption = queryCaption(source, ["time_period", "category", "sort_by"]);

  const columns = [
    showRank ? { id: "rank", label: "Rank" } : null,
    { id: "trader", label: "Trader" },
    showPnl ? { id: "pnl", label: "PnL" } : null,
    showVolume ? { id: "volume", label: "Volume" } : null,
    showVerified ? { id: "verified", label: "Verified" } : null,
    showHandle ? { id: "handle", label: "X" } : null,
  ].filter(Boolean);

  return {
    caption,
    columns,
    rows: rows.map((row) => ({
      ...row,
      pnlShare: row.pnl == null ? 0 : Math.abs(row.pnl) / maxPnl,
      volumeShare: row.volume == null ? 0 : Math.abs(row.volume) / maxVolume,
    })),
  };
}
