"""Web versions of the "Quem sou eu" portrait (assets/quesoueu/Quem sou eu.png -> quem-sou-eu-480.webp and quem-sou-eu-960.webp).

The photo is high-key and soft: its highlights stop at luma ~233 of 255, its blacks sit up at ~12 and its local contrast is low, so on the page
it reads as if a veil lay over it. Here, at full size and before any scaling:
  1. levels: the same black and white point for the three channels (the white point goes to WHITE_OUT, a little below 255, so the cream clothes do not clip);
  2. a light S-curve whose pivot is the photo's own median, so the photo gets neither lighter nor darker, only less flat; it works on the
     luminance and puts the same factor on R, G and B, so hue and saturation of the skin stay where they were;
  3. a wide, weak unsharp mask (clarity) for the local contrast. (Saturation is left as it is: the curve already deepens the colours, and any boost turns the skin orange.)
After scaling, each size gets its own small unsharp mask, so the scaled photo is as crisp as the original.

The PNG is never touched. Run again after changing the photo, or any constant below:
    python -I tools/prep-quem-sou-eu.py [out_dir]        (default out_dir: assets/quesoueu)
The sizes (480 and 960 px wide) are the ones the srcset of the "Quem está à frente" block asks for (overview/index.html, overview/tratamento.html,
design-sistem-napele.html). Needs Pillow and numpy.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, 'assets', 'quesoueu', 'Quem sou eu.png')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets', 'quesoueu')

BLACK_PCT, WHITE_PCT = 0.3, 99.9    # percentiles of luma that become BLACK_OUT and WHITE_OUT
BLACK_OUT, WHITE_OUT = 0.012, 0.96  # (0..1)
CURVE = 1.12                        # strength of the S-curve around the median (1 = none; 1.26 is already heavy: it dulls the eyes)
CLARITY_R = 0.03                    # radius of the wide unsharp, as a fraction of the longest side
CLARITY_PCT = 16                    # and its strength (percent)
SATURATION = 1.0                     # no boost: the curve already makes the colours deeper
SHARPEN = {480: (0.7, 55), 960: (1.1, 55)}     # width -> (radius, percent) of the unsharp after scaling
QUALITY = 90

LUMA = np.array([0.299, 0.587, 0.114], dtype=np.float32)


def grade(im):
    a = np.asarray(im, dtype=np.float32) / 255
    luma = a @ LUMA
    lo, hi = np.percentile(luma, BLACK_PCT), np.percentile(luma, WHITE_PCT)
    x = np.clip((a - lo) / (hi - lo), 0, 1)
    luma = x @ LUMA
    p = float(np.median(luma))
    curved = np.where(luma < p,
                      p * (np.clip(luma, 1e-4, None) / p) ** CURVE,
                      1 - (1 - p) * ((1 - luma) / (1 - p)) ** CURVE)
    x = np.clip(x * (curved / np.clip(luma, 1e-3, None))[..., None], 0, 1)
    x = BLACK_OUT + x * (WHITE_OUT - BLACK_OUT)
    out = Image.fromarray(np.clip(x * 255, 0, 255).astype(np.uint8), 'RGB')
    out = out.filter(ImageFilter.UnsharpMask(radius=CLARITY_R * max(out.size), percent=CLARITY_PCT, threshold=0))
    return ImageEnhance.Color(out).enhance(SATURATION)


def main():
    graded = grade(Image.open(SRC).convert('RGB'))
    for w in (480, 960):
        h = round(graded.size[1] * w / graded.size[0])
        radius, percent = SHARPEN[w]
        small = graded.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=2))
        path = os.path.join(OUT, 'quem-sou-eu-%d.webp' % w)
        small.save(path, 'WEBP', quality=QUALITY, method=6)
        print(path, small.size, os.path.getsize(path) // 1024, 'KB')


if __name__ == '__main__':
    main()
