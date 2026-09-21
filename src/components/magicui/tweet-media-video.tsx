export function pickMp4Variant(
  variants: { type?: string; src: string }[] | undefined
) {
  if (!variants?.length) return undefined;
  const mp4s = variants.filter(
    (variant) =>
      variant.type === "video/mp4" ||
      (!variant.type?.includes("mpegURL") && variant.src.includes(".mp4"))
  );
  const ranked = [...(mp4s.length ? mp4s : variants)].sort((a, b) => {
    const score = (src: string) => {
      const match = src.match(/(\d+)x(\d+)/);
      return match ? Number(match[1]) * Number(match[2]) : 0;
    };
    return score(b.src) - score(a.src);
  });
  // Prefer a mid/high mp4 over HLS or the heaviest 1080p file.
  return ranked.length > 1 ? ranked[1] : ranked[0];
}

/** Serve Twitter CDN media from this origin so the <video> can play it. */
export function proxiedTweetMediaUrl(src: string) {
  return `/api/tweet-media?url=${encodeURIComponent(src)}`;
}
