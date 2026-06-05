import { inferColumnsFromRows } from "@/lib/projectPersistence";

export const CARD_GRID_COLUMNS_PER_ROW = 4;

export const CARD_GRID_ROW_LIMIT_OPTIONS = [4, 8, 12, 16, 20, 24];

export const CARD_GRID_FIELD_SLOTS = ["rank", "image", "header", "subheader", "tags", "value"];

const FIELD_COLUMN_HINTS = {
  image: ["image", "img", "photo", "thumbnail", "avatar", "logo", "icon", "picture", "banner"],
  header: ["title", "name", "header", "heading", "question", "label"],
  subheader: ["description", "subtitle", "subheader", "caption", "summary", "body"],
  tags: ["tags", "tag", "category", "categories", "labels", "topics", "type"],
  value: ["volume", "amount", "price", "count", "number", "value", "score", "total", "liquidity"],
};

function rid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function looksLikeImageUrl(value) {
  const s = String(value ?? "").trim();
  if (!s) return false;
  if (/^https?:\/\//i.test(s)) {
    return /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(s) || /\/(image|img|photo|avatar|thumb)/i.test(s);
  }
  return false;
}

export function getSheetColumnNames(sheet, rows) {
  if (Array.isArray(sheet?.columns) && sheet.columns.length) {
    return sheet.columns.map((c) => (typeof c === "string" ? c : c?.name || c?.key || "")).filter(Boolean);
  }
  return inferColumnsFromRows(rows);
}

function scoreColumnForField(columnName, field, sampleRows) {
  const lower = String(columnName || "").toLowerCase();
  const hints = FIELD_COLUMN_HINTS[field] || [];
  let score = 0;
  for (const hint of hints) {
    if (lower === hint) score += 10;
    else if (lower.includes(hint)) score += 5;
  }
  if (field === "image" && Array.isArray(sampleRows)) {
    const hits = sampleRows.slice(0, 8).filter((r) => looksLikeImageUrl(r?.[columnName])).length;
    score += hits * 3;
  }
  return score;
}

/**
 * @param {string[]} columns
 * @param {object[]} [sampleRows]
 */
export function inferCardGridFieldMappings(columns, sampleRows = []) {
  const cols = Array.isArray(columns) ? columns : [];
  const fields = {};
  for (const slot of CARD_GRID_FIELD_SLOTS) {
    if (slot === "rank") {
      fields.rank = { visible: true };
      continue;
    }
    let best = null;
    let bestScore = 0;
    for (const col of cols) {
      const score = scoreColumnForField(col, slot, sampleRows);
      if (score > bestScore) {
        bestScore = score;
        best = col;
      }
    }
    fields[slot] = {
      column: bestScore > 0 ? best : cols[0] || null,
      visible: slot !== "image" || bestScore > 0,
    };
  }
  if (fields.image?.column && !looksLikeImageUrl(sampleRows?.[0]?.[fields.image.column])) {
    const imgCol = cols.find((c) =>
      sampleRows.slice(0, 5).some((r) => looksLikeImageUrl(r?.[c])),
    );
    if (imgCol) {
      fields.image = { column: imgCol, visible: true };
    } else {
      fields.image = { column: fields.image.column, visible: false };
    }
  }
  return fields;
}

export function createCardGridRow({ sheetId = "", fields = null, rowLimit = 8 } = {}) {
  return {
    id: rid("row"),
    type: "cardGrid",
    h2: "",
    caption: "",
    sectionHeadingTheme: {},
    sectionSubheadingTheme: {},
    sheetId: sheetId ? String(sheetId) : "",
    rowLimit: CARD_GRID_ROW_LIMIT_OPTIONS.includes(rowLimit) ? rowLimit : 8,
    fields: fields || inferCardGridFieldMappings([]),
    rankTheme: {},
    headerTheme: {},
    subheaderTheme: {},
    tagsTheme: {},
    valueTheme: {},
  };
}

export function clampCardGridRowLimit(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 8;
  const rounded = Math.round(x);
  if (CARD_GRID_ROW_LIMIT_OPTIONS.includes(rounded)) return rounded;
  return Math.min(24, Math.max(4, Math.round(rounded / 4) * 4));
}

export function getCardGridFieldValue(rowData, fieldSlot, fields, rankIndex) {
  if (!rowData || typeof rowData !== "object") return "";
  if (fieldSlot === "rank") {
    return fields?.rank?.visible !== false ? String(rankIndex + 1) : "";
  }
  const mapping = fields?.[fieldSlot];
  if (!mapping || mapping.visible === false) return "";
  const col = mapping.column;
  if (!col) return "";
  const raw = rowData[col];
  if (raw == null || raw === "") return "";
  return raw;
}

export function formatCardGridTags(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value.map((t) => String(t ?? "").trim()).filter(Boolean);
  }
  const s = String(value).trim();
  if (!s) return [];
  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => String(t ?? "").trim()).filter(Boolean);
      }
    } catch {
      /* fall through */
    }
  }
  return s.split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
}

export function patchCardGridRowFieldsOnSheetChange(prevFields, columns, sampleRows) {
  const inferred = inferCardGridFieldMappings(columns, sampleRows);
  const next = { ...(prevFields || {}) };
  for (const slot of CARD_GRID_FIELD_SLOTS) {
    if (slot === "rank") {
      next.rank = { visible: prevFields?.rank?.visible !== false };
      continue;
    }
    const prev = prevFields?.[slot];
    const prevCol = prev?.column;
    const stillValid = prevCol && columns.includes(prevCol);
    next[slot] = {
      column: stillValid ? prevCol : inferred[slot]?.column ?? null,
      visible: prev?.visible !== undefined ? prev.visible : inferred[slot]?.visible ?? true,
    };
  }
  return next;
}
