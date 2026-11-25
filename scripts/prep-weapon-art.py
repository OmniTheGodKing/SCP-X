#!/usr/bin/env python3
"""Turn a side-on weapon photograph into a game asset at art/weapon/<model id>.webp.

The photo's plain background is removed by flood-filling inward from the edges (anything close in colour to the
border is background), the weapon is cropped, turned muzzle-right if needed, and placed in the 400 x 120 weapon
frame (drawn at 3x) so its butt and muzzle land where src/ui/stage/weapon.ts expects them for that model.

    python3 scripts/prep-weapon-art.py <photo> <model id> [--flip] [--tol 38] [--top 34] [--crop l,t,r,b]

--crop trims the source first (fractions of width and height), for photos with two guns or a label.
Needs Pillow and numpy.
"""
import argparse, os, re
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCALE = 3


def profile_span(model):
    """The butt and muzzle x for a model, read from the PROFILES table in weapon.ts."""
    src = open(os.path.join(ROOT, "src/ui/stage/weapon.ts"), encoding="utf-8").read()
    m = re.search(rf"^\s*{re.escape(model)}:\s*\{{[^\n]*?butt:\s*(\d+)[^\n]*?muz:\s*(\d+)", src, re.M)
    if not m:
        raise SystemExit(f"no profile for {model} in weapon.ts")
    return int(m.group(1)), int(m.group(2))


def cut_background(img, tol):
    """Background is light and grey (a studio or museum backdrop): pixels close to the border's colour, low in
    saturation and not darker than the backdrop's shadows, that connect to the edge of the photo."""
    a = np.asarray(img.convert("RGB")).astype(np.int16)
    h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    ref = np.median(border, axis=0)
    lum = a.mean(axis=2)
    sat = a.max(axis=2) - a.min(axis=2)
    near = np.abs(a - ref).sum(axis=2) < tol * 3
    pred = near & (sat < max(18, tol * 0.7)) & (lum > ref.mean() * 0.58)
    mask = Image.fromarray(np.where(pred, 255, 0).astype(np.uint8))
    framed = Image.new("L", (w + 2, h + 2), 255); framed.paste(mask, (1, 1))
    ImageDraw.floodfill(framed, (0, 0), 128)
    bg = np.asarray(framed)[1:-1, 1:-1] == 128
    alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8))
    # close pinholes, then soften the cut edge by a pixel
    alpha = alpha.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = img.convert("RGBA"); out.putalpha(alpha)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("photo"); ap.add_argument("model")
    ap.add_argument("--flip", action="store_true", help="the muzzle points left in the photo")
    ap.add_argument("--tol", type=int, default=30, help="background colour tolerance (per channel, against the border colour)")
    ap.add_argument("--top", type=float, default=34, help="frame y for the top of the weapon")
    ap.add_argument("--crop", help="l,t,r,b fractions to keep from the source")
    ap.add_argument("--work", type=int, default=1400, help="width to process at")
    a = ap.parse_args()
    img = Image.open(a.photo).convert("RGB")
    if a.crop:
        l, t, r, b = (float(v) for v in a.crop.split(","))
        W, H = img.size
        img = img.crop((int(l * W), int(t * H), int(r * W), int(b * H)))
    if img.width > a.work:
        img = img.resize((a.work, round(img.height * a.work / img.width)), Image.LANCZOS)
    if a.flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    cut = cut_background(img, a.tol)
    box = cut.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox()
    if not box:
        raise SystemExit("nothing left after removing the background; lower --tol")
    gun = cut.crop(box)
    butt, muz = profile_span(a.model)
    k = (muz - butt) * SCALE / gun.width
    gun = gun.resize((round(gun.width * k), max(1, round(gun.height * k))), Image.LANCZOS)
    frame = Image.new("RGBA", (400 * SCALE, 120 * SCALE), (0, 0, 0, 0))
    frame.alpha_composite(gun, (butt * SCALE, round(a.top * SCALE)))
    os.makedirs(os.path.join(ROOT, "art/weapon"), exist_ok=True)
    dest = os.path.join(ROOT, "art/weapon", f"{a.model}.webp")
    frame.save(dest, "WEBP", quality=88, method=6)
    print(f"{dest}: weapon {gun.width}x{gun.height} at x {butt * SCALE}..{butt * SCALE + gun.width}, {os.path.getsize(dest) // 1024} KB")


if __name__ == "__main__":
    main()
