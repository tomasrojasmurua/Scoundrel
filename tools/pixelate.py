#!/usr/bin/env python3
"""Convierte una imagen realista (p. ej. de ChatGPT) en un sprite pixel art.

Uso:
  python3 tools/pixelate.py imagen.png nombre            # -> assets/sprites/nombre.png
  python3 tools/pixelate.py imagen.png nombre --size 48 --colors 20

Pasos: quita el fondo liso (flood fill desde las esquinas), recorta al
objeto, lo centra en un cuadrado, reduce a SIZE x SIZE con promedio de área,
reduce la paleta a COLORS colores, limpia el canal alfa y añade un contorno
oscuro de 1 px. El juego lo amplía con 'nearest neighbor' (image-rendering:
pixelated), así que el archivo final queda pequeño. También guarda una vista
previa ampliada x8 en assets/originals/<nombre>_preview.png.
"""
import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent


def remove_background(img: Image.Image, tol: int) -> Image.Image:
    """Hace transparente el fondo conectado a los bordes (color parecido a las esquinas)."""
    img = img.convert('RGBA')
    a = np.array(img).astype(np.int32)
    h, w = a.shape[:2]
    if (a[..., 3] < 250).mean() > 0.05:  # ya trae transparencia
        return img
    corners = np.array([a[0, 0, :3], a[0, w - 1, :3], a[h - 1, 0, :3], a[h - 1, w - 1, :3]])
    bg = np.median(corners, axis=0)
    diff = np.abs(a[..., :3] - bg).max(axis=2)
    similar = diff <= tol
    mask = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if similar[y, x] and not mask[y, x]:
                mask[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if similar[y, x] and not mask[y, x]:
                mask[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and not mask[ny, nx] and similar[ny, nx]:
                mask[ny, nx] = True; q.append((ny, nx))
    a[..., 3] = np.where(mask, 0, a[..., 3])
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def crop_square(img: Image.Image, pad_ratio: float) -> Image.Image:
    bbox = img.getchannel('A').point(lambda v: 255 if v > 32 else 0).getbbox()
    if bbox:
        img = img.crop(bbox)
    w, h = img.size
    side = int(max(w, h) * (1 + pad_ratio))
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(img, ((side - w) // 2, (side - h) // 2))
    return sq


def downscale(img: Image.Image, size: int) -> Image.Image:
    # premultiplicar alfa para que el fondo no ensucie los bordes
    a = np.array(img).astype(np.float32) / 255
    a[..., :3] *= a[..., 3:4]
    small = Image.fromarray((a * 255).astype(np.uint8), 'RGBA').resize((size, size), Image.BOX)
    s = np.array(small).astype(np.float32) / 255
    alpha = s[..., 3:4]
    s[..., :3] = np.where(alpha > 0, s[..., :3] / np.maximum(alpha, 1e-6), 0)
    return Image.fromarray((np.clip(s, 0, 1) * 255).astype(np.uint8), 'RGBA')


def quantize(img: Image.Image, colors: int) -> Image.Image:
    a = np.array(img)
    opaque = a[..., 3] >= 128
    rgb = Image.fromarray(a[..., :3])
    # paleta calculada solo con los píxeles visibles
    pix = a[..., :3][opaque].reshape(1, -1, 3)
    pal_src = Image.fromarray(pix if pix.size else a[..., :3].reshape(1, -1, 3))
    pal = pal_src.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, kmeans=3)
    q = rgb.quantize(palette=pal, dither=Image.Dither.NONE).convert('RGB')
    out = np.dstack([np.array(q), np.where(opaque, 255, 0).astype(np.uint8)])
    return Image.fromarray(out, 'RGBA')


def add_outline(img: Image.Image, color=(26, 16, 32)) -> Image.Image:
    a = np.array(img)
    op = a[..., 3] > 0
    grow = np.zeros_like(op)
    grow[1:, :] |= op[:-1, :]; grow[:-1, :] |= op[1:, :]
    grow[:, 1:] |= op[:, :-1]; grow[:, :-1] |= op[:, 1:]
    edge = grow & ~op
    a[edge] = color + (255,)
    return Image.fromarray(a, 'RGBA')


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('input')
    p.add_argument('name', help='nombre del sprite, p. ej. dragon, espada, pocion_l')
    p.add_argument('--size', type=int, default=64, help='lado del sprite en píxeles (64 por defecto)')
    p.add_argument('--colors', type=int, default=32, help='colores de la paleta (32 por defecto)')
    p.add_argument('--tol', type=int, default=40, help='tolerancia para quitar el fondo (0-255)')
    p.add_argument('--saturation', type=float, default=1.25, help='realce de saturación antes de reducir')
    p.add_argument('--contrast', type=float, default=1.15, help='realce de contraste antes de reducir')
    p.add_argument('--sharpen', type=float, default=0.8, help='enfoque tras reducir (0 = nada)')
    p.add_argument('--no-outline', action='store_true')
    args = p.parse_args()

    img = Image.open(args.input)
    img = remove_background(img, args.tol)
    # comer 2 px del borde para quitar el halo claro del fondo
    img.putalpha(img.getchannel('A').filter(ImageFilter.MinFilter(5)))
    img = crop_square(img, 0.08)
    rgb, alpha = img.convert('RGB'), img.getchannel('A')
    rgb = ImageEnhance.Color(rgb).enhance(args.saturation)
    rgb = ImageEnhance.Contrast(rgb).enhance(args.contrast)
    img = Image.merge('RGBA', (*rgb.split(), alpha))
    inner = args.size if args.no_outline else args.size - 2
    small = downscale(img, inner)
    if args.sharpen > 0:
        r, g, b, al = small.split()
        rgb_s = Image.merge('RGB', (r, g, b)).filter(ImageFilter.UnsharpMask(radius=1, percent=int(args.sharpen * 100), threshold=2))
        small = Image.merge('RGBA', (*rgb_s.split(), al))
    small = quantize(small, args.colors)
    if not args.no_outline:
        canvas = Image.new('RGBA', (args.size, args.size), (0, 0, 0, 0))
        canvas.paste(small, (1, 1))
        small = add_outline(canvas)

    out = ROOT / 'assets' / 'sprites' / f'{args.name}.png'
    small.save(out)
    prev = ROOT / 'assets' / 'originals' / f'{args.name}_preview.png'
    small.resize((args.size * 8, args.size * 8), Image.NEAREST).save(prev)
    print(f'sprite: {out.relative_to(ROOT)}  vista previa: {prev.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
