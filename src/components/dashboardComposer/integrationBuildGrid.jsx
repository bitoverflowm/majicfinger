"use client";

import dynamic from "next/dynamic";

const IntegrationBuildGridInner = dynamic(() => import("./integrationBuildGridInner"), { ssr: false });

export function IntegrationBuildGrid({
  columns,
  rows,
  highlightColumnId = "",
  highlightColumnIds = [],
  flashColumnIds = [],
  activeCell = null,
  scrollToken = 0,
  scrollSmooth = false,
  scrollAlign = "end",
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
      flashColumnIds={flashColumnIds}
      activeCell={activeCell}
      scrollToken={scrollToken}
      scrollSmooth={scrollSmooth}
      scrollAlign={scrollAlign}
      referencedColumnIds={referencedColumnIds}
      referencedCells={referencedCells}
      formulaEditor={formulaEditor}
      onFormulaPick={onFormulaPick}
    />
  );
}
