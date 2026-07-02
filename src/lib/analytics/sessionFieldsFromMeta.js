const LANDING_FIELD_KEYS = [
  "entryPath",
  "entryUrl",
  "entrySearch",
  "referrer",
  "pageType",
  "pageName",
  "visitorId",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
];

const LANDING_DB_MAP = {
  entryPath: "entry_path",
  entryUrl: "entry_url",
  entrySearch: "entry_search",
  referrer: "referrer",
  pageType: "page_type",
  pageName: "page_name",
  visitorId: "visitor_id",
  utm_source: "utm_source",
  utm_medium: "utm_medium",
  utm_campaign: "utm_campaign",
  utm_term: "utm_term",
  utm_content: "utm_content",
};

/** @param {Record<string, unknown>} meta */
export function landingFieldsFromMeta(meta = {}) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const key of LANDING_FIELD_KEYS) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) {
      out[LANDING_DB_MAP[key]] = value.trim();
    }
  }
  return out;
}

/** @param {{ entry_path?: string; entry_url?: string; entry_search?: string; referrer?: string; page_type?: string; page_name?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_term?: string; utm_content?: string }} session */
export function buildUtmTelegramFields(session = {}) {
  /** @type {Record<string, string>} */
  const fields = {};
  if (session.utm_source) fields["UTM source"] = session.utm_source;
  if (session.utm_medium) fields["UTM medium"] = session.utm_medium;
  if (session.utm_campaign) fields["UTM campaign"] = session.utm_campaign;
  if (session.utm_term) fields["UTM term"] = session.utm_term;
  if (session.utm_content) fields["UTM content"] = session.utm_content;
  return fields;
}

/** @param {{ entry_path?: string; entry_url?: string; page_type?: string; page_name?: string; referrer?: string }} session */
export function buildLandingTelegramFields(session = {}) {
  /** @type {Record<string, string>} */
  const fields = {};
  if (session.page_type) fields["Page type"] = session.page_type;
  if (session.page_name) fields.Page = session.page_name;
  if (session.entry_url) {
    fields.URL = String(session.entry_url).slice(0, 240);
  } else if (session.entry_path) {
    fields.Path = session.entry_path;
  }
  if (session.referrer) fields.Referrer = String(session.referrer).slice(0, 200);
  return { ...fields, ...buildUtmTelegramFields(session) };
}
