"use client";

import { useEffect, useState } from "react";
import { BLACK_FRIDAY, blackFridayActive } from "@/lib/promo/blackFriday";

/** Id of the offer card on the pricing section; links to it open the annual plans. */
export const BLACK_FRIDAY_ANCHOR = "black-friday";
/** Fired when the buyer asks to see the offer from a page that's already showing pricing. */
export const SEE_BLACK_FRIDAY_EVENT = "lychee:see-black-friday";

/** Flips to false on its own when the offer ends, without a reload. */
export function useBlackFridayActive() {
  const [active, setActive] = useState(() => blackFridayActive());
  useEffect(() => {
    setActive(blackFridayActive());
    const id = window.setInterval(() => setActive(blackFridayActive()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return active;
}

export type Countdown = { days: number; hours: number; minutes: number; seconds: number };

function remaining(now: number): Countdown | null {
  const left = Math.max(0, Math.floor((BLACK_FRIDAY.endsAt - now) / 1000));
  if (!left) return null;
  return {
    days: Math.floor(left / 86_400),
    hours: Math.floor((left % 86_400) / 3_600),
    minutes: Math.floor((left % 3_600) / 60),
    seconds: left % 60,
  };
}

/** Null until mounted (the clock is client-only), and again once the offer ends. */
export function useBlackFridayCountdown() {
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  useEffect(() => {
    const tick = () => setCountdown(remaining(Date.now()));
    tick();
    const id = window.setInterval(tick, 1_000);
    return () => window.clearInterval(id);
  }, []);
  return countdown;
}
