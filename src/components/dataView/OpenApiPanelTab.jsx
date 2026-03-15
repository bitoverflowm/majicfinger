"use client";

import { useState, useEffect, useRef } from "react";
import { PanelRightOpen } from "lucide-react";
import Ripple from "@/components/magicui/ripple";

const ENTRANCE_MS = 280;
const EXIT_MS = 150;
const RIPPLE_VISIBLE_MS = 600;

export default function OpenApiPanelTab({ onOpen }) {
  const [entered, setEntered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const exitTimeoutRef = useRef(null);
  const rippleTimeoutRef = useRef(null);

  // Slide-in + red→white: start off-screen with lychee_red, then animate in
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setEntered(true))
    );
    return () => cancelAnimationFrame(id);
  }, []);

  // Show Ripple momentarily when button has entered, then hide it
  useEffect(() => {
    if (entered && !isExiting) {
      setShowRipple(true);
      rippleTimeoutRef.current = setTimeout(() => {
        setShowRipple(false);
        rippleTimeoutRef.current = null;
      }, RIPPLE_VISIBLE_MS);
    } else {
      setShowRipple(false);
    }
    return () => {
      if (rippleTimeoutRef.current) clearTimeout(rippleTimeoutRef.current);
    };
  }, [entered, isExiting]);

  // On click: slide out fast, then open panel
  const handleClick = () => {
    setIsExiting(true);
    exitTimeoutRef.current = setTimeout(() => {
      onOpen?.();
      exitTimeoutRef.current = null;
    }, EXIT_MS);
  };

  useEffect(
    () => () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    },
    []
  );

  return (
    <div
      className={`
        fixed right-0 top-20 z-40 transition ease-out md:top-[4.5rem]
        ${isExiting ? "duration-150" : "duration-300"}
        ${entered && !isExiting ? "translate-x-0" : "translate-x-full"}
      `}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label="Open API panel"
        className={`
          relative flex h-9 w-7 items-center justify-center overflow-visible rounded-l-md border border-r-0 border-border shadow-sm
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
          ${entered && !isExiting ? "bg-background hover:bg-muted/80" : "bg-lychee_red"}
        `}
      >
        {/* Lychee-red Ripple pulse when button appears, shown momentarily then hidden */}
        {showRipple && (
          <Ripple
            mainCircleSize={12}
            mainCircleOpacity={0.35}
            numCircles={4}
            circleSizeStep={14}
            className="[mask-image:none]"
            circleClassName="!border-lychee_red !bg-lychee_red/25"
          />
        )}
        <PanelRightOpen
          className={`relative z-10 h-4 w-4 ${entered && !isExiting ? "text-muted-foreground" : "text-white"}`}
        />
      </button>
    </div>
  );
}
