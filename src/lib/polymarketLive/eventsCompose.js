/**
 * Polymarket Live — Get Event/Events compose (Search + Advanced / list events).
 */

/** @typedef {"search" | "advanced"} PolymarketEventsComposeMode */

/**
 * @typedef {{
 *   id: string;
 *   slug?: string;
 *   title?: string;
 * }} PolymarketEventRef
 */

/**
 * @typedef {{
 *   id: string;
 *   slug: string;
 *   label?: string;
 * }} PolymarketTagRef
 */

/**
 * @typedef {{
 *   mode: PolymarketEventsComposeMode;
 *   limit: number;
 *   orderFields: string[];
 *   ascending: boolean;
 *   eventRefs: PolymarketEventRef[];
 *   tags: PolymarketTagRef[];
 *   active: boolean | null;
 *   archived: boolean | null;
 *   featured: boolean | null;
 *   cyom: boolean | null;
 *   includeChat: boolean | null;
 *   includeTemplate: boolean | null;
 *   closed: boolean | null;
 *   recurrence: string;
 * }} PolymarketEventsComposeState
 */

export const POLYMARKET_EVENTS_COMPOSE_ENDPOINT_ID = "getEvents";

export const POLYMARKET_EVENTS_SORT_OPTIONS = [
  { value: "id", label: "ID" },
  { value: "volume", label: "Volume" },
  { value: "volume24hr", label: "Volume (24h)" },
  { value: "volume1wk", label: "Volume (1 wk)" },
  { value: "volume1mo", label: "Volume (1 mo)" },
  { value: "volume1yr", label: "Volume (1 yr)" },
  { value: "liquidity", label: "Liquidity" },
  { value: "openInterest", label: "Open interest" },
  { value: "startDate", label: "Start date" },
  { value: "creationDate", label: "Creation date" },
  { value: "endDate", label: "End date" },
  { value: "createdAt", label: "Created at" },
  { value: "updatedAt", label: "Updated at" },
  { value: "closedTime", label: "Closed time" },
  { value: "commentCount", label: "Comment count" },
  { value: "featuredOrder", label: "Featured order" },
];

export const POLYMARKET_EVENTS_RECURRENCE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

/** Response columns for Get Event/Events (list events). */
export const POLYMARKET_EVENTS_COMPOSE_COLUMNS = [
  { name: "id", type: "string", description: "Event ID" },
  { name: "ticker", type: "string", description: "Event ticker" },
  { name: "slug", type: "string", description: "Event slug" },
  { name: "title", type: "string", description: "Title" },
  { name: "subtitle", type: "string", description: "Subtitle" },
  { name: "description", type: "string", description: "Description" },
  { name: "resolutionSource", type: "string", description: "Resolution source" },
  { name: "startDate", type: "string", description: "Start date" },
  { name: "creationDate", type: "string", description: "Creation date" },
  { name: "endDate", type: "string", description: "End date" },
  { name: "image", type: "string", description: "Image URL" },
  { name: "icon", type: "string", description: "Icon URL" },
  { name: "active", type: "boolean", description: "Active" },
  { name: "closed", type: "boolean", description: "Closed" },
  { name: "archived", type: "boolean", description: "Archived" },
  { name: "new", type: "boolean", description: "New" },
  { name: "featured", type: "boolean", description: "Featured" },
  { name: "restricted", type: "boolean", description: "Restricted" },
  { name: "liquidity", type: "number", description: "Liquidity" },
  { name: "volume", type: "number", description: "Volume" },
  { name: "openInterest", type: "number", description: "Open interest" },
  { name: "sortBy", type: "string", description: "Sort by" },
  { name: "category", type: "string", description: "Category" },
  { name: "subcategory", type: "string", description: "Subcategory" },
  { name: "isTemplate", type: "boolean", description: "Is template" },
  { name: "templateVariables", type: "string", description: "Template variables" },
  { name: "published_at", type: "string", description: "Published at" },
  { name: "createdBy", type: "string", description: "Created by" },
  { name: "updatedBy", type: "string", description: "Updated by" },
  { name: "createdAt", type: "string", description: "Created at" },
  { name: "updatedAt", type: "string", description: "Updated at" },
  { name: "commentsEnabled", type: "boolean", description: "Comments enabled" },
  { name: "competitive", type: "number", description: "Competitive" },
  { name: "volume24hr", type: "number", description: "Volume 24h" },
  { name: "volume1wk", type: "number", description: "Volume 1 wk" },
  { name: "volume1mo", type: "number", description: "Volume 1 mo" },
  { name: "volume1yr", type: "number", description: "Volume 1 yr" },
  { name: "featuredImage", type: "string", description: "Featured image" },
  { name: "disqusThread", type: "string", description: "Disqus thread" },
  { name: "parentEvent", type: "string", description: "Parent event" },
  { name: "enableOrderBook", type: "boolean", description: "Enable order book" },
  { name: "liquidityAmm", type: "number", description: "Liquidity AMM" },
  { name: "liquidityClob", type: "number", description: "Liquidity CLOB" },
  { name: "negRisk", type: "boolean", description: "Neg risk" },
  { name: "negRiskMarketID", type: "string", description: "Neg risk market ID" },
  { name: "negRiskFeeBips", type: "integer", description: "Neg risk fee bips" },
  { name: "commentCount", type: "integer", description: "Comment count" },
  { name: "subEvents", type: "string", description: "Sub events" },
  { name: "markets", type: "string", description: "Nested markets (JSON)" },
  { name: "series", type: "string", description: "Series (JSON)" },
  { name: "categories", type: "string", description: "Categories (JSON)" },
  { name: "collections", type: "string", description: "Collections (JSON)" },
  { name: "tags", type: "string", description: "Tags (JSON)" },
  { name: "cyom", type: "boolean", description: "CYOM" },
  { name: "closedTime", type: "string", description: "Closed time" },
  { name: "showAllOutcomes", type: "boolean", description: "Show all outcomes" },
  { name: "showMarketImages", type: "boolean", description: "Show market images" },
  { name: "automaticallyResolved", type: "boolean", description: "Automatically resolved" },
  { name: "enableNegRisk", type: "boolean", description: "Enable neg risk" },
  { name: "automaticallyActive", type: "boolean", description: "Automatically active" },
  { name: "eventDate", type: "string", description: "Event date" },
  { name: "startTime", type: "string", description: "Start time" },
  { name: "eventWeek", type: "integer", description: "Event week" },
  { name: "seriesSlug", type: "string", description: "Series slug" },
  { name: "score", type: "string", description: "Score" },
  { name: "elapsed", type: "string", description: "Elapsed" },
  { name: "period", type: "string", description: "Period" },
  { name: "live", type: "boolean", description: "Live" },
  { name: "ended", type: "boolean", description: "Ended" },
  { name: "finishedTimestamp", type: "string", description: "Finished timestamp" },
  { name: "gmpChartMode", type: "string", description: "GMP chart mode" },
  { name: "eventCreators", type: "string", description: "Event creators (JSON)" },
  { name: "tweetCount", type: "integer", description: "Tweet count" },
  { name: "chats", type: "string", description: "Chats (JSON)" },
  { name: "featuredOrder", type: "integer", description: "Featured order" },
  { name: "estimateValue", type: "boolean", description: "Estimate value" },
  { name: "cantEstimate", type: "boolean", description: "Can't estimate" },
  { name: "estimatedValue", type: "string", description: "Estimated value" },
  { name: "templates", type: "string", description: "Templates (JSON)" },
  { name: "spreadsMainLine", type: "number", description: "Spreads main line" },
  { name: "totalsMainLine", type: "number", description: "Totals main line" },
  { name: "carouselMap", type: "string", description: "Carousel map" },
  { name: "pendingDeployment", type: "boolean", description: "Pending deployment" },
  { name: "deploying", type: "boolean", description: "Deploying" },
  { name: "deployingTimestamp", type: "string", description: "Deploying timestamp" },
  { name: "scheduledDeploymentTimestamp", type: "string", description: "Scheduled deployment timestamp" },
  { name: "gameStatus", type: "string", description: "Game status" },
];

/** Default selected columns for a useful first pull. */
export const POLYMARKET_EVENTS_COMPOSE_DEFAULT_COLUMNS = [
  "id",
  "ticker",
  "slug",
  "title",
  "subtitle",
  "active",
  "closed",
  "live",
  "volume",
  "volume24hr",
  "liquidity",
  "openInterest",
  "startDate",
  "endDate",
  "tags",
  "category",
];

/**
 * @returns {PolymarketEventsComposeState}
 */
export function emptyPolymarketEventsComposeState() {
  return {
    mode: "search",
    limit: 20,
    orderFields: ["volume"],
    ascending: false,
    eventRefs: [],
    tags: [],
    active: null,
    archived: null,
    featured: null,
    cyom: null,
    includeChat: null,
    includeTemplate: null,
    closed: null,
    recurrence: "",
  };
}

/**
 * @param {unknown} raw
 * @returns {PolymarketEventsComposeState}
 */
export function normalizePolymarketEventsComposeState(raw) {
  const base = emptyPolymarketEventsComposeState();
  if (!raw || typeof raw !== "object") return base;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const mode = o.mode === "advanced" ? "advanced" : "search";
  const limitNum = Number(o.limit);
  const limit = Number.isFinite(limitNum) && limitNum >= 0 ? Math.min(500, Math.floor(limitNum)) : 20;
  const orderFields = Array.isArray(o.orderFields)
    ? o.orderFields.map((f) => String(f || "").trim()).filter(Boolean)
    : base.orderFields;
  const eventRefs = Array.isArray(o.eventRefs)
    ? o.eventRefs
        .map((r) => {
          if (!r || typeof r !== "object") return null;
          const row = /** @type {Record<string, unknown>} */ (r);
          const id = String(row.id || "").trim();
          if (!id) return null;
          return {
            id,
            slug: String(row.slug || "").trim() || undefined,
            title: String(row.title || "").trim() || undefined,
          };
        })
        .filter(Boolean)
    : [];
  const tags = Array.isArray(o.tags)
    ? o.tags
        .map((t) => {
          if (!t || typeof t !== "object") return null;
          const row = /** @type {Record<string, unknown>} */ (t);
          const id = String(row.id || "").trim();
          const slug = String(row.slug || "").trim();
          if (!id && !slug) return null;
          return {
            id: id || slug,
            slug: slug || id,
            label: String(row.label || "").trim() || undefined,
          };
        })
        .filter(Boolean)
    : [];

  /** @param {unknown} v */
  const tri = (v) => (v === true ? true : v === false ? false : null);

  return {
    mode,
    limit,
    orderFields: orderFields.length ? orderFields : base.orderFields,
    ascending: o.ascending === true,
    eventRefs: /** @type {PolymarketEventRef[]} */ (eventRefs),
    tags: /** @type {PolymarketTagRef[]} */ (tags),
    active: tri(o.active),
    archived: tri(o.archived),
    featured: tri(o.featured),
    cyom: tri(o.cyom),
    includeChat: tri(o.includeChat),
    includeTemplate: tri(o.includeTemplate),
    closed: tri(o.closed),
    recurrence: String(o.recurrence || "").trim(),
  };
}

/**
 * Build query values for GET /events (via our polymarket proxy as listEvents).
 *
 * @param {PolymarketEventsComposeState} state
 * @returns {Record<string, string>}
 */
export function buildPolymarketEventsListQueryValues(state) {
  const s = normalizePolymarketEventsComposeState(state);
  /** @type {Record<string, string>} */
  const values = {};
  values.limit = String(s.limit);
  if (s.orderFields.length) values.order = s.orderFields.join(",");
  values.ascending = s.ascending ? "true" : "false";

  const ids = s.eventRefs.map((r) => r.id).filter(Boolean);
  if (ids.length) values.id = ids.join(",");
  const slugs = s.eventRefs.map((r) => r.slug).filter(Boolean);
  if (slugs.length) values.slug = slugs.join(",");

  // List events accepts a single tag filter — use the first selected tag.
  const primaryTag = s.tags[0];
  if (primaryTag) {
    if (/^\d+$/.test(String(primaryTag.id))) values.tag_id = String(primaryTag.id);
    if (primaryTag.slug) values.tag_slug = primaryTag.slug;
  }

  /** @param {string} key @param {boolean | null} v */
  const setBool = (key, v) => {
    if (v === true) values[key] = "true";
    else if (v === false) values[key] = "false";
  };
  setBool("active", s.active);
  setBool("archived", s.archived);
  setBool("featured", s.featured);
  setBool("cyom", s.cyom);
  setBool("include_chat", s.includeChat);
  setBool("include_template", s.includeTemplate);
  setBool("closed", s.closed);

  if (s.recurrence) values.recurrence = s.recurrence;

  return values;
}
