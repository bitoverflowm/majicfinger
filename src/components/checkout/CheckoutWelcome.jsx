"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const CHECKOUT_WELCOME_KEY = "lycheeCheckoutWelcome";

const CONFETTI_COLORS = ["#e11d48", "#fb7185", "#fda4af", "#fbbf24", "#fde68a", "#ffffff"];

export function rememberCheckoutWelcome(tier) {
  try {
    sessionStorage.setItem(
      CHECKOUT_WELCOME_KEY,
      JSON.stringify({ tier: String(tier || "").trim() }),
    );
  } catch {
    // Private mode can block storage. The dashboard still loads.
  }
}

function burstConfetti() {
  const base = { colors: CONFETTI_COLORS, startVelocity: 42, gravity: 0.9, ticks: 220, scalar: 1 };
  confetti({ ...base, particleCount: 110, spread: 78, origin: { y: 0.62 } });
  window.setTimeout(() => {
    confetti({ ...base, particleCount: 48, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
  }, 160);
  window.setTimeout(() => {
    confetti({ ...base, particleCount: 48, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
  }, 260);
}

export default function CheckoutWelcome({ preview = false }) {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState("");

  useEffect(() => {
    if (preview) {
      setTier("Pro");
      setOpen(true);
      burstConfetti();
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      const fromQuery = String(params.get("tier") || "Pro").trim();
      setTier(fromQuery ? fromQuery.charAt(0).toUpperCase() + fromQuery.slice(1) : "Pro");
      setOpen(true);
      burstConfetti();
      return;
    }

    let raw = "";
    try {
      raw = sessionStorage.getItem(CHECKOUT_WELCOME_KEY) || "";
      if (raw) sessionStorage.removeItem(CHECKOUT_WELCOME_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    let parsed = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
    setTier(String(parsed?.tier || "").trim());
    setOpen(true);
    burstConfetti();
  }, [preview]);

  const membership = tier ? `${tier} membership` : "membership";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent overlayClassName="z-[1000]" className="z-[1001]">
        <DialogHeader>
          <DialogTitle>Welcome to Lychee</DialogTitle>
          <DialogDescription className="text-base text-foreground">
            You just activated your {membership}.
          </DialogDescription>
        </DialogHeader>
        {/* Getting-started guides will be added here. */}
        <DialogFooter>
          <Button type="button" onClick={() => setOpen(false)}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
