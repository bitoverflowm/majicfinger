"use client";

import dynamic from "next/dynamic";

const IntegrationBuildGridInner = dynamic(() => import("./integrationBuildGridInner"), { ssr: false });

export function IntegrationBuildGrid({ columns, rows, highlightColumnId = "", scrollToken = 0 }) {
  return <IntegrationBuildGridInner columns={columns} rows={rows} highlightColumnId={highlightColumnId} scrollToken={scrollToken} />;
}
