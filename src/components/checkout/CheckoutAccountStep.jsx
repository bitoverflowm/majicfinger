"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Magic } from "magic-sdk";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/ui/user-avatar";
import { mutateUser, userSwrFetcher } from "@/lib/hooks";
import { handleLoginJourney } from "@/lib/analytics/journeyClient";
import {
  DEV_LOGIN_BYPASS_EMAIL,
  DEV_LOGIN_BYPASS_NAME,
  isDevMagicLinkBypassEmail,
} from "@/lib/devLoginBypass";
import { isReservedUserHandle } from "@/lib/reservedUserHandles";
import { randomUserHandle } from "@/lib/randomUserHandle";
import { uploadProfilePictureFile } from "@/components/profile/ProfilePictureUploader";

const isDev = process.env.NODE_ENV !== "production";

async function availableHandle(except) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = randomUserHandle();
    if (candidate === except || isReservedUserHandle(candidate)) continue;
    try {
      const res = await fetch(`/api/users/checkUserhandle?userHandle=${encodeURIComponent(candidate)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || (data && !data.exists)) return candidate;
    } catch {
      return candidate;
    }
  }
  return randomUserHandle();
}

export default function CheckoutAccountStep({ onComplete }) {
  const { data: user, isLoading } = useSWR("/api/user", userSwrFetcher);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [file, setFile] = useState(null);
  const [handleTaken, setHandleTaken] = useState(false);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const finished = useRef(false);
  const inputRef = useRef(null);
  const checkHandleTimer = useRef(null);
  const handleTouched = useRef(false);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!previewUrl) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (isDev) {
      setEmail(DEV_LOGIN_BYPASS_EMAIL);
      setName(DEV_LOGIN_BYPASS_NAME);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const seeded = randomUserHandle();
    setHandle((current) => (handleTouched.current ? current : seeded));
    (async () => {
      try {
        const res = await fetch(`/api/users/checkUserhandle?userHandle=${encodeURIComponent(seeded)}`);
        const data = await res.json().catch(() => null);
        if (cancelled || handleTouched.current || !res.ok || !data?.exists) return;
        const next = await availableHandle(seeded);
        if (!cancelled && !handleTouched.current) setHandle(next);
      } catch {
        // Keep the generated handle if the check cannot run.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoading || !user?.user_name || finished.current) return;
    finished.current = true;
    onComplete?.({
      planKey: "",
      subscriptionTier: user.subscriptionTier || "",
    });
  }, [isLoading, onComplete, user]);

  const checkHandle = useCallback((value) => {
    const v = String(value || "").trim();
    if (v.length < 3 || isReservedUserHandle(v)) {
      setHandleTaken(v.length >= 3);
      setCheckingHandle(false);
      return;
    }
    setCheckingHandle(true);
    fetch(`/api/users/checkUserhandle?userHandle=${encodeURIComponent(v)}`)
      .then((res) => res.json())
      .then((data) => {
        const own =
          user?.user_name &&
          String(user.user_name).trim().toLowerCase() === v.toLowerCase();
        setHandleTaken(!!data?.exists && !own);
      })
      .catch(() => setHandleTaken(false))
      .finally(() => setCheckingHandle(false));
  }, [user?.user_name]);

  const persistProfile = async (userId) => {
    const v = String(handle || "").trim();
    if (v.length < 3 || isReservedUserHandle(v) || handleTaken) {
      throw new Error("Choose an available handle.");
    }
    const res = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_name: v }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || "Could not save your handle.");
    }
    if (file) {
      try {
        await uploadProfilePictureFile(file);
      } catch (err) {
        console.error("Profile picture upload failed:", err);
      }
    }
  };

  const finish = async ({ userId, planKey, subscriptionTier }) => {
    if (finished.current) return;
    finished.current = true;
    try {
      await persistProfile(userId);
      mutateUser();
      await onComplete?.({ planKey, subscriptionTier });
    } catch (err) {
      finished.current = false;
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (checkingHandle || handleTaken || String(handle || "").trim().length < 3) {
      setError("Choose an available handle.");
      return;
    }
    setLoading(true);
    setProgress(12);
    const timer = setInterval(() => setProgress((prev) => Math.min(prev + 8, 90)), 400);
    try {
      if (user?.userId) {
        await finish({
          userId: user.userId,
          planKey: "",
          subscriptionTier: user.subscriptionTier || "",
        });
        return;
      }

      const body = { email, name, signupSource: "checkout signup", userHandle: String(handle || "").trim() };
      const isDevBypass = isDev && isDevMagicLinkBypassEmail(email);
      let res;
      if (isDevBypass) {
        body.devBypass = true;
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
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + didToken },
          body: JSON.stringify(body),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (res.status !== 200) {
        throw new Error("There was an issue with login. Please message @misterrpink1 on Twitter.");
      }
      handleLoginJourney(data, {
        email,
        name,
        signupSource: "checkout signup",
        method: isDevBypass ? "dev bypass" : "magic link",
      });
      const saved = data.user || data.newUser || {};
      const userId = saved?._id ? String(saved._id) : "";
      if (!userId) throw new Error("Could not finish your account.");
      await finish({
        userId,
        planKey: data.planKey || "",
        subscriptionTier: saved.subscriptionTier || "",
      });
    } catch (err) {
      setError(err?.message || "Could not finish your account.");
      setLoading(false);
    } finally {
      clearInterval(timer);
      setProgress(100);
    }
  };

  const signedIn = Boolean(user?.email);
  const needsProfile = signedIn && !String(user?.user_name || "").trim();

  return (
    <div className="relative flex min-h-dvh w-full flex-1 flex-col items-center justify-center overflow-y-auto md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full min-h-screen flex-col p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-black" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <img src="/fruit.png" alt="Lychee" className="mr-2 h-8 w-6 brightness-0 invert" />
          <span className="text-white">Lychee</span>
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="leading-normal text-balance text-white/90">
            &ldquo;Discover something great.&rdquo;
          </blockquote>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center p-8 lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center gap-6 sm:w-[420px]">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
            <p className="text-sm text-muted-foreground text-balance">
              To protect the integrity of our platform and community, let&apos;s verify your email.
              Then pick the handle and avatar people will see on Lychee.
            </p>
          </div>
          {isLoading || (signedIn && user?.user_name) || loading ? (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                {loading ? "Finishing your account…" : isLoading ? "Loading…" : "Opening your dashboard…"}
              </p>
              <Progress value={loading ? progress : 40} className="w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {needsProfile ? null : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="checkout-name">Name</Label>
                    <Input
                      id="checkout-name"
                      type="text"
                      placeholder={isDev ? DEV_LOGIN_BYPASS_NAME : "Your name"}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkout-email">Email</Label>
                    <Input
                      id="checkout-email"
                      type="email"
                      placeholder={isDev ? DEV_LOGIN_BYPASS_EMAIL : "name@example.com"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="checkout-handle">Handle</Label>
                <p className="text-xs text-muted-foreground">
                  This is the handle people will see if you choose to publish your research, charts or dashboards.
                </p>
                <div className="relative">
                  <Input
                    id="checkout-handle"
                    type="text"
                    autoComplete="username"
                    value={handle}
                    onChange={(e) => {
                      const next = e.target.value.replace(/\s/g, "");
                      setHandle(next);
                      handleTouched.current = true;
                      setHandleTaken(false);
                      window.clearTimeout(checkHandleTimer.current);
                      if (next.trim().length >= 3) {
                        checkHandleTimer.current = window.setTimeout(() => checkHandle(next), 400);
                      }
                    }}
                    className="h-10"
                    required
                  />
                  {checkingHandle ? (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  ) : null}
                </div>
                {handleTaken ? (
                  <p className="text-xs text-destructive">This handle is already taken or reserved.</p>
                ) : String(handle || "").trim().length < 3 ? (
                  <p className="text-xs text-muted-foreground">Use at least 3 characters.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">A handle is ready for you. Change it if you want.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <UserAvatar src={previewUrl} handle={handle} name={name || user?.email} size={48} className="h-12 w-12" />
                  <div>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                      {file ? "Change image" : "Upload"}
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">Or keep this generated avatar.</p>
                  </div>
                </div>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button
                type="submit"
                className="w-full"
                disabled={checkingHandle || handleTaken || String(handle || "").trim().length < 3}
              >
                {needsProfile ? "Continue" : "Continue with Email"}
              </Button>
            </form>
          )}
          <p className="px-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-primary">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-primary">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
