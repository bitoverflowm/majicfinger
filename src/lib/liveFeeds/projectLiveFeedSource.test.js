import { describe, expect, it } from "vitest";
import { sanitizeProjectLiveFeedSource } from "./sanitizeProjectLiveFeedSource.js";

describe("sanitizeProjectLiveFeedSource", () => {
  it("requires integration, endpoint, and tickers", () => {
    expect(sanitizeProjectLiveFeedSource(null)).toBeNull();
    expect(sanitizeProjectLiveFeedSource({ integration: "kalshi-live" })).toBeNull();
  });

  it("normalizes a valid source", () => {
    const src = sanitizeProjectLiveFeedSource({
      integration: "kalshi-live",
      endpoint: "event_candlesticks",
      eventTicker: "kxsenatemid-26",
      seriesTicker: "kxsenatemid",
      periodInterval: 1,
      pollIntervalMs: 300_000,
      marketCount: 9,
    });
    expect(src).toMatchObject({
      enabled: true,
      integration: "kalshi-live",
      endpoint: "event_candlesticks",
      eventTicker: "KXSENATEMID-26",
      seriesTicker: "KXSENATEMID",
      periodInterval: 1,
      pollIntervalMs: 300_000,
      marketCount: 9,
    });
  });
});
