import { describe, expect, it } from "vitest";
import {
  embedSlugStatusMessage,
  isValidChartEmbedSlug,
  normalizeChartEmbedSlug,
} from "./chartEmbedSlug";

describe("embed slug availability helpers", () => {
  it("normalizes and validates slugs used by the check API", () => {
    expect(normalizeChartEmbedSlug("Chart 2")).toBe("chart-2");
    expect(isValidChartEmbedSlug("chart-2")).toBe(true);
    expect(isValidChartEmbedSlug("Chart 2")).toBe(false);
  });

  it("returns clear taken messages by kind", () => {
    expect(embedSlugStatusMessage("taken", "chart")).toMatch(/chart/i);
    expect(embedSlugStatusMessage("taken", "dashboard")).toMatch(/dashboard/i);
  });
});
