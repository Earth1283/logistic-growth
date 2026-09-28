import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else 'deck/out/img')
SLIDES = int(sys.argv[2]) if len(sys.argv) > 2 else 30
W, H = 2560, 1440

INK = (14, 13, 20)
SAF = (255, 61, 127)
VIO = (123, 92, 255)
AGAR = (214, 242, 90)
WHITE = (245, 244, 239)


def grain(img, amount=3.0, seed=1):
    a = np.asarray(img, np.float32)
    a += np.random.default_rng(seed).normal(0, amount, a.shape)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def logistic(u, steep=10, mid=0.45):
    return 1 / (1 + math.exp(-(u - mid) * steep))


def grid_bg():
    img = Image.new('RGB', (W, H), INK)
    d = ImageDraw.Draw(img)
    step = W / 13.333 / 5
    for i in range(int(W / step) + 1):
        x = i * step
        d.line([(x, 0), (x, H)], fill=(26, 25, 36) if i % 5 else (34, 33, 48), width=1 if i % 5 else 2)
    for j in range(int(H / step) + 1):
        y = j * step
        d.line([(0, y), (W, y)], fill=(26, 25, 36) if j % 5 else (34, 33, 48), width=1 if j % 5 else 2)
    return grain(img)


def glow_curve(img, color, width, blur, x0, x1, y_low, y_high, steep=9, dashed_k=None):
    layer = Image.new('RGB', img.size, (0, 0, 0))
    d = ImageDraw.Draw(layer)
    pts = [(x0 + (x1 - x0) * k / 400, y_low - (y_low - y_high) * logistic(k / 400, steep)) for k in range(401)]
    d.line(pts, fill=color, width=width, joint='curve')
    halo = layer.filter(ImageFilter.GaussianBlur(blur))
    out = np.asarray(img, np.float32) + np.asarray(halo, np.float32) * 0.9 + np.asarray(layer, np.float32)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def title_bg(x0, k_y, k_from=-40):
    img = grid_bg()
    d = ImageDraw.Draw(img)
    for x in range(k_from, W, 70):
        d.line([(x, k_y), (x + 38, k_y)], fill=SAF, width=5)
    img = glow_curve(img, VIO, 26, 60, x0, W + 200, H + 120, k_y, steep=8)
    img = glow_curve(img, AGAR, 8, 24, x0, W + 200, H + 120, k_y, steep=8)
    return grain(img, 2.5, 2)


def colonies_bg(color, seed):
    rng = np.random.default_rng(seed)
    img = Image.new('RGB', (W, H), color)
    d = ImageDraw.Draw(img)
    shade = tuple(max(0, int(c * 0.88)) for c in color)
    light = tuple(min(255, int(c + (255 - c) * 0.22)) for c in color)
    for _ in range(16):
        cx, cy = rng.uniform(0, W), rng.uniform(0, H)
        spread = rng.uniform(40, 260)
        for _ in range(int(rng.uniform(20, 140))):
            x, y = rng.normal(cx, spread), rng.normal(cy, spread)
            r = abs(rng.normal(9, 7)) + 3
            d.ellipse((x - r, y - r, x + r, y + r), fill=shade if rng.random() < 0.75 else light)
    ring = Image.new('L', (W, H), 0)
    ImageDraw.Draw(ring).ellipse((W * 0.52, -H * 0.35, W * 1.35, H * 1.1), outline=255, width=14)
    ring = ring.filter(ImageFilter.GaussianBlur(1.2))
    img = Image.composite(Image.new('RGB', (W, H), shade), img, ring)
    return grain(img, 3.5, seed)


def motif(i, n, dark=True):
    w, h, pad = 520, 170, 18
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    line = (245, 244, 239, 90) if dark else (14, 13, 20, 90)
    k = (255, 61, 127, 200) if dark else (14, 13, 20, 200)
    for x in range(pad, w - pad, 22):
        d.line([(x, pad), (x + 11, pad)], fill=k, width=3)
    curve = lambda u: (pad + u * (w - 2 * pad), h - pad - (h - 2 * pad) * (logistic(u, 11, 0.45) - logistic(0, 11, 0.45)) / (1 - logistic(0, 11, 0.45)))
    d.line([curve(s / 200) for s in range(201)], fill=line, width=4, joint='curve')
    u = i / max(1, n - 1)
    d.line([curve(s / 200) for s in range(int(200 * u) + 1)] or [curve(0)] * 2, fill=(214, 242, 90, 255) if dark else (14, 13, 20, 255), width=6, joint='curve')
    x, y = curve(u)
    d.ellipse((x - 11, y - 11, x + 11, y + 11), fill=(214, 242, 90, 255) if dark else (14, 13, 20, 255))
    return img


OUT.mkdir(parents=True, exist_ok=True)
grid_bg().save(OUT / 'bg_grid.jpg', quality=90)
title_bg(W * 0.4, 330).save(OUT / 'bg_title.jpg', quality=92)
title_bg(W * 0.56, H * 0.56, int(W * 0.56)).save(OUT / 'bg_end.jpg', quality=92)
for name, color, seed in (('saf', SAF, 3), ('vio', VIO, 5), ('agar', AGAR, 7), ('ink', (24, 22, 34), 9)):
    colonies_bg(color, seed).save(OUT / f'bg_colonies_{name}.jpg', quality=90)
for i in range(SLIDES):
    motif(i, SLIDES, True).save(OUT / f'motif_{i:02d}.png')
    motif(i, SLIDES, False).save(OUT / f'motif_light_{i:02d}.png')
print('art written to', OUT)
for tab in ('scenarios', 'basics', 'realism', 'disturb'):
    src = OUT / f'tab_{tab}.png'
    if src.exists():
        im = Image.open(src)
        im.crop((0, 0, im.width, min(im.height, round(im.width * 3.63 / 2.63)))).save(OUT / f'tab_{tab}_crop.png')
