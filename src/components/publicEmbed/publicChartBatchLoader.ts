import { chunkChartIds, publicChartChunkUrl } from "@/lib/publicDashboardChartChunks";
import { expandViewerChartPayload, type ViewerChartPayload } from "@/lib/publicChartViewerPayload";

export type LoadedChart = {
  chartPayload: ViewerChartPayload | null;
  chartLink: { mode?: string; slug?: string } | null;
};

type Listener = () => void;

export type ChartLoadProgress = { loaded: number; total: number };

/**
 * Per-dashboard chart loader: requests charts in fixed layout-order groups (stable, CDN-cacheable
 * URLs), dedupes in-flight groups, and reports progress for the loading indicator.
 */
class PublicChartBatchLoader {
  private readonly username: string;
  private readonly slug: string;
  private readonly chunks: string[][];
  private readonly chunkIndexById = new Map<string, number>();
  private readonly results = new Map<string, LoadedChart | null>();
  private readonly inflight = new Map<number, Promise<void>>();
  private readonly listeners = new Set<Listener>();
  private progress: ChartLoadProgress;

  constructor(username: string, slug: string, chartIds: string[]) {
    this.username = username;
    this.slug = slug;
    this.chunks = chunkChartIds(chartIds);
    this.chunks.forEach((chunk, i) => chunk.forEach((id) => this.chunkIndexById.set(id, i)));
    this.progress = { loaded: 0, total: chartIds.length };
  }

  get(id: string): LoadedChart | null | undefined {
    return this.results.get(id);
  }

  getProgress(): ChartLoadProgress {
    return this.progress;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  load(id: string): Promise<LoadedChart | null> {
    if (this.results.has(id)) return Promise.resolve(this.results.get(id) ?? null);
    const idx = this.chunkIndexById.get(id);
    if (idx == null) return Promise.resolve(null);
    return this.loadChunk(idx).then(() => this.results.get(id) ?? null);
  }

  private loadChunk(idx: number): Promise<void> {
    const pending = this.inflight.get(idx);
    if (pending) return pending;
    const ids = this.chunks[idx] || [];
    const promise = fetch(publicChartChunkUrl(this.username, this.slug, ids), { credentials: "include" })
      .then((r) => r.json())
      .then((j: { success?: boolean; data?: { charts?: Record<string, LoadedChart> } }) => {
        const charts = j?.success ? j.data?.charts || {} : {};
        for (const id of ids) {
          if (this.results.has(id)) continue;
          const entry = charts[id];
          this.results.set(
            id,
            entry?.chartPayload
              ? { ...entry, chartPayload: expandViewerChartPayload(entry.chartPayload) }
              : null,
          );
        }
      })
      .catch(() => {
        for (const id of ids) if (!this.results.has(id)) this.results.set(id, null);
      })
      .finally(() => this.emit());
    this.inflight.set(idx, promise);
    return promise;
  }

  private emit() {
    let loaded = 0;
    for (const value of this.results.values()) if (value !== undefined) loaded += 1;
    this.progress = { loaded: Math.min(loaded, this.progress.total), total: this.progress.total };
    for (const l of this.listeners) l();
  }
}

const loaders = new Map<string, PublicChartBatchLoader>();

export function getPublicChartBatchLoader(username: string, slug: string, chartIds: string[]) {
  const key = `${username}/${slug}:${chartIds.join(",")}`;
  let loader = loaders.get(key);
  if (!loader) {
    loader = new PublicChartBatchLoader(username, slug, chartIds);
    loaders.set(key, loader);
  }
  return loader;
}

export type { PublicChartBatchLoader };
