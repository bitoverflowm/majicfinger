"""
Crops each OG background to 1200x630 and writes a blurred twin for the frosted card.
Run: python3 scripts/og/prepare-backgrounds.py
"""
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "scripts/og/backgrounds"
W, H = 1200, 630

# name -> (source, horizontal focus 0..1, vertical focus 0..1)
SOURCES = {
    "orchard": ("public/landing/demo-backdrop.jpg", 0.62, 0.5),
    "dusk": ("scripts/og/sources/dusk.jpg", 0.5, 0.5),
    "dusk-framed": ("scripts/og/sources/dusk-framed.jpg", 0.5, 0.5),
    "dawn": ("scripts/og/sources/dawn.jpg", 0.5, 0.35),
    "silk": ("scripts/og/sources/silk.jpg", 0.5, 0.5),
    "blush-sky": ("scripts/og/sources/blush-sky.jpg", 0.5, 0.5),
    "night-lake": ("public/landing/feature-insights.jpg", 0.5, 0.45),
    "sunset-lake": ("public/landing/feature-explore-lake.jpg", 0.5, 0.4),
    "terraces": ("public/landing/feature-dashboards.jpg", 0.5, 0.3),
}


def cover(im, fx, fy):
    scale = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left = round((im.width - W) * fx)
    top = round((im.height - H) * fy)
    return im.crop((left, top, left + W, top + H))


OUT.mkdir(parents=True, exist_ok=True)
for name, (src, fx, fy) in SOURCES.items():
    im = cover(Image.open(ROOT / src).convert("RGB"), fx, fy)
    im.save(OUT / f"{name}.jpg", quality=90)
    im.filter(ImageFilter.GaussianBlur(28)).save(OUT / f"{name}-blur.jpg", quality=85)
    print(f"wrote {name}")
