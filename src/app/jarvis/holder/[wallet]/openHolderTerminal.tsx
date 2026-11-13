"use client";

import { useEffect } from "react";

/** Sends people straight on to the terminal; link previews (which don't run scripts) stay on the card page. */
export function OpenHolderTerminal({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);
  return (
    <a href={href} className="rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white">
      Open in Holder Terminal
    </a>
  );
}
