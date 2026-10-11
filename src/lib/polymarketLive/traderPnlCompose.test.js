import assert from "node:assert/strict";

import {
  defaultPolymarketPnlFilters,
  pnlSheetRows,
  polymarketPnlAttributeColumns,
  polymarketPnlQuery,
  polymarketPnlRequestKey,
  TRADER_PNL_FIDELITIES,
  TRADER_PNL_INTERVALS,
} from "./traderPnlCompose.js";

const USER = "0x39125313116835eb6a55688350813921c9360246";

assert.deepEqual(polymarketPnlQuery(null), { interval: "1d", fidelity: "1h" });
assert.deepEqual(polymarketPnlQuery({ interval: { value: "nope" }, fidelity: { value: "2h" } }), {
  interval: "1d",
  fidelity: "1h",
});
assert.deepEqual(polymarketPnlQuery(defaultPolymarketPnlFilters()), { interval: "1d", fidelity: "1h" });
assert.equal(polymarketPnlQuery({ interval: { value: "max" }, fidelity: { value: "1d" } }).interval, "max");
assert.equal(polymarketPnlRequestKey({ interval: { value: "1w" }, fidelity: { value: "3h" } }), "1w|3h");

const rows = pnlSheetRows(
  [
    {
      data: {
        proxy_wallet: USER,
        interval: "1d",
        fidelity: "1h",
        source_fidelity: "1d",
        points: [
          {
            timestamp: 1791730800,
            source_block: 95342594,
            trade_count: 177,
            realized_pnl: -44492.598966,
            unrealized_pnl: 0,
            volume_usdc: 114933.374436,
            realized_lp_pnl: 0,
            deposits: null,
            withdrawals: null,
            cashflow_net: null,
            fees: -0.638888,
          },
        ],
      },
    },
  ],
  USER,
);
assert.equal(rows.length, 1);
assert.equal(rows[0].user, USER);
assert.equal(rows[0].proxy_wallet, USER);
assert.equal(rows[0].interval, "1d");
assert.equal(rows[0].fidelity, "1h");
assert.equal(rows[0].source_fidelity, "1d");
assert.equal(rows[0].timestamp, 1791730800);
assert.equal(rows[0].source_block, 95342594);
assert.equal(rows[0].trade_count, 177);
assert.equal(rows[0].realized_pnl, -44492.598966);
assert.equal(rows[0].unrealized_pnl, 0);
assert.equal(rows[0].realized_lp_pnl, 0);
assert.equal(rows[0].deposits, "");
assert.equal(rows[0].withdrawals, "");
assert.equal(rows[0].cashflow_net, "");
assert.equal(rows[0].fees, -0.638888);
assert.equal(pnlSheetRows({ data: { points: [] } }, USER).length, 0);

const attributes = polymarketPnlAttributeColumns([
  { id: "interval", title: "Interval" },
  { id: "timestamp", title: "Timestamp" },
]);
assert.equal(attributes[0].control, "period");
assert.equal(attributes[1].control, "period");
assert.deepEqual(attributes[0].enumOptions, TRADER_PNL_INTERVALS);
assert.deepEqual(attributes[1].enumOptions, TRADER_PNL_FIDELITIES);
assert.equal(attributes.filter((column) => column.id === "interval").length, 1);
assert.equal(attributes.at(-1).id, "timestamp");
