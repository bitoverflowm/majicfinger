"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Magic } from "magic-sdk";
import { mutateUser } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  DEV_LOGIN_BYPASS_EMAIL,
  DEV_LOGIN_BYPASS_NAME,
  isDevMagicLinkBypassEmail,
} from "@/lib/devLoginBypass";

const isDev = process.env.NODE_ENV !== "production";

/**
 * @param {{ title?: string; subtitle?: string; onSuccess?: () => void; showUpgradeLink?: boolean; signupSource?: string }} props
 */
export function MagicLinkEmailForm({
  title = "Generate your first interactive analysis.",
  subtitle = "Enter your email to receive a magic link — no password needed.",
  onSuccess,
  showUpgradeLink = true,
  signupSource = "fork flow",
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isDev) {
      setEmail(DEV_LOGIN_BYPASS_EMAIL);
      setName(DEV_LOGIN_BYPASS_NAME);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setProgress(0);
    const timer = setInterval(() => setProgress((prev) => Math.min(prev + 10, 90)), 3000);
    const body = { email, name, signupSource };
    const isDevBypass = isDev && isDevMagicLinkBypassEmail(email);
    if (isDevBypass) body.devBypass = true;

    let res;
    try {
      if (isDevBypass) {
        res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        const magic = new Magic(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY);
        const didToken = await magic.auth.loginWithMagicLink({ email });
        res = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${didToken}`,
          },
          body: JSON.stringify(body),
        });
      }
      if (res.status === 200) {
        await mutateUser();
        clearInterval(timer);
        setProgress(100);
        onSuccess?.();
      } else {
        clearInterval(timer);
        alert("There was an issue with login. Please try again.");
      }
    } catch {
      clearInterval(timer);
      alert("There was an issue with login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {loading ? (
        <Progress value={progress} className="w-full" />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="ry-name">Name</Label>
            <Input
              id="ry-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ry-email">Email</Label>
            <Input
              id="ry-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10"
            />
          </div>
          <Button type="submit" className="w-full">
            Continue with Email
          </Button>
        </form>
      )}
      {showUpgradeLink ? (
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/#pricing" className="font-medium text-foreground underline">
            Upgrade to Pro now
          </Link>
          {" "}
          and run unlimited analyses with the full power of Lychee.
        </p>
      ) : null}
    </div>
  );
}
