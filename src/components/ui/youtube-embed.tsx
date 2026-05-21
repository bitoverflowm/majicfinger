import { VideoEmbed } from "./video-embed";
import { cn } from "@/lib/utils";

export interface YouTubeProps {
  /** YouTube video ID, watch URL, or youtu.be link */
  videoId: string;
  title?: string;
  /** Start playback at this many seconds */
  start?: number;
  className?: string;
}

/** Extract an 11-char YouTube ID from a raw id or common URL shapes. */
export function parseYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }
    const fromQuery = url.searchParams.get("v");
    if (fromQuery) return fromQuery;
    const embedMatch = url.pathname.match(/\/embed\/([^/?]+)/);
    if (embedMatch?.[1]) return embedMatch[1];
  } catch {
    return null;
  }
  return null;
}

export function YouTube({ videoId, title = "YouTube video", start, className }: YouTubeProps) {
  const id = parseYouTubeVideoId(videoId);
  if (!id) {
    if (process.env.NODE_ENV === "development") {
      return (
        <p className="my-6 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Invalid YouTube videoId: {videoId}
        </p>
      );
    }
    return null;
  }

  const params = new URLSearchParams({ rel: "0" });
  if (start != null && start > 0) params.set("start", String(Math.floor(start)));

  const src = `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;

  return (
    <div className={cn("my-8", className)}>
      <VideoEmbed src={src} title={title} />
    </div>
  );
}
