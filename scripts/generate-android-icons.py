#!/usr/bin/env python3
"""Generate the official JIO-PLAY Android launcher icons."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

RES = Path("android/app/src/main/res")
RED = "#E60012"
WHITE = "#FFFFFF"
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def font_for(text, max_width, max_height):
    size = max_height
    while size > 8:
        font = ImageFont.truetype(FONT_PATH, size)
        box = font.getbbox(text)
        if box[2] - box[0] <= max_width and box[3] - box[1] <= max_height:
            return font
        size -= 1
    return ImageFont.truetype(FONT_PATH, 8)

def make_legacy(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    margin = round(size * 0.035)
    draw.ellipse((margin, margin, size-margin-1, size-margin-1), fill=RED)
    font = font_for("JIO", size * 0.78, size * 0.40)
    draw.text((size/2, size/2), "JIO", font=font, fill=WHITE, anchor="mm")
    return img

for density, size in {
    "mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192
}.items():
    folder = RES / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    icon = make_legacy(size)
    icon.save(folder / "ic_launcher.png")
    icon.save(folder / "ic_launcher_round.png")

# Adaptive icon foreground: white JIO lettering on transparent canvas.
# The adaptive background is the official red brand color.
adaptive = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
draw = ImageDraw.Draw(adaptive)
font = font_for("JIO", 330, 150)
draw.text((216, 216), "JIO", font=font, fill=WHITE, anchor="mm")
drawable = RES / "drawable"
drawable.mkdir(parents=True, exist_ok=True)
adaptive.save(drawable / "ic_launcher_foreground.png")

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
colors = RES / "values"
colors.mkdir(parents=True, exist_ok=True)
color_file = colors / "ic_launcher_background.xml"
color_file.write_text("""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#E60012</color>
</resources>
""", encoding="utf-8")
print("Generated JIO-PLAY launcher icons for all Android densities.")
