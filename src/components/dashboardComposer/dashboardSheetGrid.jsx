"use client";

import dynamic from "next/dynamic";
import "@glideapps/glide-data-grid/dist/index.css";
import { retryImport } from "@/lib/retryImport";

const DashboardSheetGridInner = dynamic(() => retryImport(() => import("./dashboardSheetGridInner")), {
  ssr: false,
});

/** Editable blank sheet for the new dashboard. Legacy AG Grid is unchanged. */
export function DashboardSheetGrid({ block, onChange, readOnly = false }) {
  return <DashboardSheetGridInner block={block} onChange={onChange} readOnly={readOnly} />;
}
