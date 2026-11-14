"""Web versions of the clinic photos of the gallery (FlowFrames/*.png -> assets/clinica/galeria/<name>.webp and <name>-lg.webp).

The photo grid of "A clínica" (.np-clinic__grid, desktop) and its lightbox (napele-clinic-gallery.js) use the stills of FlowFrames/: 1664 x 936 (16:9, the
shape of the grid's cells, so nothing is cropped), much sharper than the old 540-760 px crops. Each photo gets two files:
    <name>.webp      960 x 540   the cell of the grid (a cell is ~370 px wide on a 1440 px screen, ~500 px on the largest, so 960 holds a 2x screen)
    <name>-lg.webp   1664 x 936  the lightbox, at the full size of the still; fetched only when a photo is opened (or its neighbour is)
The ninth photo of the lightbox, the centre card, shows the tour's poster in the grid (it must match the first frame of the video) and 00-inicio in the
lightbox: that one only gets the large file.

Not used: 02-letreiro-arvore (the close-up of the sign reads "CLINICA", without the accent of "CLÍNICA": check the signs in a still before using it; 03, 01 and
the rest were checked), 04b-ponte-vidro-preto (a different size, 1920 x 1080, and a close cousin of 05) and the two copies, 10-corredor-final = 07-corredor and
11-letreiro-final = 03-letreiro (byte for byte). To use another still, change a line of PHOTOS.

The PNGs are never touched. Run again after changing a still, PHOTOS or the constants below:
    python -I tools/prep-flowframes-galeria.py [out_dir]        (default out_dir: assets/clinica/galeria)
Needs Pillow.
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, 'FlowFrames')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets', 'clinica', 'galeria')

THUMB_W = 960
QUALITY_THUMB = 84
QUALITY_LARGE = 88      # the stills are sharp and detailed (marble, fabric): a little higher than the 82 of the old frames

# output name -> still; the order is the grid's, reading left to right (the tour's card, 00-inicio, is the fifth: large file only)
PHOTOS = [
    ('letreiro', '03-letreiro.png', True),
    ('balcao', '01-recepcao.png', True),
    ('recepcao', '05-mezanino-marmore.png', True),
    ('espera', '06-espera-janela.png', True),
    ('chegada', '00-inicio.png', False),
    ('corredor', '07-corredor.png', True),
    ('sala-1', '08-consultorio-01.png', True),
    ('sala-2', '09-consultorio-02.png', True),
    ('poltronas', '04-balcao-poltronas.png', True),
]

os.makedirs(OUT, exist_ok=True)
for name, still, thumb in PHOTOS:
    im = Image.open(os.path.join(SRC, still)).convert('RGB')
    large = os.path.join(OUT, '%s-lg.webp' % name)
    im.save(large, 'WEBP', quality=QUALITY_LARGE, method=6)
    line = '%-10s %-26s %dx%d  large %d KB' % (name, still, im.width, im.height, os.path.getsize(large) // 1024)
    if thumb:
        small = os.path.join(OUT, '%s.webp' % name)
        im.resize((THUMB_W, round(THUMB_W * im.height / im.width)), Image.LANCZOS).save(small, 'WEBP', quality=QUALITY_THUMB, method=6)
        line += '  grid %d KB' % (os.path.getsize(small) // 1024)
    print(line)
