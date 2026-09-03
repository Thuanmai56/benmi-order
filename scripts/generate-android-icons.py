#!/usr/bin/env python3
import os
import glob
from PIL import Image, ImageDraw

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON_SRC = os.path.join(ROOT_DIR, "blab_icon.png")
RES_DIR = os.path.join(ROOT_DIR, "apps", "android-pos", "android", "app", "src", "main", "res")

print(f"Loading source icon from: {ICON_SRC}")
src_img = Image.open(ICON_SRC).convert("RGBA")

# Crop to bounding box of non-transparent pixels
bbox = src_img.getbbox()
if bbox:
    src_cropped = src_img.crop(bbox)
else:
    src_cropped = src_img

print(f"Cropped graphic size: {src_cropped.size}")

# 1. Launcher densities
LAUNCHER_SIZES = {
    "mipmap-mdpi": (48, 108),
    "mipmap-hdpi": (72, 162),
    "mipmap-xhdpi": (96, 216),
    "mipmap-xxhdpi": (144, 324),
    "mipmap-xxxhdpi": (192, 432)
}

for folder, (icon_sz, fg_sz) in LAUNCHER_SIZES.items():
    target_folder = os.path.join(RES_DIR, folder)
    os.makedirs(target_folder, exist_ok=True)

    # A. Foreground (for adaptive icon):
    # fg_sz canvas, icon in safe zone ~ 66%
    fg_canvas = Image.new("RGBA", (fg_sz, fg_sz), (0, 0, 0, 0))
    target_w = int(fg_sz * 0.65)
    target_h = int(fg_sz * 0.65)
    # maintain aspect ratio
    aspect = src_cropped.width / src_cropped.height
    if aspect > 1.0:
        new_w = target_w
        new_h = int(target_w / aspect)
    else:
        new_h = target_h
        new_w = int(target_h * aspect)
    resized_fg = src_cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    pos_x = (fg_sz - new_w) // 2
    pos_y = (fg_sz - new_h) // 2
    fg_canvas.paste(resized_fg, (pos_x, pos_y), resized_fg)
    fg_canvas.save(os.path.join(target_folder, "ic_launcher_foreground.png"), "PNG")

    # B. ic_launcher_round.png (white circular background with centered logo)
    round_canvas = Image.new("RGBA", (icon_sz, icon_sz), (0, 0, 0, 0))
    draw_r = ImageDraw.Draw(round_canvas)
    # Circle with 1px padding
    draw_r.ellipse([1, 1, icon_sz - 2, icon_sz - 2], fill=(255, 255, 255, 255))
    target_inner = int(icon_sz * 0.72)
    if aspect > 1.0:
        in_w = target_inner
        in_h = int(target_inner / aspect)
    else:
        in_h = target_inner
        in_w = int(target_inner * aspect)
    resized_in = src_cropped.resize((in_w, in_h), Image.Resampling.LANCZOS)
    px = (icon_sz - in_w) // 2
    py = (icon_sz - in_h) // 2
    round_canvas.paste(resized_in, (px, py), resized_in)
    round_canvas.save(os.path.join(target_folder, "ic_launcher_round.png"), "PNG")

    # C. ic_launcher.png (squircle / rounded rectangle with white background)
    sq_canvas = Image.new("RGBA", (icon_sz, icon_sz), (0, 0, 0, 0))
    draw_sq = ImageDraw.Draw(sq_canvas)
    radius = int(icon_sz * 0.22)
    draw_sq.rounded_rectangle([1, 1, icon_sz - 2, icon_sz - 2], radius=radius, fill=(255, 255, 255, 255))
    sq_canvas.paste(resized_in, (px, py), resized_in)
    sq_canvas.save(os.path.join(target_folder, "ic_launcher.png"), "PNG")

    print(f"Generated launcher icons for {folder}: legacy {icon_sz}x{icon_sz}, fg {fg_sz}x{fg_sz}")

# 2. Splash screens
splash_files = glob.glob(os.path.join(RES_DIR, "**", "splash.png"), recursive=True)
for splash_path in splash_files:
    old_splash = Image.open(splash_path)
    sw, sh = old_splash.size
    splash_canvas = Image.new("RGBA", (sw, sh), (255, 255, 255, 255))

    # Icon size on splash: around 30% of smaller dimension, clamped between 96 and 280
    min_dim = min(sw, sh)
    target_splash_sz = max(96, min(int(min_dim * 0.32), 300))
    if aspect > 1.0:
        sp_w = target_splash_sz
        sp_h = int(target_splash_sz / aspect)
    else:
        sp_h = target_splash_sz
        sp_w = int(target_splash_sz * aspect)
    resized_sp = src_cropped.resize((sp_w, sp_h), Image.Resampling.LANCZOS)
    sp_x = (sw - sp_w) // 2
    sp_y = (sh - sp_h) // 2
    splash_canvas.paste(resized_sp, (sp_x, sp_y), resized_sp)
    # Convert to RGB (standard splash)
    splash_canvas.convert("RGB").save(splash_path, "PNG")
    print(f"Updated splash screen: {os.path.relpath(splash_path, ROOT_DIR)} ({sw}x{sh})")

print("All Android app icons & splash screens successfully updated with BLAB logo!")
