"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { X } from "lucide-react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { useUser } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Feature tips: demo tips, onboarding helpers and other one-off messages.
 *
 * - `FeatureTipCard` is the box on its own (heading, close, media, description, actions).
 *   Use it inline, e.g. in a side panel.
 * - `FeatureTip` floats the card next to a feature with an arrow pointing at it.
 * - `useFeatureTipDismissal` remembers that a tip was closed. Off in the landing demo.
 */

const STORAGE_PREFIX = "lychee:feature-tip";

function storageKey(id, userId) {
  return `${STORAGE_PREFIX}:${userId || "anon"}:${id}`;
}

function readDismissed(key) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/**
 * `dismissed` is null until storage has been read, so callers can avoid flashing a tip
 * the user already closed. `persist` defaults to on everywhere except the landing demo.
 */
export function useFeatureTipDismissal(id, { persist } = {}) {
  const user = useUser();
  const landingDemo = !!useMyStateV2()?.landingDemo;
  const remember = !!id && (persist ?? !landingDemo);
  const key = id ? storageKey(id, user?.userId) : null;
  const [dismissed, setDismissed] = useState(remember ? null : false);

  useEffect(() => {
    if (!remember || !key) {
      setDismissed(false);
      return;
    }
    setDismissed(readDismissed(key));
  }, [remember, key]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    if (!remember || !key) return;
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      // Storage can be unavailable (private mode); the tip just shows again next visit.
    }
  }, [remember, key]);

  const reset = useCallback(() => {
    setDismissed(false);
    if (!key) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Same as above.
    }
  }, [key]);

  return { dismissed, dismiss, reset };
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Tips that are on screen, or about to be. Lets a tip wait for another (`after`) across components. */
const pendingTips = new Map();
const pendingListeners = new Set();

function setTipPending(id, on) {
  const count = (pendingTips.get(id) || 0) + (on ? 1 : -1);
  if (count > 0) pendingTips.set(id, count);
  else pendingTips.delete(id);
  pendingListeners.forEach((listener) => listener());
}

function useAnyTipPending(ids) {
  const list = (Array.isArray(ids) ? ids : ids ? [ids] : []).join("|");
  const check = useCallback(() => !!list && list.split("|").some((id) => pendingTips.has(id)), [list]);
  const [pending, setPending] = useState(check);
  useIsomorphicLayoutEffect(() => {
    const update = () => setPending(check());
    update();
    pendingListeners.add(update);
    return () => pendingListeners.delete(update);
  }, [check]);
  return pending;
}

const CARD_SURFACE = "bg-white text-neutral-800 dark:bg-[#2c2c2c] dark:text-neutral-100";
const CARD_SHADOW =
  "[filter:drop-shadow(0_0_0.5px_rgba(0,0,0,0.18))_drop-shadow(0_1px_3px_rgba(0,0,0,0.1))_drop-shadow(0_5px_12px_rgba(0,0,0,0.13))] dark:[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.12))_drop-shadow(0_5px_12px_rgba(0,0,0,0.45))]";

function TipAction({ action, primary }) {
  if (!action) return null;
  if (!action.label) return action;
  return (
    <button
      type="button"
      onClick={action.onClick}
      className={cn(
        "inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d99ff]/40",
        primary
          ? "bg-[#0d99ff] text-white hover:bg-[#0b87e0]"
          : "text-neutral-600 hover:bg-black/[0.05] hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white",
      )}
    >
      {action.label}
      {action.icon ? <action.icon className="size-3.5" aria-hidden /> : null}
    </button>
  );
}

/**
 * The tip box. `media` takes any node: an image, an illustration or an animation.
 * `description` is a string/node, or an array of them for separate paragraphs.
 * `action` / `secondaryAction` take `{ label, onClick, icon? }` or a custom node.
 * `step` (`{ current, total }`) shows "2 of 4" for multi-tip tours.
 */
export function FeatureTipCard({
  title,
  description,
  media,
  mediaClassName,
  onClose,
  action,
  secondaryAction,
  step,
  children,
  className,
  titleId,
  descriptionId,
}) {
  const hasFooter = !!(action || secondaryAction || step);
  return (
    <div className={cn("w-[264px] overflow-hidden rounded-[13px]", CARD_SURFACE, className)}>
      {title || onClose ? (
        <div className="flex items-start gap-2 px-4 pb-2.5 pt-3">
          {title ? (
            <h3 id={titleId} className="min-w-0 flex-1 text-[13px] font-semibold leading-5 tracking-[-0.005em]">
              {title}
            </h3>
          ) : (
            <span className="flex-1" />
          )}
          {onClose ? (
            <button
              type="button"
              aria-label="Close tip"
              onClick={onClose}
              className="-mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-neutral-700 transition-colors hover:bg-black/[0.05] hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
      {media ? (
        <div
          className={cn(
            "relative flex h-[148px] items-center justify-center overflow-hidden bg-[#e5f4ff] dark:bg-[#1f3347]",
            mediaClassName,
          )}
        >
          {media}
        </div>
      ) : null}
      {description ? (
        <div
          id={descriptionId}
          className={cn(
            "space-y-2 px-4 text-[13px] leading-[1.45] text-neutral-800 dark:text-neutral-200",
            media || !(title || onClose) ? "pt-3" : "pt-0",
          )}
        >
          {(Array.isArray(description) ? description : [description]).map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      ) : null}
      {children ? <div className="px-4 pt-3">{children}</div> : null}
      {hasFooter ? (
        <div className="flex items-center gap-2 px-4 pb-4 pt-4">
          {step ? (
            <span className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
              {step.current} of {step.total}
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-1.5">
            <TipAction action={secondaryAction} />
            <TipAction action={action} primary />
          </div>
        </div>
      ) : (
        <div className="h-4" />
      )}
    </div>
  );
}

/**
 * Floating tip with an arrow pointing at a feature.
 *
 * Point it at a feature either by wrapping it (`children`) or with `anchorRef`, which
 * leaves the feature's markup alone. `side` and `align` pick where the tip sits; it
 * flips automatically when there isn't room.
 *
 * Visibility is `open` (controlled) or automatic: shown unless the user closed it before.
 * `after` (tip id or ids) holds this tip back while those tips are still showing.
 * Closing (X or Escape) calls `onDismiss` and is remembered under `id`.
 */
export function FeatureTip({
  id,
  open,
  onDismiss,
  persist,
  children,
  anchorRef,
  side = "bottom",
  align = "center",
  sideOffset = 8,
  alignOffset = 0,
  portalContainer,
  contentClassName,
  closeOnAction = false,
  after,
  action,
  secondaryAction,
  ...cardProps
}) {
  const { dismissed, dismiss } = useFeatureTipDismissal(id, { persist });
  const wanted = dismissed !== true && (open ?? true);
  const waiting = useAnyTipPending(after);
  const shown = dismissed === false && wanted && !waiting;

  useIsomorphicLayoutEffect(() => {
    if (!id || !wanted) return;
    setTipPending(id, true);
    return () => setTipPending(id, false);
  }, [id, wanted]);
  const titleId = id ? `feature-tip-${id}-title` : undefined;
  const descriptionId = id ? `feature-tip-${id}-description` : undefined;

  const close = useCallback(() => {
    dismiss();
    onDismiss?.();
  }, [dismiss, onDismiss]);

  const wrapAction = (item) =>
    item && item.label && closeOnAction
      ? {
          ...item,
          onClick: (event) => {
            item.onClick?.(event);
            dismiss();
          },
        }
      : item;

  return (
    <PopoverPrimitive.Root open={shown} onOpenChange={(next) => (next ? null : close())}>
      {anchorRef ? (
        <PopoverPrimitive.Anchor virtualRef={anchorRef} />
      ) : (
        <PopoverPrimitive.Anchor asChild>{children}</PopoverPrimitive.Anchor>
      )}
      {anchorRef ? children : null}
      <PopoverPrimitive.Portal container={portalContainer}>
        <PopoverPrimitive.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          collisionPadding={12}
          arrowPadding={14}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className={cn(
            "z-[580] outline-none",
            CARD_SHADOW,
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
            contentClassName,
          )}
        >
          <FeatureTipCard
            {...cardProps}
            titleId={titleId}
            descriptionId={descriptionId}
            onClose={close}
            action={wrapAction(action)}
            secondaryAction={wrapAction(secondaryAction)}
          />
          <PopoverPrimitive.Arrow width={18} height={9} className="fill-white dark:fill-[#2c2c2c]" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
