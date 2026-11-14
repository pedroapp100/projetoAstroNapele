"""Web versions of the "Protocolo Full Face Fialho" photos (assets/results/*.webp -> assets/fullface/*.webp).

Three crops of two result photos that the Results section already holds (each source is a before/after pair, 6400 px wide, two halves side by side):
  protocolo-{480,960}.webp  4:5, the right half ("depois") of "Clinica harmonizacao protocolp full face.webp": the photo of the section's first block
  antes-{480,960}.webp      3:4, the left half of "Full Face Anapolis.webp":  the left card of the section's second block
  depois-{480,960}.webp     3:4, the right half of the same photo:            the right card
The sources are never touched. Run again after changing a crop box or a constant below:
    python -I tools/prep-full-face.py [out_dir]        (default out_dir: assets/fullface)
The sizes (480 and 960 px wide) are the ones the srcset of the "Protocolo Full Face Fialho" block asks for (overview/index.html). Needs Pillow.
"""
import os
import sys

from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC_DIR = os.path.join(ROOT, 'assets', 'results')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets', 'fullface')

PAIR_PROFILE = 'Clínica harmonização protocolp full face.webp'   # 6400 x 5408: two halves of 3200 x 5408
PAIR_FRONT = 'Full Face Anapolis.webp'                            # 6400 x 4720: two halves of 3200 x 4720

# name -> (source, (left, top, right, bottom) in source pixels, aspect w:h). The boxes keep the whole width of a half and cut the height to the
# aspect; TOP is where the box starts, chosen so the face sits with the eyes in the upper third and neither forehead nor chin is cut.
TOP = 250
CROPS = {
    'protocolo': (PAIR_PROFILE, (3200, TOP, 6400, TOP + 4000), (4, 5)),
    'antes': (PAIR_FRONT, (0, TOP, 3200, TOP + 4267), (3, 4)),
    'depois': (PAIR_FRONT, (3200, TOP, 6400, TOP + 4267), (3, 4)),
}
WIDTHS = (480, 960)
SHARPEN = {480: (0.7, 55), 960: (1.1, 55)}     # width -> (radius, percent) of the unsharp after scaling
QUALITY = 88


def main():
    os.makedirs(OUT, exist_ok=True)
    cache = {}
    for name, (src, box, (aw, ah)) in CROPS.items():
        if src not in cache:
            cache[src] = Image.open(os.path.join(SRC_DIR, src)).convert('RGB')
        crop = cache[src].crop(box)
        for w in WIDTHS:
            h = round(w * ah / aw)
            radius, percent = SHARPEN[w]
            im = crop.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=2))
            out = os.path.join(OUT, f'{name}-{w}.webp')
            im.save(out, 'WEBP', quality=QUALITY, method=6)
            print(f'{name}-{w}.webp  {w}x{h}  {os.path.getsize(out) // 1024} KB')


if __name__ == '__main__':
    main()
