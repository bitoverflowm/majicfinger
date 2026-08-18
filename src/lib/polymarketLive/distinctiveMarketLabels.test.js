import assert from "node:assert/strict";

import { distinctiveMarketLabels } from "./distinctiveMarketLabels.js";

{
  const labels = distinctiveMarketLabels([
    "Will Gavin Newsom win the 2028 Democratic presidential nomination?",
    "Will Alexandria Ocasio-Cortez win the 2028 Democratic presidential nomination?",
  ]);
  assert.deepEqual(labels, ["Gavin Newsom", "Alexandria Ocasio-Cortez"]);
  console.log("ok nomination markets keep candidate names");
}

{
  const labels = distinctiveMarketLabels([
    "Will Anthropic IPO by September 30, 2026?",
    "Will Anthropic IPO by September 15, 2026?",
  ]);
  assert.deepEqual(labels, ["September 30", "September 15"]);
  console.log("ok date markets keep the distinctive date fragment");
}

{
  assert.deepEqual(distinctiveMarketLabels(["Will it rain?"]), ["Will it rain?"]);
  assert.deepEqual(
    distinctiveMarketLabels(["Same title?", "Same title?"]),
    ["Same title?", "Same title?"],
  );
  console.log("ok single and identical titles stay intact");
}
