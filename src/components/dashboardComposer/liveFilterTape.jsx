"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const VISIBLE_CAP = 4;

/**
 * Shows markets leaving a live scan. Each line flashes red, then collapses.
 */
export function LiveFilterTape({ token, items, extra }) {
  const queueRef = useRef([]);
  const seenRef = useRef(0);
  const [visible, setVisible] = useState([]);
  const [more, setMore] = useState(0);

  useEffect(() => {
    if (!token) {
      seenRef.current = 0;
      queueRef.current = [];
      setVisible([]);
      setMore(0);
      return undefined;
    }
    if (token !== seenRef.current) {
      seenRef.current = token;
      const batch = Array.isArray(items) ? items : [];
      queueRef.current.push(
        ...batch.map((item, index) => ({
          ...item,
          key: `${token}-${index}-${item.ticker || index}`,
        })),
      );
      setMore(Number(extra) > 0 ? Number(extra) : 0);
    }
    if (!(Number(extra) > 0)) return undefined;
    const clearMore = window.setTimeout(() => setMore(0), 1800);
    return () => window.clearTimeout(clearMore);
  }, [token, items, extra]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = queueRef.current.shift();
      if (!next) return;
      setVisible((current) => [...current, { ...next, leaving: false }].slice(-VISIBLE_CAP));
      window.setTimeout(() => {
        setVisible((current) => current.map((item) => (item.key === next.key ? { ...item, leaving: true } : item)));
      }, 560);
      window.setTimeout(() => {
        setVisible((current) => current.filter((item) => item.key !== next.key));
      }, 1100);
    }, 180);
    return () => window.clearInterval(timer);
  }, []);

  if (!visible.length && !more) return null;

  return (
    <div className="mb-2 space-y-1" aria-live="polite">
      {visible.map((item) => (
        <div
          key={item.key}
          className={cn(
            "overflow-hidden border-l-2 border-red-500 bg-red-500/10 px-2 text-[12px] leading-5 text-foreground transition-all duration-500",
            item.leaving ? "max-h-0 py-0 opacity-0" : "max-h-8 py-1 opacity-100",
          )}
        >
          <span className="block truncate">
            Removing unmatching ticker {item.ticker}
            {item.label ? ` · ${item.label}` : ""}
            {item.reason ? ` · ${item.reason}` : ""}
          </span>
        </div>
      ))}
      {more > 0 ? (
        <p className="text-[11px] text-muted-foreground">and {more.toLocaleString()} more on this page</p>
      ) : null}
    </div>
  );
}
