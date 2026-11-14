"""Web versions of the preloader photos (assets/hero/curtains/*.png -> *.webp).

The preloader (assets/napele-preloader.js) loads the counter backdrop and the three photo curtains while the number counts, and paints each one
into a canvas. The PNGs it is fed from are 1.5-8 MB; these WebP files are what the page actually loads.

    bgpreloader-nayana.webp (the counter backdrop) is NOT made here: it is a byte-for-byte copy of assets/NayanaBgfundopreloader.webp (3840x2160, already
    a web file). Re-encoding it would only lose detail, and the 6688x3764 BgNayanaPreloader.webp next to it was tried and dropped: it is an upscaled,
    smoothed version of the same photo (0.09 bits/px: plastic skin, no lashes or hair strands), measurably softer at any size.
    ImagemCortina1.png      (3840x2160) -> curtain-mural-1.webp      2560x1440: sharp up to a 2560 px window at 1x, the canvas it is painted
    ImagemCortina2.png      (3840x2160) -> curtain-mural-2.webp      into is the size of the window times the pixel ratio (max 2), so
    ImagemCortina3.png      (3840x2160) -> curtain-mural-3.webp      anything beyond this only costs decode time and GPU memory

The PNGs are never touched (they are the sources). Run again after replacing a PNG:
    python -I tools/prep-preloader-images.py [out_dir]        (default out_dir: assets/hero/curtains)
Needs Pillow. The photos' order and file names live in assets/napele-preloader.js (PHOTOS, BACKDROP).
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "assets", "hero", "curtains")

JOBS = [
    # source png, output webp, max width (None = keep the source size)
    ("ImagemCortina1.png", "curtain-mural-1.webp", 2560),
    ("ImagemCortina2.png", "curtain-mural-2.webp", 2560),
    ("ImagemCortina3.png", "curtain-mural-3.webp", 2560),
]
QUALITY = 86    # dark photos with grain: lower than this shows banding in the shadows


if __name__ == "__main__":
    out_dir = sys.argv[1] if len(sys.argv) > 1 else SRC
    os.makedirs(out_dir, exist_ok=True)
    for src_name, dst_name, max_w in JOBS:
        src = os.path.join(SRC, src_name)
        if not os.path.exists(src):    # the curtain photos are not in the folder any more; the backdrop is the one the page needs
            print("%s not found, skipped" % src_name)
            continue
        im = Image.open(src).convert("RGB")
        w, h = im.size
        if max_w and w > max_w:
            im = im.resize((max_w, round(h * max_w / w)), Image.LANCZOS)
        dst = os.path.join(out_dir, dst_name)
        im.save(dst, "WEBP", quality=QUALITY, method=6)
        print("%s %dx%d (%d KB) -> %s %dx%d (%d KB)" % (
            src_name, w, h, os.path.getsize(src) // 1024, dst_name, im.size[0], im.size[1], os.path.getsize(dst) // 1024))
