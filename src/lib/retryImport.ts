export function isChunkLoadError(error: unknown) {
  const err = error as { name?: string; message?: string } | null;
  return err?.name === "ChunkLoadError" || /Loading (CSS )?chunk .+ failed/i.test(err?.message ?? "");
}

const RELOAD_KEY = "lychee:stale-build-reload";
const RELOAD_GAP_MS = 30_000;

/**
 * A page opened before a deploy asks for chunks the new build no longer serves. Only a reload gets
 * the new ones. Reloads at most once per 30 seconds so a chunk that's truly missing can't loop.
 * @returns whether it reloaded.
 */
export function reloadForStaleBuild(error: unknown) {
  if (typeof window === "undefined" || !isChunkLoadError(error)) return false;
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_GAP_MS) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/**
 * Retries a dynamic `import()` when its chunk fails to load (dev server mid-compile, flaky network,
 * or a deploy swapping chunks). Webpack clears a failed chunk, so calling `load` again re-requests it.
 */
export function retryImport<T>(load: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  return load().catch((error) => {
    if (retries <= 0 || !isChunkLoadError(error)) throw error;
    return new Promise<void>((resolve) => setTimeout(resolve, delayMs)).then(() =>
      retryImport(load, retries - 1, delayMs * 2),
    );
  });
}
