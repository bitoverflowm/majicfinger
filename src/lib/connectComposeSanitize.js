/**
 * Drop compose operation panels that were opened but never configured (before Run pull).
 */

/**
 * @param {object} params
 * @param {string[]} [params.connectActiveComposeOps]
 * @param {object[]} [params.columnComposeItems]
 * @param {object[]} [params.composeWhereFilters]
 * @param {object[]} [params.columnComposeOrderBy]
 * @param {object[]} [params.composeHavingFilters]
 * @param {object[]} [params.composeJoins]
 */
export function pruneConnectComposeBeforePull({
  connectActiveComposeOps = [],
  columnComposeItems = [],
  composeWhereFilters = [],
  columnComposeOrderBy = [],
  composeHavingFilters = [],
  composeJoins = [],
}) {
  const items = columnComposeItems || [];
  const ops = new Set(Array.isArray(connectActiveComposeOps) ? connectActiveComposeOps : []);
  const removedOps = [];

  const removeOp = (id) => {
    if (ops.delete(id)) removedOps.push(id);
  };

  if (!items.some((i) => i.aggregate != null)) {
    removeOp("summarize");
  }
  if (!items.some((i) => i.sumCase?.enabled)) {
    removeOp("if_else");
  }
  if (!(composeWhereFilters || []).length) {
    removeOp("where");
  }
  if (!(columnComposeOrderBy || []).length) {
    removeOp("sort");
  }
  if (!(composeHavingFilters || []).length) {
    removeOp("having");
  }

  const joins = (composeJoins || []).filter(
    (j) =>
      j &&
      ((j.targetKind === "table" && j.targetTable && j.leftColumn && j.rightColumn) ||
        (j.targetKind === "sheet" && j.targetSheetId && j.leftColumn && j.rightColumn)),
  );
  if (!joins.length) {
    removeOp("join");
  }

  return {
    activeOps: [...ops],
    whereFilters: composeWhereFilters || [],
    orderBy: columnComposeOrderBy || [],
    havingFilters: composeHavingFilters || [],
    joins,
    removedOps,
    changed: removedOps.length > 0,
  };
}
