import { layoutRunSheets } from "@/components/dashboardComposer/integrationRunSheets";

/** What a trade history sheet shows while its pull is still paging in. */
export function fillingFor(meta, count) {
  return { from: meta?.openMs || 0, label: `Reading history · ${count.toLocaleString()} ${count === 1 ? "trade" : "trades"}` };
}

/**
 * Puts a trade history sheet on the canvas with its first page, then fills it in place as more
 * pages arrive, so the table grows and its chart flows in while the pull runs.
 * `build(partial)` turns the rows so far into the stamped sheet, with `filling` set.
 * Call `finish()` before putting the final sheet, so no late page lands on top of it.
 */
export function streamTradeSheet({ canvas, stage, build }) {
  let placed = null;
  let placedId = "";
  let ready = false;
  let done = false;
  let latest = null;

  const apply = () => {
    if (done || !latest) return;
    const sheet = latest;
    latest = null;
    const [block] = layoutRunSheets([sheet]);
    canvas?.updateBlock?.(sheet.id, {
      records: block.records,
      cells: block.cells,
      rowCount: block.rowCount,
      filling: sheet.filling,
      ...(block.dataset ? { dataset: block.dataset } : {}),
    });
  };

  return {
    onRows(partial) {
      if (done || !partial?.rows?.length) return;
      const sheet = build(partial);
      if (!sheet) return;
      if (!placed) {
        placedId = sheet.id;
        placed = stage.put(sheet).then(() => {
          ready = true;
          apply();
        });
        return;
      }
      latest = sheet;
      if (ready) apply();
    },
    async finish() {
      done = true;
      latest = null;
      await placed;
    },
    /** The pull failed: what came in stays on the canvas as a plain sheet. */
    async stop() {
      await this.finish();
      if (placedId) canvas?.updateBlock?.(placedId, { filling: undefined });
    },
  };
}
