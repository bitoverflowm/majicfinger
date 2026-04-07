import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Convert CSS color (including var(--x)) to an rgba() string.
export const getRGBA = (cssColor, fallback = "rgba(180, 180, 180, 1)") => {
  if (typeof window === "undefined") return fallback
  if (!cssColor) return fallback

  try {
    let resolved = cssColor
    if (typeof cssColor === "string" && cssColor.trim().startsWith("var(")) {
      const el = document.createElement("div")
      el.style.color = cssColor
      document.body.appendChild(el)
      resolved = window.getComputedStyle(el).color
      document.body.removeChild(el)
    }

    // If browser already gives us rgb/rgba, use it.
    if (typeof resolved === "string" && resolved.startsWith("rgb")) return resolved

    // Fallback: let the browser parse any valid CSS color.
    const el = document.createElement("div")
    el.style.color = resolved
    document.body.appendChild(el)
    const computed = window.getComputedStyle(el).color
    document.body.removeChild(el)
    return computed && computed.startsWith("rgb") ? computed : fallback
  } catch (e) {
    console.error("Color parsing failed:", e)
    return fallback
  }
}

export const colorWithOpacity = (rgbaColor, opacity) => {
  if (typeof rgbaColor !== "string" || !rgbaColor.startsWith("rgb")) return rgbaColor
  const m =
    rgbaColor.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i) || null
  if (!m) return rgbaColor
  const r = Number(m[1])
  const g = Number(m[2])
  const b = Number(m[3])
  const a = Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 1
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
