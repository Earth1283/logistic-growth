import json
import math
import os
import subprocess
import sys
from functools import lru_cache
from multiprocessing import Pool
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).parent
FONTS = HERE / 'fonts'
W, H = 1920, 1080
FPS = 60

GROUND = (238, 241, 244)
INK = (25, 32, 43)
MUTED = (90, 100, 116)
ACCENT = (29, 95, 166)
ROSE = (194, 59, 94)

SHOT_W, SHOT_H = 2880, 1800
BAR = 72
WIN_W = 1480
K = WIN_W / SHOT_W
WIN_H = (SHOT_H + BAR) * K
WIN_X = (W - WIN_W) / 2
WIN_Y = (H - WIN_H) / 2
SHOT_Y = WIN_Y + BAR * K
RADIUS = 28
URL_TEXT = 'earth1283.github.io/logistic-growth'


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


def ease_out(t):
    t = min(max(t, 0.0), 1.0)
    return 1 - (1 - t) ** 3


def ease_in_out(t):
    t = min(max(t, 0.0), 1.0)
    return 4 * t**3 if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def background(shadowed=True):
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    img = np.empty((H, W, 3), np.float32)
    img[:] = GROUND
    for cx, cy, r, color, strength in [
        (W * 0.12, H * 0.05, 900, ACCENT, 0.28),
        (W * 0.92, H * 1.0, 1000, ROSE, 0.2),
        (W * 0.75, H * 0.1, 700, (111, 95, 158), 0.12),
    ]:
        a = np.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * (r / 1.6) ** 2))[..., None] * strength
        img = img * (1 - a) + np.array(color, np.float32) * a
    if not shadowed:
        return grain(img)
    shadow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(shadow).rounded_rectangle(
        (WIN_X, WIN_Y + 22, WIN_X + WIN_W, WIN_Y + WIN_H + 22), radius=RADIUS * K, fill=120
    )
    shadow = np.asarray(shadow.filter(ImageFilter.GaussianBlur(34)), np.float32)[..., None] / 255
    img = img * (1 - shadow * 0.55) + np.array((17, 22, 33), np.float32) * shadow * 0.55
    return grain(img)


def grain(img):
    rng = np.random.default_rng(7)
    img = img + rng.normal(0, 1.4, img.shape)
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


def chrome_bar(dark):
    bar = Image.new('RGB', (SHOT_W, BAR), (33, 37, 46) if dark else (246, 247, 249))
    d = ImageDraw.Draw(bar)
    for i, c in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]):
        cx = 44 + i * 40
        d.ellipse((cx - 12, BAR / 2 - 12, cx + 12, BAR / 2 + 12), fill=c)
    pill_w = 900
    px = (SHOT_W - pill_w) / 2
    d.rounded_rectangle((px, 14, px + pill_w, BAR - 14), radius=22, fill=(22, 25, 32) if dark else (232, 235, 239))
    f = font('Hanken-Medium.ttf', 26)
    d.text((SHOT_W / 2, BAR / 2), URL_TEXT, font=f, anchor='mm', fill=(160, 168, 182) if dark else MUTED)
    d.line((0, BAR - 1, SHOT_W, BAR - 1), fill=(20, 22, 28) if dark else (220, 225, 231), width=2)
    return bar


def window_mask():
    m = Image.new('L', (SHOT_W, SHOT_H + BAR), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, SHOT_W - 1, SHOT_H + BAR - 1), radius=RADIUS, fill=255)
    return m


def spring(targets, omega):
    out = []
    x = np.array(targets[0], float)
    v = np.zeros_like(x)
    dt = 1 / FPS / 4
    for tgt in targets:
        tgt = np.array(tgt, float)
        for _ in range(4):
            a = omega**2 * (tgt - x) - 2 * omega * v
            v += a * dt
            x += v * dt
        out.append(x.copy())
    return out


def clamp_axis(c, half, lo, hi):
    if hi - lo <= 2 * half:
        return (lo + hi) / 2
    return min(max(c, lo + half), hi - half)


def camera_target(cam):
    if not cam:
        return (W / 2, H / 2, 0.0)
    s = 2 * K
    x, y = WIN_X + cam['x'] * s, SHOT_Y + cam['y'] * s
    w, h = cam['width'] * s, cam['height'] * s
    pad = cam['pad'] * s
    z = min(W / (w + 2 * pad), H / (h + 2 * pad))
    z = min(max(z, 1.0), cam['maxZoom'])
    cx = clamp_axis(x + w / 2, W / z / 2, WIN_X, WIN_X + WIN_W)
    cy = clamp_axis(y + h / 2, H / z / 2, WIN_Y, WIN_Y + WIN_H)
    return (cx, cy, math.log(z))


def to_output(px, py, cam):
    cx, cy, z = cam
    return ((px - cx) * z + W / 2, (py - cy) * z + H / 2)


class Captions:
    PAD_X, PAD_Y, MARGIN = 26, 18, 44
    EYEBROW, MAIN = 15, 31
    CORNERS = ['bl', 'br', 'tl', 'tr']

    def __init__(self, events, cursor_out, total):
        self.eyebrow_font = font('Hanken-SemiBold.ttf', self.EYEBROW * 2)
        self.main_font = font('STIX-SemiBold.ttf', self.MAIN * 2)
        caps = [e for e in events if e['type'] == 'caption']
        self.spans = []
        for i, e in enumerate(caps):
            end = caps[i + 1]['frame'] if i + 1 < len(caps) else total
            if e['text'] is None:
                self.spans.append(dict(start=e['frame'], end=end, hidden=True))
                continue
            size = self.card_size(e['eyebrow'], e['text'])
            corner = self.pick_corner(size, cursor_out[e['frame']:end])
            self.spans.append(dict(start=e['frame'], end=end, hidden=False, eyebrow=e['eyebrow'], text=e['text'], size=size, corner=corner))

    def tracked_width(self, text):
        return sum(self.eyebrow_font.getlength(ch) + 3 for ch in text) - 3

    def card_size(self, eyebrow, text):
        tw = max(self.tracked_width(eyebrow.upper()) / 2, self.main_font.getlength(text) / 2)
        return (round(tw + 2 * self.PAD_X), self.PAD_Y * 2 + self.EYEBROW + 10 + self.MAIN + 6)

    def origin(self, corner, size):
        w, h = size
        x = self.MARGIN if corner[1] == 'l' else W - self.MARGIN - w
        y = self.MARGIN if corner[0] == 't' else H - self.MARGIN - h
        return x, y

    def pick_corner(self, size, cursor):
        def hits(corner):
            x, y = self.origin(corner, size)
            return sum(1 for cx, cy in cursor if x - 60 < cx < x + size[0] + 60 and y - 60 < cy < y + size[1] + 60)

        return min(self.CORNERS, key=lambda c: (hits(c), self.CORNERS.index(c)))

    def state(self, f):
        idx = max((i for i, s in enumerate(self.spans) if s['start'] <= f), default=None)
        if idx is None:
            return None
        cur = self.spans[idx]
        prev = self.spans[idx - 1] if idx > 0 else None
        t = (f - cur['start']) / FPS
        if cur['hidden']:
            if not prev or prev['hidden'] or t > 0.35:
                return None
            return dict(span=prev, t=10.0, exit=t / 0.35, prev=None)
        joined = prev and not prev['hidden'] and prev['corner'] == cur['corner'] and t < 0.6
        return dict(span=cur, t=t, exit=0.0, prev=prev if joined else None)

    def draw_eyebrow(self, mask, x0, y0, text, alpha, dx=0.0, dy=0.0):
        if alpha <= 0.004:
            return
        d = ImageDraw.Draw(mask)
        x = (x0 + self.PAD_X + dx) * 2
        for ch in text.upper():
            d.text((x, (y0 + self.PAD_Y + dy) * 2), ch, font=self.eyebrow_font, fill=int(255 * alpha))
            x += self.eyebrow_font.getlength(ch) + 3

    def draw_words(self, mask, x0, y0, text, enter=None, leave=None):
        d = ImageDraw.Draw(mask)
        x = (x0 + self.PAD_X) * 2
        y = (y0 + self.PAD_Y + self.EYEBROW + 10) * 2
        space = self.main_font.getlength(' ')
        for i, word in enumerate(text.split(' ')):
            if leave is not None:
                p = ease_out((leave - i * 0.015) / 0.18)
                a, dy = 1 - p, -10 * p
            else:
                p = ease_out((enter - 0.08 - i * 0.045) / 0.42)
                a, dy = p, 14 * (1 - p)
            if a > 0.004:
                d.text((x, y + dy * 2), word, font=self.main_font, fill=int(255 * a))
            x += self.main_font.getlength(word) + space

    def render(self, frame, f):
        st = self.state(f)
        if not st:
            return frame
        span, t, prev = st['span'], st['t'], st['prev']
        size = span['size']
        if prev:
            p = ease_in_out(t / 0.45)
            size = tuple(round(a + (b - a) * p) for a, b in zip(prev['size'], span['size']))
        appear = 1.0 if prev else ease_out(t / 0.4)
        alpha = appear * (1 - ease_out(st['exit']))
        if alpha <= 0.003:
            return frame
        corner = span['corner']
        x0, y0 = self.origin(corner, size)
        slide = (12 if corner[0] == 'b' else -12) * (1 - appear + ease_out(st['exit']))
        y0 += slide

        box = (int(x0) - 40, int(y0) - 40, int(x0 + size[0]) + 40, int(y0 + size[1]) + 60)
        region = frame.crop(box)
        rw, rh = region.size
        lx, ly = x0 - box[0], y0 - box[1]

        shape = Image.new('L', (rw * 2, rh * 2), 0)
        ImageDraw.Draw(shape).rounded_rectangle((lx * 2, ly * 2, (lx + size[0]) * 2, (ly + size[1]) * 2), radius=32, fill=255)
        shape = shape.resize((rw, rh), Image.LANCZOS)

        shadow = shape.filter(ImageFilter.GaussianBlur(14))
        shadow = Image.fromarray((np.asarray(shadow, np.float32) * 0.22 * alpha).astype(np.uint8))
        shadow_offset = Image.new('L', (rw, rh), 0)
        shadow_offset.paste(shadow, (0, 6))
        out = Image.composite(Image.new('RGB', (rw, rh), (17, 22, 33)), region, shadow_offset)

        glass = region.filter(ImageFilter.GaussianBlur(16))
        glass = Image.blend(glass, Image.new('RGB', (rw, rh), (252, 253, 254)), 0.74)
        out = Image.composite(glass, out, Image.fromarray((np.asarray(shape, np.float32) * alpha).astype(np.uint8)))
        edge = Image.new('L', (rw, rh), 0)
        ImageDraw.Draw(edge).rounded_rectangle((lx, ly, lx + size[0], ly + size[1]), radius=16, outline=int(60 * alpha), width=1)
        out = Image.composite(Image.new('RGB', (rw, rh), (160, 170, 185)), out, edge)

        ink = Image.new('L', (rw * 2, rh * 2), 0)
        acc = Image.new('L', (rw * 2, rh * 2), 0)
        if prev:
            if t < 0.2:
                self.draw_words(ink, lx, ly, prev['text'], leave=t)
            self.draw_words(ink, lx, ly, span['text'], enter=t - 0.14)
            if prev['eyebrow'] == span['eyebrow']:
                self.draw_eyebrow(acc, lx, ly, span['eyebrow'], 1.0)
            else:
                p = ease_out(t / 0.18)
                self.draw_eyebrow(acc, lx, ly, prev['eyebrow'], 1 - p, dy=-6 * p)
                q = ease_out((t - 0.14) / 0.45)
                self.draw_eyebrow(acc, lx, ly, span['eyebrow'], q, dx=-10 * (1 - q))
        else:
            q = ease_out(t / 0.45)
            self.draw_eyebrow(acc, lx, ly, span['eyebrow'], q, dx=-10 * (1 - q))
            self.draw_words(ink, lx, ly, span['text'], enter=t)
        clip = np.asarray(shape, np.float32) / 255 * alpha
        for mask, color in ((ink, INK), (acc, ACCENT)):
            m = np.asarray(mask.resize((rw, rh), Image.LANCZOS), np.float32) * clip
            out = Image.composite(Image.new('RGB', (rw, rh), color), out, Image.fromarray(m.astype(np.uint8)))
        frame.paste(out, box[:2])
        return frame


def draw_cursor(frame, x, y, scale, press, ripples):
    r = 11 * scale
    size = int(r * 8 + 20)
    ox, oy = int(x) - size // 2, int(y) - size // 2
    fx, fy = x - ox, y - oy
    ss = 4
    layer = Image.new('RGBA', (size * ss, size * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for age in ripples:
        p = ease_out(age / 0.55)
        rr = r * (1.2 + 2.4 * p) * ss
        a = int(170 * (1 - p))
        d.ellipse(((fx * ss - rr), (fy * ss - rr), (fx * ss + rr), (fy * ss + rr)), outline=ACCENT + (a,), width=int(3 * ss))
    layer = layer.resize((size, size), Image.LANCZOS)

    shadow = Image.new('L', (size, size), 0)
    rs = r * press
    ImageDraw.Draw(shadow).ellipse((fx - rs, fy - rs + 3, fx + rs, fy + rs + 3), fill=110)
    shadow = shadow.filter(ImageFilter.GaussianBlur(5))
    region = frame.crop((ox, oy, ox + size, oy + size)).convert('RGBA')
    region = Image.composite(Image.new('RGBA', (size, size), (0, 0, 0, 255)), region, shadow)

    dot = Image.new('RGBA', (size * ss, size * ss), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dot)
    ring = (rs + 2.6) * ss
    dd.ellipse((fx * ss - ring, fy * ss - ring, fx * ss + ring, fy * ss + ring), fill=(255, 255, 255, 255))
    core = rs * ss
    dd.ellipse((fx * ss - core, fy * ss - core, fx * ss + core, fy * ss + core), fill=INK + (235,))
    dot = dot.resize((size, size), Image.LANCZOS)
    region = Image.alpha_composite(region, layer)
    region = Image.alpha_composite(region, dot)
    frame.paste(region.convert('RGB'), (ox, oy))
    return frame


def paste_window(frame, shot, bar, mask, cam):
    cx, cy, z = cam
    sc = K * z
    left, top = to_output(WIN_X, WIN_Y, cam)
    right, bottom = left + SHOT_W * sc, top + (SHOT_H + BAR) * sc
    dx0, dy0 = max(0, math.ceil(left)), max(0, math.ceil(top))
    dx1, dy1 = min(W, math.floor(right)), min(H, math.floor(bottom))
    src = (
        max(0.0, (dx0 - left) / sc),
        max(0.0, (dy0 - top) / sc),
        min(SHOT_W, (dx1 - left) / sc),
        min(SHOT_H + BAR, (dy1 - top) / sc),
    )
    size = (dx1 - dx0, dy1 - dy0)
    full = Image.new('RGB', (SHOT_W, SHOT_H + BAR))
    full.paste(bar, (0, 0))
    full.paste(shot, (0, BAR))
    img = full.resize(size, Image.LANCZOS, box=src, reducing_gap=None)
    if left > -1 or top > -1 or right < W + 1 or bottom < H + 1:
        m = mask.resize(size, Image.BILINEAR, box=src)
        frame.paste(img, (dx0, dy0), m)
    else:
        frame.paste(img, (dx0, dy0))
    return frame


G = {}


def init_worker(frames_dir, timeline_path):
    G['dir'] = Path(frames_dir)
    G['tl'] = json.loads(Path(timeline_path).read_text())
    G['bg'] = background()
    G['bars'] = {False: chrome_bar(False), True: chrome_bar(True)}
    G['mask'] = window_mask()
    G['plan'] = plan(G['tl'])


def is_dark(shot):
    return np.asarray(shot.resize((32, 20)), np.float32).mean() < 110


def plan(tl):
    frames, events = tl['frames'], tl['events']
    targets = [camera_target(f['cam']) for f in frames]
    cams = [(c[0], c[1], math.exp(c[2])) for c in spring(targets, 5.2)]
    cursor = []
    for f, cam in zip(frames, cams):
        px = WIN_X + f['x'] * 2 * K
        py = SHOT_Y + f['y'] * 2 * K
        cursor.append(to_output(px, py, cam))
    press = [p[0] for p in spring([(0.72 if f['down'] else 1.0,) for f in frames], 30)]
    clicks = [e['frame'] for e in events if e['type'] == 'click']
    return dict(cams=cams, cursor=cursor, press=press, clicks=clicks, captions=Captions(events, cursor, len(frames)))


def render_frame(i):
    p = G['plan']
    cam = p['cams'][i]
    cx, cy, z = cam
    bg = G['bg'].resize((W, H), Image.BILINEAR, box=(cx - W / z / 2, cy - H / z / 2, cx + W / z / 2, cy + H / z / 2))
    shot = Image.open(G['dir'] / f'{i:05d}.jpg').convert('RGB')
    if shot.size != (SHOT_W, SHOT_H):
        shot = shot.resize((SHOT_W, SHOT_H), Image.BICUBIC)
    frame = paste_window(bg, shot, G['bars'][is_dark(shot)], G['mask'], cam)
    x, y = p['cursor'][i]
    if -60 < x < W + 60 and -60 < y < H + 60:
        ripples = [(i - c) / FPS for c in p['clicks'] if 0 <= i - c < 0.55 * FPS]
        frame = draw_cursor(frame, x, y, z**0.35, p['press'][i], ripples)
    frame = p['captions'].render(frame, i)
    return frame.tobytes()


def card_frames(kind, n):
    bg = background(shadowed=False)
    title = font('STIX-SemiBold.ttf', 96 * 2)
    eq = font('STIX-Italic.ttf', 40 * 2)
    small = font('Hanken-Medium.ttf', 26 * 2)
    eyebrow = font('Hanken-SemiBold.ttf', 17 * 2)
    base = 530 if kind == 'intro' else 520
    for i in range(n):
        t = i / FPS
        layers = {c: Image.new('L', (W * 2, H * 2), 0) for c in (INK, ACCENT, MUTED, ROSE)}
        draw = {c: ImageDraw.Draw(m) for c, m in layers.items()}
        words = 'Logistic Growth Lab'.split(' ')
        widths = [title.getlength(w) for w in words]
        gap = title.getlength(' ')
        x = W - (sum(widths) + gap * (len(words) - 1)) / 2
        for j, w in enumerate(words):
            p = ease_out((t - 0.15 - j * 0.09) / 0.7)
            draw[INK].text((x, (base + 26 * (1 - p)) * 2), w, font=title, fill=int(255 * p), anchor='ls')
            x += widths[j] + gap
        p = ease_out((t - 0.7) / 0.6)
        if kind == 'intro':
            text = 'AN ECOLOGY ASSIGNMENT, TAKEN SLIGHTLY TOO FAR'
            ew = sum(eyebrow.getlength(c) + 7 for c in text) - 7
            ex = W - ew / 2
            pe = ease_out((t - 0.05) / 0.6)
            for c in text:
                draw[ACCENT].text((ex, (base - 118 - 10 * (1 - pe)) * 2), c, font=eyebrow, fill=int(255 * pe), anchor='ls')
                ex += eyebrow.getlength(c) + 7
            draw[MUTED].text((W, (base + 46 + 14 * (1 - p)) * 2), 'dN/dt = rN (1 − N/K)', font=eq, fill=int(255 * p), anchor='mt')
            cw, ch, top = 560, 90, base + 140
            left = W / 2 - cw / 2
            draw[ROSE].line([(left * 2, top * 2), ((left + cw) * 2, top * 2)], fill=int(150 * ease_out((t - 0.8) / 0.5)), width=3)
            reveal = ease_in_out((t - 0.9) / 1.3)
            pts = []
            for k in range(int(200 * reveal) + 1):
                u = k / 200
                pts.append(((left + u * cw) * 2, (top + ch - ch / (1 + math.exp(-(u - 0.45) * 11))) * 2))
            if len(pts) > 1:
                draw[ACCENT].line(pts, fill=255, width=7, joint='curve')
        else:
            draw[ACCENT].text((W, (base + 50 + 14 * (1 - p)) * 2), URL_TEXT, font=small, fill=int(255 * p), anchor='mt')
            p2 = ease_out((t - 1.0) / 0.6)
            draw[MUTED].text((W, (base + 100 + 14 * (1 - p2)) * 2), 'The HTML file is 17 lines long. Everything else is React.', font=small, fill=int(255 * p2), anchor='mt')
        frame = bg.copy()
        for color, mask in layers.items():
            frame = Image.composite(Image.new('RGB', (W, H), color), frame, mask.resize((W, H), Image.LANCZOS))
        yield frame.tobytes()


def ffmpeg(path):
    return subprocess.Popen(
        ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
         '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p', str(path)],
        stdin=subprocess.PIPE,
    )


def main():
    work = Path(sys.argv[1])
    frames_dir, timeline = work / 'frames', work / 'timeline.json'
    for kind, seconds in (('intro', 2.8), ('outro', 3.6)):
        enc = ffmpeg(work / f'{kind}.mp4')
        for buf in card_frames(kind, int(seconds * FPS)):
            enc.stdin.write(buf)
        enc.stdin.close()
        enc.wait()
    n = len(json.loads(timeline.read_text())['frames'])
    limit = int(os.environ.get('LIMIT', n))
    start = int(os.environ.get('START', 0))
    enc = ffmpeg(work / 'main.mp4')
    with Pool(os.cpu_count(), initializer=init_worker, initargs=(frames_dir, timeline)) as pool:
        for k, buf in enumerate(pool.imap(render_frame, range(start, min(n, start + limit)), chunksize=4)):
            enc.stdin.write(buf)
            if k % 300 == 0:
                print(f'frame {start + k}/{n}', flush=True)
    enc.stdin.close()
    enc.wait()


if __name__ == '__main__':
    main()
