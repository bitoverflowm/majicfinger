"use client";

import dynamic from "next/dynamic";

const IntegrationBuildGridInner = dynamic(() => import("./integrationBuildGridInner"), { ssr: false });

export function IntegrationBuildGrid({
  columns,
  rows,
  highlightColumnId = "",
  highlightColumnIds = [],
  scrollToken = 0,
  referencedColumnIds = [],
  referencedCells = [],
  formulaEditor = null,
  onFormulaPick,
}) {
  return (
    <IntegrationBuildGridInner
      columns={columns}
      rows={rows}
      highlightColumnId={highlightColumnId}
      highlightColumnIds={highlightColumnIds}
      scrollToken={scrollToken}
      referencedColumnIds={referencedColumnIds}
      referencedCells={referencedCells}
      formulaEditor={formulaEditor}
      onFormulaPick={onFormulaPick}
    />
  );
}
