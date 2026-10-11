import assert from "node:assert/strict";

import {
  mergeTraderByAddress,
  traderAddressesFromPicks,
  TRADER_BY_ADDRESS_COLUMNS,
} from "./traderByAddressCompose.js";

const ADDRESS = "0x0000000000000000000000000000000000000001";
const OTHER = "0x0000000000000000000000000000000000000002";

const profile = {
  createdAt: "2024-01-02T03:04:05Z",
  proxyWallet: ADDRESS,
  profileImage: "https://example.com/a.png",
  displayUsernamePublic: true,
  bio: "trades",
  pseudonym: "Aqua",
  name: "Ada",
  users: [
    { id: "u1", creator: true, mod: false },
    { id: "u2", creator: false, mod: true },
  ],
  xUsername: "ada",
  verifiedBadge: false,
};

const stats = {
  biggest_win: 0,
  proxy_wallet: ADDRESS,
  trades: 3,
  views: 10,
  join_date: 1700000000,
  all_time_pnl: {
    realized_combo_pnl: 1,
    realized_lp_pnl: 2,
    realized_market_pnl: 3,
    realized_pnl: 6,
    source_block: 18000000,
    timestamp: 1710000000,
    trade_count: 4,
    volume: 9,
    volume_usdc: 12.5,
    cashflow_net: null,
    deposits: 8,
    economic_pnl: null,
    fees: -1,
    fees_paid: null,
    fees_refunded: 0,
    maker_rebate: null,
    position_pnl: null,
    referral_income: null,
    reward_income: null,
    settled_pnl: null,
    sponsored_income: null,
    taker_rebate: null,
    trade_pnl: null,
    unrealized_pnl: null,
    wallet_income: null,
    withdrawals: null,
    yield_income: null,
  },
};

const row = mergeTraderByAddress(ADDRESS, profile, stats, { proxy_wallet: ADDRESS, value: 12.3456 });
assert.equal(row.address, ADDRESS);
assert.equal(row.name, "Ada");
assert.equal(row.pseudonym, "Aqua");
assert.equal(row.createdAt, "2024-01-02T03:04:05Z");
assert.equal(row.proxyWallet, ADDRESS);
assert.equal(row.proxy_wallet, ADDRESS);
assert.equal(row.displayUsernamePublic, true);
assert.equal(row.verifiedBadge, false);
assert.equal(row.users_id, "u1, u2");
assert.equal(row.users_creator, true);
assert.equal(row.users_mod, true);
assert.equal(JSON.parse(row.users)[0].id, "u1");
assert.equal(row.biggest_win, 0);
assert.equal(row.trades, 3);
assert.equal(row.views, 10);
assert.equal(row.join_date, 1700000000);
assert.equal(row.realized_pnl, 6);
assert.equal(row.volume_usdc, 12.5);
assert.equal(row.source_block, 18000000);
assert.equal(row.timestamp, 1710000000);
assert.equal(row.fees_refunded, 0);
assert.equal(row.economic_pnl, "");
assert.equal(row.cashflow_net, "");
assert.equal(row.portfolio_value, 12.3456);

const unknown = mergeTraderByAddress(ADDRESS, profile, null);
assert.equal(unknown.name, "Ada");
assert.equal(unknown.biggest_win, "");
assert.equal(unknown.trades, "");
assert.equal(unknown.realized_pnl, "");
assert.equal(unknown.join_date, "");
assert.equal(unknown.portfolio_value, "");

const emptyBook = mergeTraderByAddress(ADDRESS, null, null, { proxy_wallet: ADDRESS, value: 0 });
assert.equal(emptyBook.portfolio_value, 0);
assert.equal(emptyBook.name, "");

const noProfile = mergeTraderByAddress(OTHER, null, { ...stats, all_time_pnl: null, biggest_win: 0, trades: 0, views: 0, join_date: null });
assert.equal(noProfile.address, OTHER);
assert.equal(noProfile.name, "");
assert.equal(noProfile.users, "");
assert.equal(noProfile.users_creator, "");
assert.equal(noProfile.biggest_win, 0);
assert.equal(noProfile.trades, 0);
assert.equal(noProfile.views, 0);
assert.equal(noProfile.join_date, "");
assert.equal(noProfile.realized_pnl, "");

const mixed = "0x000000000000000000000000000000000000000a";
const addresses = traderAddressesFromPicks([
  { address: mixed },
  { address: mixed.toUpperCase() },
  { address: "not-a-wallet" },
  { address: OTHER },
]);
assert.deepEqual(addresses, [mixed, OTHER]);

const names = TRADER_BY_ADDRESS_COLUMNS.map((column) => column.name);
assert.ok(names.includes("createdAt"));
assert.ok(names.includes("users_mod"));
assert.ok(names.includes("yield_income"));
assert.ok(names.includes("portfolio_value"));
assert.equal(TRADER_BY_ADDRESS_COLUMNS.find((column) => column.name === "portfolio_value")?.title, "Portfolio value");
assert.equal(names.filter((name, index) => names.indexOf(name) !== index).length, 0);
assert.equal(TRADER_BY_ADDRESS_COLUMNS.find((column) => column.name === "createdAt")?.dateEpoch, "iso");
assert.equal(TRADER_BY_ADDRESS_COLUMNS.find((column) => column.name === "join_date")?.dateEpoch, "unix");
assert.equal(TRADER_BY_ADDRESS_COLUMNS.find((column) => column.name === "timestamp")?.dateEpoch, "unix");
