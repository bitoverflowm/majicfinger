import { squarify } from "@/lib/visualizations/volumeTreemap";

/**
 * Named holders share an area sized by their part of all shares. Everyone else is one strip
 * along the far edge, so the long tail keeps its true size without crowding the named tiles.
 * @param {Array<{ weight: number }>} named
 * @param {{ weight: number } | null} rest
 * @param {number} width
 * @param {number} height
 */
export function layoutHolderTiles(named, rest, width, height) {
  if (width <= 0 || height <= 0) return [];
  const namedWeight = named.reduce((sum, tile) => sum + Math.max(0, tile.weight || 0), 0);
  const restWeight = Math.max(0, rest?.weight || 0);
  if (!restWeight || namedWeight <= 0) return squarify(named, width, height);
  const share = namedWeight / (namedWeight + restWeight);
  const across = width >= height;
  const side = across ? width : height;
  const cut = Math.max(Math.min(side - 18, Math.round(side * share)), Math.min(side, 48));
  const tiles = across ? squarify(named, cut, height) : squarify(named, width, cut);
  const strip = across
    ? { x: cut, y: 0, w: width - cut, h: height }
    : { x: 0, y: cut, w: width, h: height - cut };
  return strip.w > 0 && strip.h > 0 ? [...tiles, { ...rest, ...strip }] : tiles;
}
