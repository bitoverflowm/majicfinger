import assert from "node:assert/strict";
import {
  buildSavePatch,
  createSaveBaseline,
  rememberLoadedTabs,
  rememberMeta,
  rememberServerTabs,
  rememberTables,
} from "./dashboardSaveDiff.js";

const meta = { name: "v3", active_tab_id: "a", welcome_removed: true, tabs: [{ id: "a", name: "A" }, { id: "b", name: "B" }] };
const listA = [{ id: "s1", type: "sheet", title: "One" }];
const listB = [{ id: "s2", type: "sheet", title: "Two" }];
const tables = [{ id: "s1", title: "One", rows: [] }, { id: "s2", title: "Two", rows: [] }];

function fresh() {
  const base = createSaveBaseline();
  rememberMeta(base, meta);
  rememberLoadedTabs(base, { "welcome:a": listA, "welcome:b": listB });
  rememberServerTabs(base, ["c-orphan"]);
  rememberTables(base, tables);
  return base;
}

function stateWith(base, overrides = {}) {
  const blocksByPage = overrides.blocksByPage || { "welcome:a": listA, "welcome:b": listB };
  return buildSavePatch(base, {
    meta,
    tabIds: ["a", "b"],
    blocksByPage,
    savedBlocks: blocksByPage,
    tables,
    savedTableList: tables,
    ...overrides,
  });
}

{
  const base = fresh();
  assert.equal(stateWith(base).patch, null, "nothing changed, nothing sent");
}

{
  const base = fresh();
  const moved = [{ ...listA[0], x: 40 }];
  const result = stateWith(base, { blocksByPage: { "welcome:a": moved, "welcome:b": listB } });
  assert.deepEqual(Object.keys(result.patch), ["blocks"]);
  assert.deepEqual(Object.keys(result.patch.blocks), ["a"], "only the edited tab travels");
  result.commit();
  assert.equal(stateWith(base, { blocksByPage: { "welcome:a": moved, "welcome:b": listB } }).patch, null);
}

{
  const base = fresh();
  const result = stateWith(base, { blocksByPage: { "welcome:a": [{ ...listA[0], x: 40 }], "welcome:b": listB } });
  assert.ok(result.patch.blocks.a);
  const again = stateWith(base, { blocksByPage: { "welcome:a": [{ ...listA[0], x: 40 }], "welcome:b": listB } });
  assert.ok(again.patch.blocks.a, "a failed save keeps the tab dirty");
}

{
  const base = fresh();
  const sameContent = [{ ...listA[0] }];
  assert.equal(stateWith(base, { blocksByPage: { "welcome:a": sameContent, "welcome:b": listB } }).patch, null, "a new array with the same blocks is not a change");
}

{
  const base = fresh();
  const result = stateWith(base, {
    meta: { ...meta, tabs: [meta.tabs[0]] },
    tabIds: ["a"],
    removedTabs: ["b", "c-orphan", "never-saved"],
  });
  assert.deepEqual(result.patch.remove_tabs.sort(), ["b", "c-orphan"], "deleted and orphan tabs are removed on the server");
  assert.ok(result.patch.meta);
  assert.deepEqual(result.removedTabs.sort(), ["b", "c-orphan", "never-saved"]);
  result.commit();
  assert.equal(base.serverTabs.has("b"), false);
  assert.equal(base.serverTabs.has("c-orphan"), false);
}

{
  const base = fresh();
  const result = stateWith(base, { blocksByPage: { "welcome:a": [], "welcome:b": listB } });
  assert.deepEqual(result.patch.remove_tabs, ["a"], "a tab emptied of blocks drops its saved blocks");
}

{
  const base = fresh();
  const result = stateWith(base, { pendingTabs: ["b"], blocksByPage: { "welcome:a": listA, "welcome:b": [{ id: "local" }] } });
  assert.equal(result.patch, null, "a tab still loading is never sent");
}

{
  const base = fresh();
  const changed = [{ ...tables[0], title: "Renamed" }, tables[1]];
  const result = stateWith(base, { tables: changed, savedTableList: changed });
  assert.deepEqual(result.patch, { tables: { upsert: [changed[0]] } }, "only the changed table travels");
  const dropped = stateWith(base, { tables: [tables[0]], savedTableList: [tables[0]] });
  assert.deepEqual(dropped.patch.tables, { remove: ["s2"] });
}

{
  const base = fresh();
  const result = stateWith(base, { meta: { ...meta, name: "Renamed" } });
  assert.deepEqual(Object.keys(result.patch), ["meta"], "a rename sends only the settings");
}

{
  const base = createSaveBaseline();
  rememberMeta(base, meta);
  const loaded = [{ id: "s1", type: "sheet", title: "One", records: { rows: [1, 2, 3] } }];
  const trimmed = [{ id: "s1", type: "sheet", title: "One" }];
  rememberLoadedTabs(base, { "welcome:a": loaded, "welcome:b": listB }, { "welcome:a": trimmed });
  rememberTables(base, tables);
  const restored = [{ ...loaded[0], records: { rows: [1, 2, 3, 4] } }];
  const result = stateWith(base, {
    blocksByPage: { "welcome:a": restored, "welcome:b": listB },
    savedBlocks: { "welcome:a": trimmed, "welcome:b": listB },
  });
  assert.equal(result.patch, null, "rows restored from the browser cache are not an edit");
}
