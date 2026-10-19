"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";

import { PricingSection } from "@/components/sections/pricing-section";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { mutateUser } from "@/lib/hooks";
import {
  MEMBERSHIP_TIERS,
  membershipState,
  normalizeMembershipCycle,
  normalizeMembershipTier,
  userInFreeRunWindow,
} from "@/lib/membershipAccess";
import { cn } from "@/lib/utils";

const STATUS_KEY = "/api/billing/status";

const statusFetcher = (url) =>
  fetch(url, { credentials: "same-origin" }).then(async (res) => {
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) throw new Error(data?.message || "Could not load billing");
    return data;
  });

const CYCLE_NOUN = { weekly: "weekly", monthly: "monthly", annual: "annually" };

function tierName(tier) {
  const t = String(tier || "");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

function formatMoney(cents, currency = "usd") {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

function formatDate(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function tierRank(tier) {
  return MEMBERSHIP_TIERS.indexOf(normalizeMembershipTier(tier));
}

async function openBillingPortal() {
  const res = await fetch("/api/billing/portal", { method: "POST", credentials: "same-origin" });
  const data = await res.json().catch(() => null);
  if (data?.url) {
    window.location.assign(data.url);
    return;
  }
  toast.error("Couldn't open billing. Try again in a moment.");
}

function headline({ locked, reason, membership, subscription }) {
  if (locked) {
    if (reason === "ended") {
      return {
        title: "Your membership has ended",
        body: "Renew to get back into your dashboard. Your saved projects are still here.",
      };
    }
    if (reason === "payment_issue") {
      return {
        title: "Your last payment didn't go through",
        body: "Update your payment method to restore access, or choose a plan below.",
      };
    }
    return {
      title: "You don't have a membership yet",
      body: "Upgrade now to unlock the Lychee dashboard. Pick the plan that fits your research. You can switch or cancel anytime.",
    };
  }
  if (membership?.lifetime) return { title: "Billing", body: "You have lifetime access to Lychee." };
  if (reason === "owner" || reason === "dev") return { title: "Billing", body: "This account has full access." };
  const name = tierName(membership?.tier);
  const cycle = CYCLE_NOUN[membership?.cycle] || "";
  let body = name ? `You're on the ${name} plan${cycle ? `, billed ${cycle}` : ""}.` : "You have an active membership.";
  if (subscription?.cancelAtPeriodEnd && subscription.currentPeriodEnd) {
    body += ` It ends on ${formatDate(subscription.currentPeriodEnd)}.`;
  } else if (subscription?.currentPeriodEnd) {
    body += ` Next bill on ${formatDate(subscription.currentPeriodEnd)}.`;
  }
  return { title: "Billing", body };
}

function PlanChangeDialog({ change, onClose, onChanged }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const open = !!change;

  useEffect(() => {
    if (!change) return undefined;
    let cancelled = false;
    setPreview(null);
    setError("");
    setInvoiceUrl("");
    (async () => {
      try {
        const res = await fetch("/api/billing/change-plan", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: change.tier, cycle: change.cycle, preview: true }),
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data?.success) setError(data?.message || "Couldn't price this change.");
        else setPreview(data.preview);
      } catch {
        if (!cancelled) setError("Couldn't price this change.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [change]);

  const close = () => {
    if (busy) return;
    setPreview(null);
    setError("");
    setInvoiceUrl("");
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    setError("");
    setInvoiceUrl("");
    try {
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: change.tier, cycle: change.cycle, prorationDate: preview?.prorationDate }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.message || "We couldn't change your plan.");
        if (data?.invoiceUrl) setInvoiceUrl(data.invoiceUrl);
        return;
      }
      toast.success(`You're now on ${tierName(change.tier)} (${change.cycle}).`);
      setPreview(null);
      onChanged();
    } catch {
      setError("We couldn't change your plan. Nothing was charged.");
    } finally {
      setBusy(false);
    }
  };

  const upgrade = change?.direction === "upgrade";
  const dueNow = preview?.dueNow;
  const credit = typeof preview?.total === "number" && preview.total < 0 ? -preview.total : 0;
  const priceLine = preview?.newAmount
    ? `${formatMoney(preview.newAmount, preview.currency)} per ${preview.newCycle === "annual" ? "year" : preview.newCycle === "weekly" ? "week" : "month"} after that.`
    : "";

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{change?.label}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              {upgrade ? (
                <p>Your new plan starts right away. You pay only the prorated difference for the rest of this billing period.</p>
              ) : (
                <p>Your new plan starts right away. Unused time on your current plan becomes credit toward your next bills.</p>
              )}
              {!preview && !error ? <p>Calculating…</p> : null}
              {preview && typeof dueNow === "number" ? (
                <p className="font-medium text-foreground">
                  {dueNow > 0
                    ? `Due today: ${formatMoney(dueNow, preview.currency)}.`
                    : credit > 0
                      ? `Credit added to your account: ${formatMoney(credit, preview.currency)}.`
                      : "Nothing due today."}{" "}
                  {priceLine}
                </p>
              ) : preview ? (
                <p className="font-medium text-foreground">{priceLine}</p>
              ) : null}
              {error ? <p className="text-red-600 dark:text-red-400">{error}</p> : null}
              {invoiceUrl ? (
                <a className="font-medium text-[#0d99ff] underline" href={invoiceUrl} target="_blank" rel="noreferrer">
                  Pay the invoice
                </a>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep current plan</AlertDialogCancel>
          <Button type="button" onClick={confirm} disabled={busy || (!preview && !error)}>
            {busy ? "Switching…" : upgrade ? "Confirm upgrade" : "Confirm change"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Billing screen. `locked` is the no-membership gate: the only thing an unpaid
 * signed-in user can see in the dashboard.
 */
export default function BillingView({ user, locked = false, onBack, className }) {
  const { data, error, isLoading, mutate } = useSWR(STATUS_KEY, statusFetcher, { revalidateOnFocus: true });
  const [change, setChange] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);

  const local = membershipState(user);
  const membership = data?.membership || {
    hasAccess: local.hasAccess,
    reason: local.reason,
    lifetime: !!user?.lifetimeMember,
    tier: normalizeMembershipTier(user?.subscriptionTier) || null,
    cycle: normalizeMembershipCycle(user?.billingCycle) || null,
    status: user?.subscriptionStatus || null,
  };
  const reason = membership.reason;
  const subscription = data?.subscription || null;
  const canChangePlan = !!data?.canChangePlan;
  const canManageBilling = !!data?.canManageBilling;
  const renewalFailing = ["past_due", "unpaid"].includes(String(membership.status || "").toLowerCase());
  const fullAccessWithoutPlan = !locked && (membership.lifetime || reason === "owner" || reason === "dev");
  const freeRunProject = locked && userInFreeRunWindow(user) ? String(user.run_yourself_fork_data_set_id) : "";

  const { title, body } = headline({ locked, reason, membership, subscription });
  const currentPlan = membership.tier && !membership.lifetime ? { tier: membership.tier, cycle: membership.cycle } : null;

  const refreshStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await mutate();
      await mutateUser();
      if (next?.membership?.hasAccess && locked) toast.success("Membership found. Welcome in!");
      else if (locked) toast("No active membership found for this login yet.");
    } finally {
      setRefreshing(false);
    }
  }, [locked, mutate]);

  const manageBilling = async () => {
    setPortalBusy(true);
    try {
      await openBillingPortal();
    } finally {
      setPortalBusy(false);
    }
  };

  const getAction = useCallback(
    ({ tier, cycle, href, isCurrent }) => {
      if (fullAccessWithoutPlan) return { label: "Included in your access", disabled: true };
      if (locked) {
        if (renewalFailing) return { label: "Update payment above", disabled: true };
        return { label: `Get ${tierName(tier)}`, href };
      }
      if (isCurrent) return { label: "Current plan", disabled: true };
      const from = tierRank(membership.tier);
      const to = tierRank(tier);
      const direction = to > from ? "upgrade" : to < from ? "downgrade" : "switch";
      const label =
        direction === "upgrade"
          ? `Upgrade to ${tierName(tier)}`
          : direction === "downgrade"
            ? `Downgrade to ${tierName(tier)}`
            : `Switch to ${cycle}`;
      if (!canChangePlan) {
        const hint = subscription?.cancelAtPeriodEnd
          ? "Resume your plan in Manage billing to switch."
          : subscription?.pendingUpdate
            ? "Finish your pending change in Manage billing."
            : isLoading
              ? ""
              : "Plan changes for this account go through support.";
        return { label, disabled: true, hint };
      }
      return { label, onClick: () => setChange({ tier, cycle, direction, label }) };
    },
    [canChangePlan, fullAccessWithoutPlan, isLoading, locked, membership.tier, renewalFailing, subscription],
  );

  const defaultCycle = useMemo(() => {
    const c = normalizeMembershipCycle(membership.cycle);
    return c === "weekly" || c === "annual" ? c : "monthly";
  }, [membership.cycle]);

  return (
    <div className={cn("mx-auto flex w-full max-w-7xl flex-col items-center px-4 pb-16 pt-10 text-foreground", className)}>
      {onBack && !locked ? (
        <div className="mb-2 flex w-full max-w-7xl px-2">
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            ← Back to dashboard
          </Button>
        </div>
      ) : null}
      <div className="flex w-full max-w-3xl flex-col items-center gap-3 text-center">
        {locked ? (
          <span className="inline-flex h-6 items-center rounded-full bg-[#e5f4ff] px-2.5 text-xs font-medium text-[#0d99ff] dark:bg-[#0d99ff]/15">
            Membership required
          </span>
        ) : null}
        <h1 className="text-balance text-3xl font-medium tracking-tighter md:text-4xl">{title}</h1>
        <p className="max-w-xl text-balance font-medium text-muted-foreground">{body}</p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {(!locked || renewalFailing) && canManageBilling ? (
            <Button type="button" variant={locked ? "default" : "outline"} size="sm" onClick={manageBilling} disabled={portalBusy}>
              {portalBusy ? "Opening…" : locked ? "Update payment method" : "Manage billing"}
            </Button>
          ) : null}
          {freeRunProject ? (
            <Button variant="outline" size="sm" asChild>
              <a href={`/dashboard?project=${encodeURIComponent(freeRunProject)}&runYourselfSession=1`}>Open your free analysis</a>
            </Button>
          ) : null}
          {locked ? (
            <Button type="button" variant="ghost" size="sm" onClick={refreshStatus} disabled={refreshing}>
              {refreshing ? "Checking…" : "Already paid? Refresh"}
            </Button>
          ) : null}
        </div>
        {!locked && canManageBilling ? (
          <p className="text-xs text-muted-foreground">Update your card, download invoices, or cancel in Manage billing.</p>
        ) : null}
        {user?.email ? (
          <p className="text-xs text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
            {user.billing_email && user.billing_email.toLowerCase() !== user.email.toLowerCase() ? (
              <>
                {" "}· Billing email <span className="font-medium text-foreground">{user.billing_email}</span>
              </>
            ) : null}
            {locked ? ". Paid with a different email? Log in with that email instead." : ""}
          </p>
        ) : null}
        {error && !data ? (
          <p className="text-xs text-red-600 dark:text-red-400">We couldn't reach billing just now. Plans below still work.</p>
        ) : null}
        {data?.stripeError ? (
          <p className="text-xs text-muted-foreground">{data.stripeError} Showing the plan on file.</p>
        ) : null}
      </div>

      <PricingSection
        key={defaultCycle}
        id="billing-plans"
        showHeader={false}
        defaultCycle={defaultCycle}
        currentPlan={currentPlan}
        getAction={getAction}
        className="mt-20"
      />

      <PlanChangeDialog
        change={change}
        onClose={() => setChange(null)}
        onChanged={() => {
          setChange(null);
          void mutate();
          void mutateUser();
        }}
      />
    </div>
  );
}
