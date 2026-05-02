/**
 * Layering for fixed bottom composer docks vs dashboard canvas (`relative z-[1]` was painting over dock tooltips).
 */
export const composerDockFixedZClass = "z-[500]";

/** Radix TooltipContent defaults to z-50; dock tooltips must clear the canvas and drawer (z-20). */
export const composerDockTooltipContentClass = "!z-[520] text-xs";

export const composerDockPopoverContentZClass = "!z-[520]";
