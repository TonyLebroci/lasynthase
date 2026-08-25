#!/usr/bin/env python3
"""Convertit une photo de medias-sources/ en AVIF + WebP dans public/images/.

Usage :  python3 outils/convertir-images.py medias-sources/ma-photo.jpg 1400

Le second argument (largeur max, en pixels) est optionnel — 1400 par défaut.
Repères utilisés pour le site : 1920 pour les photos plein écran du diaporama,
1600 pour les grandes images de section, 900 pour les portraits du carrousel.

Le script affiche les dimensions finales à recopier dans les attributs
width= et height= de la balise <img>.
"""
import sys, os
from PIL import Image

if len(sys.argv) < 2:
    sys.exit(__doc__)

source = sys.argv[1]
largeur = int(sys.argv[2]) if len(sys.argv) > 2 else 1400
sortie = "public/images"

im = Image.open(source)
if im.mode in ("RGBA", "P", "LA"):
    im = im.convert("RGB")
if im.width > largeur:
    im = im.resize((largeur, round(im.height * largeur / im.width)), Image.LANCZOS)

base = os.path.splitext(os.path.basename(source))[0]
os.makedirs(sortie, exist_ok=True)
im.save(f"{sortie}/{base}.avif", "AVIF", quality=60)
im.save(f"{sortie}/{base}.webp", "WEBP", quality=82, method=6)

a = os.path.getsize(f"{sortie}/{base}.avif") / 1024
w = os.path.getsize(f"{sortie}/{base}.webp") / 1024
print(f"{base}.avif : {a:.0f} Ko")
print(f"{base}.webp : {w:.0f} Ko")
print(f"\nÀ recopier dans la balise <img> :  width=\"{im.width}\" height=\"{im.height}\"")
