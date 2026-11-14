"""Web versions of the two photos under the "Quem sou" block (the "Sempre em evolução" pair of the Overview):
    assets/quesoueu/Igor Alves  (1).jpg   -> igor-alves-480.webp / igor-alves-960.webp         (Igor Alves, Nayana's mentor, with her)
    assets/quesoueu/Nayna Exposição.jpg   -> nayana-evento-480.webp / nayana-evento-960.webp   (Nayana at an industry event)

Both are phone photos, 3072 x 4096 (3:4). They are not cropped: the block shows them at 3:4, so the whole frame is kept. Unlike the "Quem sou eu"
portrait they get no grading (they are lively, well-exposed shots); only the scaling and a small unsharp mask per size, so the scaled photo is as
crisp as the original. The JPEGs are never touched. Run again after changing a photo, or any constant below:
    python -I tools/prep-quem-sou-evolucao.py [out_dir]        (default out_dir: assets/quesoueu)
The sizes (480 and 960 px wide) are the ones the srcset of the pair asks for (overview/index.html). Needs Pillow.
"""
import os
import sys

from PIL import Image, ImageOps, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC_DIR = os.path.join(ROOT, 'assets', 'quesoueu')
OUT = sys.argv[1] if len(sys.argv) > 1 else SRC_DIR

PHOTOS = {                                   # source file -> output name
    'Igor Alves  (1).jpg': 'igor-alves',
    'Nayna Exposição.jpg': 'nayana-evento',
}
SHARPEN = {480: (0.7, 55), 960: (1.1, 55)}   # width -> (radius, percent) of the unsharp after scaling
QUALITY = 88


def main():
    for src, name in PHOTOS.items():
        im = ImageOps.exif_transpose(Image.open(os.path.join(SRC_DIR, src))).convert('RGB')
        for w in (480, 960):
            h = round(im.size[1] * w / im.size[0])
            radius, percent = SHARPEN[w]
            small = im.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=2))
            path = os.path.join(OUT, '%s-%d.webp' % (name, w))
            small.save(path, 'WEBP', quality=QUALITY, method=6)
            print(path, small.size, os.path.getsize(path) // 1024, 'KB')


if __name__ == '__main__':
    main()
