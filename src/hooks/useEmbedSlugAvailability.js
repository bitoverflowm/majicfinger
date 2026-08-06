"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  embedSlugStatusMessage,
  isValidChartEmbedSlug,
  normalizeChartEmbedSlug,
} from "@/lib/chartEmbedSlug";

export { embedSlugStatusMessage };

/**
 * @param {{
 *   kind: "chart" | "dashboard",
 *   slug: string,
 *   excludeId?: string | null,
 * }} opts
 * @returns {Promise<{ available: boolean, reason: string, slug: string }>}
 */
export async function checkEmbedSlugAvailability({ kind, slug, excludeId = null }) {
  const normalized = normalizeChartEmbedSlug(slug || "");
  if (!normalized) {
    return { available: false, reason: "empty", slug: "" };
  }
  if (!isValidChartEmbedSlug(normalized)) {
    return { available: false, reason: "invalid", slug: normalized };
  }

  const params = new URLSearchParams({
    kind,
    slug: normalized,
  });
  if (excludeId) params.set("excludeId", String(excludeId));

  const res = await fetch(`/api/embeds/check-slug?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success) {
    return { available: false, reason: "error", slug: normalized };
  }
  if (json.available) {
    return { available: true, reason: "ok", slug: normalized };
  }
  return {
    available: false,
    reason: json.reason === "invalid" ? "invalid" : "taken",
    slug: normalized,
  };
}

/**
 * Debounced availability check for chart/dashboard public slugs (per signed-in user).
 *
 * @param {{
 *   kind: "chart" | "dashboard",
 *   slugInput: string,
 *   excludeId?: string | null,
 *   enabled?: boolean,
 * }} opts
 */
export function useEmbedSlugAvailability({
  kind,
  slugInput,
  excludeId = null,
  enabled = true,
}) {
  const [status, setStatus] = useState("idle");
  const requestSeq = useRef(0);

  const normalized = normalizeChartEmbedSlug(slugInput || "");

  const checkNow = useCallback(async () => {
    if (!enabled) {
      setStatus("idle");
      return { available: false, reason: "disabled", slug: normalized };
    }
    if (!normalized) {
      setStatus("empty");
      return { available: false, reason: "empty", slug: "" };
    }
    if (!isValidChartEmbedSlug(normalized)) {
      setStatus("invalid");
      return { available: false, reason: "invalid", slug: normalized };
    }

    const seq = ++requestSeq.current;
    setStatus("checking");
    const result = await checkEmbedSlugAvailability({
      kind,
      slug: normalized,
      excludeId,
    });
    if (seq !== requestSeq.current) {
      return { available: false, reason: "stale", slug: normalized };
    }
    if (result.reason === "error") {
      setStatus("error");
    } else if (result.available) {
      setStatus("available");
    } else if (result.reason === "invalid") {
      setStatus("invalid");
    } else if (result.reason === "empty") {
      setStatus("empty");
    } else {
      setStatus("taken");
    }
    return result;
  }, [enabled, excludeId, kind, normalized]);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return undefined;
    }
    if (!normalized) {
      setStatus("empty");
      return undefined;
    }
    if (!isValidChartEmbedSlug(normalized)) {
      setStatus("invalid");
      return undefined;
    }
    setStatus("checking");
    const timer = setTimeout(() => {
      void checkNow();
    }, 400);
    return () => clearTimeout(timer);
  }, [enabled, normalized, excludeId, kind, checkNow]);

  return {
    status,
    normalizedSlug: normalized,
    isTaken: status === "taken",
    isChecking: status === "checking",
    isAvailable: status === "available",
    canPublish: status === "available",
    checkNow,
  };
}
