/** Shared step ids for Kalshi historical guided workflows (UI constraints). */
export const KALSHI_GUIDED_WEATHER_WORKFLOW_ID = "top-10-weather-markets-since-2021";

export const KALSHI_GUIDED_STEP_IDS = {
  wherePickCategory: "where-pick-category",
  runQuery: "run-query",
  dataSheetLoaded: "data-sheet-loaded",
  openExportPanel: "open-export-panel",
  exportCsv: "export-csv",
  workflowComplete: "workflow-complete",
} as const;

export const KALSHI_GUIDED_WHERE_CATEGORY_COLUMN = "kalshi_taxonomy_category";
