"""Warm grade for the preloader's photo curtains (assets/hero/curtains/curtain-sel-N.webp -> curtain-sel-N-warm.webp).

The three photos have different cool-grey walls (luma .37 / .38 / .61), so the curtains read as three unrelated pictures against the dark
home. Here the neutral pixels (the wall, the gloves) are re-mapped through ONE warm gradient, so the wall of every photo lands on the same
dark warm tone; saturated pixels (skin, hair) only get a light darkening and a light warm cast, so the faces stay alive.
Weight = how neutral the pixel is, per pixel (no halo around hair or hands). Small neutral blobs inside a face are specular highlights,
not wall, and are left alone; pockets of wall between hair and glove are treated as wall.

The originals are never touched. Run again after changing a photo, or any constant below:
    python -I tools/grade-curtains.py [out_dir]        (default out_dir: assets/hero/curtains)
Needs Pillow, numpy, scipy. The photos' order and file names live in assets/napele-preloader.js (PHOTOS).
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "assets", "hero", "curtains")

# warm gradient map: luma (0..1) -> colour. The dark end is the hero's own #1B1A18 family, the light end is the home's gold #F3E6C4.
STOPS = [
    (0.00, (14, 12, 9)),
    (0.22, (58, 49, 40)),      # where the wall of every photo lands
    (0.50, (126, 107, 86)),
    (0.78, (200, 174, 138)),
    (1.00, (243, 230, 196)),
]
WALL_TARGET = 0.22                          # luma of the wall after the grade, the same in all three photos
SKIN_GAIN = {1: 0.90, 2: 0.90, 3: 0.82}     # sel-3 is the brightest photo overall
SKIN_WARM = np.array([1.035, 1.0, 0.945])   # light warm cast on the non-neutral pixels
PATCH = {                                   # y0, y1, x0, x1 (share of the frame) of bare wall, to measure its luma
    1: (0.05, 0.35, 0.85, 0.98),
    2: (0.05, 0.30, 0.80, 0.98),
    3: (0.05, 0.30, 0.02, 0.12),
}
MIN_AREA = 0.015     # a neutral region smaller than this share of the frame (and not touching its edge) is not wall...
POCKET_AREA = 0.0005  # ...unless it is at least this big and no brighter than the wall (a gap between hair and glove, not a highlight)


def luma(a):
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def gradient_map(l):
    xs = np.array([s[0] for s in STOPS])
    out = np.empty(l.shape + (3,))
    for c in range(3):
        out[..., c] = np.interp(l, xs, [s[1][c] / 255 for s in STOPS])
    return out


def wall_weight(L, S, wall):
    """1 on the wall and the gloves, 0 on skin and hair."""
    h, w = L.shape
    core = (1 - smoothstep(0.06, 0.28, S)) * (1 - smoothstep(wall * 1.30, wall * 1.60, L))
    lab, n = ndi.label(core > 0.5)
    if n:
        idx = np.arange(1, n + 1)
        area = ndi.sum(np.ones_like(lab), lab, idx)
        mean_l = ndi.mean(L, lab, idx)
        border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
        keep = np.zeros(n + 1, bool)
        keep[1:] = (area >= MIN_AREA * h * w) | ((area >= POCKET_AREA * h * w) & (mean_l <= wall * 1.1))
        keep[border[border > 0]] = True
        big = ndi.binary_dilation(keep[lab], iterations=2)
    else:
        big = np.zeros_like(core, bool)
    core = core * big
    # the pixels on the edge of the wall are a mix of wall and hair/skin: they get the wall treatment too (about 3 px), or a light fringe stays
    return np.clip(ndi.gaussian_filter(ndi.maximum_filter(core, size=5), 1.0), 0, 1)


def grade(img, idx):
    a = np.asarray(img.convert("RGB")).astype(np.float64) / 255
    h, w, _ = a.shape
    L = luma(a)
    mx, mn = a.max(-1), a.min(-1)
    S = (mx - mn) / np.maximum(mx, 1e-4)
    y0, y1, x0, x1 = PATCH[idx]
    wall = L[int(h * y0):int(h * y1), int(w * x0):int(w * x1)].mean()
    wn = wall_weight(L, S, wall)
    mbg = WALL_TARGET / wall                 # multiplier that sends this photo's wall to WALL_TARGET
    neutral = gradient_map(np.clip(L * mbg, 0, 1))
    skin = np.clip(a * SKIN_GAIN[idx] * SKIN_WARM, 0, 1)
    out = wn[..., None] * neutral + (1 - wn[..., None]) * skin
    return Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)), wall, mbg


if __name__ == "__main__":
    out_dir = sys.argv[1] if len(sys.argv) > 1 else SRC
    os.makedirs(out_dir, exist_ok=True)
    for i in (1, 2, 3):
        src = os.path.join(SRC, "curtain-sel-%d.webp" % i)
        original = Image.open(src)
        g, wall, mbg = grade(original, i)
        dst = os.path.join(out_dir, "curtain-sel-%d-warm.webp" % i)
        g.save(dst, "WEBP", quality=88, method=6)
        mean_before = luma(np.asarray(original.convert("RGB")).astype(float)).mean()
        mean_after = luma(np.asarray(g).astype(float)).mean()
        print("sel-%d: wall luma %.3f (x%.2f), mean luma %.0f -> %.0f, %s (%d KB)" % (
            i, wall, mbg, mean_before, mean_after, os.path.basename(dst), os.path.getsize(dst) // 1024))
