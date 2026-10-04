import assert from "node:assert/strict";

import { cellMatchesTextTerm, columnUsesWholeTerm, textTermMatches } from "./textTermMatch.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("yes subtitle tags match whole words, not letters inside another word", () => {
  assert.equal(cellMatchesTextTerm("yes_sub_title", "FC Barcelona", "Elon"), false);
  assert.equal(cellMatchesTextTerm("yes_sub_title", "FC Barcelona", "trump"), false);
  assert.equal(cellMatchesTextTerm("yes_sub_title", "Barcelona wins", "elon"), false);
  assert.equal(textTermMatches("felony", "elon"), false);
  assert.equal(cellMatchesTextTerm("yes_sub_title", "Elon Musk", "Elon"), true);
  assert.equal(cellMatchesTextTerm("yes_sub_title", "Will Trump win?", "trump"), true);
  assert.equal(cellMatchesTextTerm("yes_sub_title", "FC Barcelona", "Barcelona"), true);
  assert.equal(cellMatchesTextTerm("yes_sub_title", "Elon's company", "Elon"), true);
});

test("ticker filters still match a code fragment", () => {
  assert.equal(columnUsesWholeTerm("yes_sub_title"), true);
  assert.equal(columnUsesWholeTerm("event_ticker"), false);
  assert.equal(columnUsesWholeTerm("ticker"), false);
  assert.equal(cellMatchesTextTerm("ticker", "KXHIGHNY-25JAN01-T77", "HIGH"), true);
  assert.equal(cellMatchesTextTerm("event_ticker", "KXELON", "elon"), true);
});
