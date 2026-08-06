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

  it("normalizes market candlesticks source", () => {
    const src = sanitizeProjectLiveFeedSource({
      integration: "kalshi-live",
      endpoint: "candlesticks",
      marketTickers: ["abc-1", "def-2"],
      periodInterval: 60,
      pollIntervalMs: 3_600_000,
    });
    expect(src).toMatchObject({
      enabled: true,
      endpoint: "candlesticks",
      marketTickers: ["ABC-1", "DEF-2"],
      periodInterval: 60,
      pollIntervalMs: 3_600_000,
      marketCount: 2,
    });
  });
});
