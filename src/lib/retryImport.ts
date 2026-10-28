function isChunkLoadError(error: unknown) {
  const err = error as { name?: string; message?: string } | null;
  return err?.name === "ChunkLoadError" || /Loading (CSS )?chunk .+ failed/i.test(err?.message ?? "");
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
