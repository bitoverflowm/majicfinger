import assert from "node:assert/strict";
import test from "node:test";

import {
  isPolymarketWalletAddress,
  parsePolymarketProfileAddresses,
  projectPolymarketPublicProfile,
} from "./publicProfilesCompose.js";

test("profile addresses parse from commas, spaces, and lines without duplicates", () => {
  const first = "0x1111111111111111111111111111111111111111";
  const second = "0x2222222222222222222222222222222222222222";
  assert.deepEqual(
    parsePolymarketProfileAddresses(`${first},\n${second} ${first.toUpperCase()}`),
    [first, second],
  );
});

test("wallet address validation requires a 20-byte hex address", () => {
  assert.equal(isPolymarketWalletAddress("0x1111111111111111111111111111111111111111"), true);
  assert.equal(isPolymarketWalletAddress("0x123"), false);
  assert.equal(isPolymarketWalletAddress("not-a-wallet"), false);
});

test("public profile projection respects selected columns and serializes users", () => {
  assert.deepEqual(
    projectPolymarketPublicProfile(
      {
        name: "Trader",
        users: [{ id: "1", creator: true, mod: false }],
        verifiedBadge: false,
      },
      ["name", "users", "verifiedBadge"],
    ),
    {
      name: "Trader",
      users: '[{"id":"1","creator":true,"mod":false}]',
      verifiedBadge: false,
    },
  );
});
