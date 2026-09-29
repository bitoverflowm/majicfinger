"use client";

import dynamic from "next/dynamic";

const DashboardSheetGridInner = dynamic(() => import("./dashboardSheetGridInner"), {
  ssr: false,
});

/** Editable blank sheet for the new dashboard. Legacy AG Grid is unchanged. */
export function DashboardSheetGrid({ block, onChange }) {
  return <DashboardSheetGridInner block={block} onChange={onChange} />;
}
