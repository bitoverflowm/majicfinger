/** @returns {{ version: 1, rows: object[] }} */
export function createEmptyDashboardLayout() {
  return {
    version: 1,
    rows: [
      {
        id: `row-${Date.now()}`,
        type: "cards",
        columns: [
          {
            id: `col-${Date.now()}-a`,
            chart_id: null,
            colSpan: 12,
            rowSpan: 1,
            h2: "",
            caption: "",
            microtext: "",
            link: { mode: "none", url: "" },
          },
        ],
      },
    ],
  };
}
