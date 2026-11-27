#!/usr/bin/env python3
"""Generate collision-proof raster launcher icons for JIO-PLAY."""
from pathlib import Path
import re
from PIL import Image, ImageDraw, ImageFont

RES = Path("android/app/src/main/res")
RED = "#E60012"
WHITE = "#FFFFFF"
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
ICON = "jio_play_launcher"


def fit_font(text, max_width, max_height):
    size = int(max_height)
    while size > 8:
        font = ImageFont.truetype(FONT_PATH, size)
        left, top, right, bottom = font.getbbox(text)
        if right - left <= max_width and bottom - top <= max_height:
            return font
        size -= 1
    return ImageFont.truetype(FONT_PATH, 8)


def make_icon(size):
    scale = 4
    canvas = size * scale
    img = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    margin = round(canvas * 0.035)
    draw.ellipse((margin, margin, canvas - margin - 1, canvas - margin - 1), fill=RED)
    font = fit_font("Jio", canvas * 0.78, canvas * 0.40)
    draw.text((canvas / 2, canvas / 2), "Jio", font=font, fill=WHITE, anchor="mm")
    return img.resize((size, size), Image.Resampling.LANCZOS)


# Use a brand-new resource name so no Capacitor template/default Android
# icon can shadow the intended artwork during Android resource resolution.
for density, size in {
    "mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192
}.items():
    folder = RES / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    icon = make_icon(size)
    icon.save(folder / f"{ICON}.png")
    icon.save(folder / f"{ICON}_round.png")

# Remove any adaptive-icon definitions for our unique resource name.
# This deliberately forces Android to use the verified raster PNG artwork.
anydpi = RES / "mipmap-anydpi-v26"
if anydpi.exists():
    for name in (f"{ICON}.xml", f"{ICON}_round.xml"):
        candidate = anydpi / name
        if candidate.exists():
            candidate.unlink()

manifest = Path("android/app/src/main/AndroidManifest.xml")
if not manifest.exists():
    raise SystemExit("AndroidManifest.xml was not generated")
manifest_text = manifest.read_text(encoding="utf-8")
manifest_text, icon_count = re.subn(
    r'android:icon="@mipmap/[^"]+"',
    f'android:icon="@mipmap/{ICON}"',
    manifest_text,
    count=1,
)
manifest_text, round_count = re.subn(
    r'android:roundIcon="@mipmap/[^"]+"',
    f'android:roundIcon="@mipmap/{ICON}_round"',
    manifest_text,
    count=1,
)
if icon_count != 1 or round_count != 1:
    raise SystemExit("Could not safely replace both launcher icon references in AndroidManifest.xml")
manifest.write_text(manifest_text, encoding="utf-8")

# Verify every density has the expected red-circle/white-Jio artwork.
for density in ("mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"):
    path = RES / f"mipmap-{density}" / f"{ICON}.png"
    with Image.open(path) as img:
        if img.size[0] != img.size[1] or img.size[0] == 0:
            raise SystemExit(f"Invalid launcher icon dimensions: {path}")
        if img.getpixel((img.size[0] // 2, img.size[1] // 2))[3] == 0:
            raise SystemExit(f"Launcher icon center is transparent: {path}")

print(f"Generated unique raster launcher resources: {ICON} and {ICON}_round.")
print("AndroidManifest.xml now points directly to those JIO-PLAY icon resources.")
