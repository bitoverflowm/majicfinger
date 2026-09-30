"use client";

import dynamic from "next/dynamic";

const IntegrationBuildGridInner = dynamic(() => import("./integrationBuildGridInner"), { ssr: false });

export function IntegrationBuildGrid({ columns, rows }) {
  return <IntegrationBuildGridInner columns={columns} rows={rows} />;
}
