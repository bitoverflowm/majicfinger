"use client";

import { useEffect } from "react";
import { isChunkLoadError, reloadForStaleBuild } from "@/lib/retryImport";

/** Anything a page throws lands here instead of Next's blank "Application error". */
export default function AppError({ error, reset }) {
  const stale = isChunkLoadError(error);
  useEffect(() => {
    if (reloadForStaleBuild(error)) return;
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h2 className="text-[17px] font-semibold text-foreground">{stale ? "Lychee just updated" : "Something went wrong"}</h2>
      <p className="max-w-md text-[13px] text-muted-foreground">
        {stale ? "Reload to get the new version. Your saved work is safe." : "This screen hit an error. Your saved work is safe. Try again, or reload the page."}
      </p>
      <div className="flex gap-2">
        {stale ? null : (
          <button type="button" onClick={reset} className="h-9 rounded-md border border-border px-4 text-[13px] font-medium hover:bg-muted">
            Try again
          </button>
        )}
        <button type="button" onClick={() => window.location.reload()} className="h-9 rounded-md bg-foreground px-4 text-[13px] font-medium text-background">
          Reload
        </button>
      </div>
    </div>
  );
}
