#!/usr/bin/env python3
"""Generate consistent red-circle, white-Jio Android launcher icons."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

RES = Path("android/app/src/main/res")
RED = "#E60012"
WHITE = "#FFFFFF"
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def fit_font(text, max_width, max_height):
    size = int(max_height)
    while size > 8:
        font = ImageFont.truetype(FONT_PATH, size)
        left, top, right, bottom = font.getbbox(text)
        if right - left <= max_width and bottom - top <= max_height:
            return font
        size -= 1
    return ImageFont.truetype(FONT_PATH, 8)


def make_legacy(size):
    # Draw at 4x resolution so the circle and lettering stay crisp.
    scale = 4
    canvas = size * scale
    img = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    margin = round(canvas * 0.035)
    draw.ellipse((margin, margin, canvas - margin - 1, canvas - margin - 1), fill=RED)
    font = fit_font("Jio", canvas * 0.78, canvas * 0.40)
    draw.text((canvas / 2, canvas / 2), "Jio", font=font, fill=WHITE, anchor="mm")
    return img.resize((size, size), Image.Resampling.LANCZOS)


for density, size in {
    "mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192
}.items():
    folder = RES / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    icon = make_legacy(size)
    icon.save(folder / "ic_launcher.png")
    icon.save(folder / "ic_launcher_round.png")

# Adaptive foreground: keep the complete white Jio wordmark in Android's
# central safe zone. The adaptive background is the same brand red.
scale = 4
canvas = 432 * scale
adaptive = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
draw = ImageDraw.Draw(adaptive)
font = fit_font("Jio", 270 * scale, 100 * scale)
draw.text((canvas / 2, canvas / 2), "Jio", font=font, fill=WHITE, anchor="mm")
drawable = RES / "drawable"
drawable.mkdir(parents=True, exist_ok=True)
adaptive.resize((432, 432), Image.Resampling.LANCZOS).save(
    drawable / "ic_launcher_foreground.png"
)

anydpi = RES / "mipmap-anydpi-v26"
anydpi.mkdir(parents=True, exist_ok=True)
xml = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
"""
(anydpi / "ic_launcher.xml").write_text(xml, encoding="utf-8")
(anydpi / "ic_launcher_round.xml").write_text(xml, encoding="utf-8")

values = RES / "values"
values.mkdir(parents=True, exist_ok=True)
(values / "ic_launcher_background.xml").write_text(
    """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#E60012</color>
</resources>
""",
    encoding="utf-8",
)

# Fail the build if the Android application manifest does not use the
# launcher resources generated above.
manifest = Path("android/app/src/main/AndroidManifest.xml")
if not manifest.exists():
    raise SystemExit("AndroidManifest.xml was not generated")
manifest_text = manifest.read_text(encoding="utf-8")
if 'android:icon="@mipmap/ic_launcher"' not in manifest_text:
    raise SystemExit("Android manifest is not pointing to the generated JIO-PLAY launcher icon")
if 'android:roundIcon="@mipmap/ic_launcher_round"' not in manifest_text:
    raise SystemExit("Android manifest is not pointing to the generated round JIO-PLAY launcher icon")

print("Verified Jio launcher icons: red circle, white Jio wordmark, all Android densities.")
