import {
  applyRefineQueryToRows,
  buildRefineFilterPredicate,
  buildRefineFiltersFromClauses,
  buildRefineOuterWhereSql,
  inferRefineColumnKind,
  parseRefineFilterInput,
  rowMatchesRefinePredicate,
  summarizeRefineFilters,
} from "./refineQuery";

describe("refineQuery", () => {
  const rows = [
    { active: true, name: "alpha", price: 10 },
    { active: false, name: "beta", price: 20 },
    { active: "true", name: "gamma", price: 5 },
  ];

  test("infers boolean column kind from dataTypes", () => {
    expect(inferRefineColumnKind("active", { active: "boolean" }, rows)).toBe("boolean");
    expect(inferRefineColumnKind("price", { price: "number" }, rows)).toBe("number");
    expect(inferRefineColumnKind("name", { name: "text" }, rows)).toBe("string");
  });

  test("filters boolean values in preview", () => {
    const predicate = buildRefineFilterPredicate({
      column: "active",
      op: "eq",
      kind: "boolean",
      rawValue: "true",
    });
    const out = applyRefineQueryToRows(rows, {
      selectColumns: ["name", "active"],
      filters: { and: [predicate] },
    });
    expect(out.map((r) => r.name)).toEqual(["alpha", "gamma"]);
  });

  test("filters string equality in preview", () => {
    const predicate = buildRefineFilterPredicate({
      column: "name",
      op: "eq",
      kind: "string",
      rawValue: "beta",
    });
    expect(rowMatchesRefinePredicate(rows[1], predicate)).toBe(true);
    expect(rowMatchesRefinePredicate(rows[0], predicate)).toBe(false);
  });

  test("builds Athena WHERE for string and boolean", () => {
    const sql = buildRefineOuterWhereSql("root_cte", {
      and: [
        { column: "active", op: "eq", kind: "boolean", value: true },
        { column: "name", op: "eq", kind: "string", value: "beta" },
      ],
    });
    expect(sql).toContain('WHERE');
    expect(sql).toContain('root_cte."active"');
    expect(sql).toContain("= 'true'");
    expect(sql).toContain('root_cte."name"');
    expect(sql).toContain("beta");
  });

  test("parseRefineFilterInput rejects empty values", () => {
    expect(parseRefineFilterInput("", "string")).toBeNull();
    expect(parseRefineFilterInput("12", "number")).toBe(12);
  });

  test("combines multiple AND clauses", () => {
    const filters = buildRefineFiltersFromClauses(
      [
        { column: "active", op: "eq", kind: "boolean", value: "true" },
        { column: "price", op: "gte", kind: "number", value: "10" },
      ],
      {},
      rows,
    );
    const out = applyRefineQueryToRows(rows, {
      selectColumns: ["name", "active", "price"],
      filters,
    });
    expect(out).toEqual([{ name: "alpha", active: true, price: 10 }]);
    expect(summarizeRefineFilters(filters).text).toContain("AND");
  });
});
