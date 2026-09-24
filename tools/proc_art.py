#!/usr/bin/env python3
"""Procedural crayon-style fallback art. Generates only assets whose AI version is missing in assets/raw."""
import os, math, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW = os.path.join(ROOT, 'assets', 'raw'); IMG = os.path.join(ROOT, 'assets', 'img')
random.seed(3); np.random.seed(3)
INK = (44, 34, 48, 255)

def noise_tex(w, h, streak=True, lo=0.82):
    n = np.random.rand(h, w).astype(np.float32)
    im = Image.fromarray((n * 255).astype(np.uint8))
    if streak: im = im.filter(ImageFilter.BoxBlur((3, 0.6)))
    im = im.filter(ImageFilter.GaussianBlur(0.6))
    big = Image.fromarray((np.random.rand(max(1, h // 24), max(1, w // 24)) * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)
    a = np.array(im).astype(np.float32) / 255; b = np.array(big).astype(np.float32) / 255
    return lo + (1 - lo) * (0.6 * a + 0.4 * b)

class Cr:
    def __init__(self, w, h, bg=None):
        self.w, self.h = w, h; self.im = Image.new('RGBA', (w, h), bg or (0, 0, 0, 0)); self.d = ImageDraw.Draw(self.im)
    def wob(self, pts, jitter=3, sub=3):
        out = []
        n = len(pts)
        for i in range(n):
            a, b = pts[i], pts[(i + 1) % n]
            for k in range(sub):
                t = k / sub; x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t
                out.append((x + random.uniform(-jitter, jitter), y + random.uniform(-jitter, jitter)))
        return out
    def ell_pts(self, cx, cy, rx, ry, n=28, wob=0.05, rot=0):
        pts = []
        ph = random.uniform(0, 6.28)
        for i in range(n):
            a = i / n * 2 * math.pi; r = 1 + wob * math.sin(a * 3 + ph) + wob * 0.6 * math.sin(a * 7 + ph * 2)
            x, y = math.cos(a) * rx * r, math.sin(a) * ry * r
            if rot: x, y = x * math.cos(rot) - y * math.sin(rot), x * math.sin(rot) + y * math.cos(rot)
            pts.append((cx + x, cy + y))
        return pts
    def shape(self, pts, fill, outline=INK, lw=6, jitter=2.5, tex=True, alpha=255):
        layer = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0)); ld = ImageDraw.Draw(layer)
        p = self.wob(pts, jitter, 2) if jitter else pts
        ld.polygon(p, fill=fill[:3] + (alpha,))
        if tex:
            arr = np.array(layer).astype(np.float32); t = noise_tex(self.w, self.h)
            arr[:, :, :3] *= t[:, :, None]
            # crumbly edges: random alpha dropout
            drop = np.random.rand(self.h, self.w) < 0.06; arr[drop, 3] *= 0.5
            layer = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        self.im.alpha_composite(layer)
        if outline: self.stroke(p + [p[0]], outline, lw, jitter)
        return p
    def stroke(self, pts, color=INK, lw=6, jitter=2, passes=2):
        for k in range(passes):
            q = [(x + random.uniform(-jitter, jitter), y + random.uniform(-jitter, jitter)) for x, y in pts]
            col = color[:3] + (int(color[3] * (1 if k == 0 else 0.45)),)
            self.d.line(q, fill=col, width=max(1, int(lw * (1 if k == 0 else 0.7))), joint='curve')
    def ellipse(self, cx, cy, rx, ry, fill, wob=0.06, rot=0, **kw): return self.shape(self.ell_pts(cx, cy, rx, ry, wob=wob, rot=rot), fill, **kw)
    def rect(self, x, y, w, h, fill, **kw): return self.shape([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], fill, **kw)
    def eye(self, cx, cy, r, pupil=None, white=(255, 255, 255, 255), mood='n'):
        self.ellipse(cx, cy, r, r * 1.05, white, lw=3, jitter=1)
        pr = r * 0.55; px, py = cx, cy + r * 0.1
        self.ellipse(px, py, pr, pr, pupil or INK, outline=None, jitter=0.5, tex=False)
        self.ellipse(px - pr * 0.35, py - pr * 0.35, pr * 0.3, pr * 0.3, (255, 255, 255, 255), outline=None, jitter=0, tex=False)
    def dot_eye(self, cx, cy, r): self.ellipse(cx, cy, r, r, INK, outline=None, jitter=0.5, tex=False); self.ellipse(cx - r * 0.3, cy - r * 0.3, r * 0.3, r * 0.3, (255, 255, 255, 255), outline=None, jitter=0, tex=False)
    def mouth(self, cx, cy, w, kind='smile', lw=5):
        if kind == 'smile': self.stroke([(cx - w / 2, cy), (cx - w / 4, cy + w / 5), (cx + w / 4, cy + w / 5), (cx + w / 2, cy)], INK, lw, 1)
        elif kind == 'frown': self.stroke([(cx - w / 2, cy + w / 5), (cx, cy - w / 8), (cx + w / 2, cy + w / 5)], INK, lw, 1)
        elif kind == 'flat': self.stroke([(cx - w / 2, cy), (cx + w / 2, cy)], INK, lw, 1)
        elif kind == 'jag':
            pts = [(cx - w / 2 + i * w / 6, cy + (w / 6 if i % 2 else -w / 8)) for i in range(7)]; self.stroke(pts, INK, lw, 1)
        elif kind == 'o': self.ellipse(cx, cy, w / 5, w / 4, INK, outline=None, jitter=0.5, tex=False)
    def scribble(self, x, y, w, h, color, n=40, lw=4, seg=8, mask=True):
        layer = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0)); ld = ImageDraw.Draw(layer)
        for _ in range(n):
            pts = [(random.uniform(x, x + w), random.uniform(y, y + h))]
            for _ in range(seg): pts.append((min(x + w, max(x, pts[-1][0] + random.uniform(-w / 3, w / 3))), min(y + h, max(y, pts[-1][1] + random.uniform(-h / 3, h / 3)))))
            ld.line(pts, fill=color, width=lw, joint='curve')
        if mask:
            m = Image.new('L', (self.w, self.h), 0); md = ImageDraw.Draw(m); md.polygon(self.ell_pts(x + w / 2, y + h / 2, w / 2 * 1.02, h / 2 * 1.02, wob=0.08), fill=255)
            a = layer.getchannel('A'); layer.putalpha(Image.fromarray(np.minimum(np.array(a), np.array(m))))
        self.im.alpha_composite(layer)
    def spikes(self, cx, cy, r1, r2, n, fill, **kw):
        pts = []
        for i in range(n * 2):
            a = i / (n * 2) * 2 * math.pi; r = r2 if i % 2 else r1; pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
        return self.shape(pts, fill, **kw)
    def blush(self, cx, cy, r): self.ellipse(cx, cy, r, r * 0.7, (255, 150, 160, 120), outline=None, jitter=1, tex=False)
    def grain(self):
        arr = np.array(self.im).astype(np.float32); t = noise_tex(self.w, self.h, lo=0.9); arr[:, :, :3] *= t[:, :, None]
        self.im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)); self.d = ImageDraw.Draw(self.im)
    def save(self, rel, trim=True, height=None):
        path = os.path.join(IMG, rel); os.makedirs(os.path.dirname(path), exist_ok=True)
        im = self.im
        if trim: bb = im.getbbox(); im = im.crop(bb) if bb else im
        if height: im = im.resize((max(1, round(im.width * height / im.height)), height), Image.LANCZOS)
        im.save(path); print('proc', rel, im.size)

def want(rel):  # generate only if there is no AI raw for it
    return not os.path.exists(os.path.join(RAW, rel))
def paste(canvas, name, cx, cy, h, flip=False, alpha=1.0):
    p = os.path.join(IMG, name + '.png')
    if not os.path.exists(p): return
    h = int(h); im = Image.open(p).convert("RGBA"); im = im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)
    if flip: im = ImageOps.mirror(im)
    if alpha < 1: a = im.getchannel('A').point(lambda v: int(v * alpha)); im.putalpha(a)
    canvas.im.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height)))

# ---------------- ENEMIES ----------------
def enemy(name, fn, size=512):
    if not want(f'enemies/{name}.png'): return
    c = Cr(size, size); fn(c, size / 2, size / 2, size); c.grain(); c.save(f'enemies/{name}.png')
def e_scribblebunny(c, cx, cy, s):
    c.scribble(cx - 120, cy - 60, 240, 220, (30, 30, 40, 255), n=90, lw=6)
    c.scribble(cx - 110, cy - 200, 60, 170, (30, 30, 40, 255), n=25, lw=5); c.scribble(cx + 40, cy - 200, 60, 170, (30, 30, 40, 255), n=25, lw=5)
    c.eye(cx - 45, cy, 26); c.eye(cx + 45, cy, 26)
def e_dandelion(c, cx, cy, s):
    c.stroke([(cx, cy + 200), (cx - 10, cy + 80), (cx, cy)], (90, 150, 60, 255), 12, 2)
    c.ellipse(cx - 60, cy + 130, 45, 18, (110, 170, 70, 255), rot=-0.5, lw=4); c.ellipse(cx + 60, cy + 130, 45, 18, (110, 170, 70, 255), rot=0.5, lw=4)
    for i in range(60):
        a = random.uniform(0, 6.28); r = random.uniform(70, 125); c.stroke([(cx, cy - 20), (cx + math.cos(a) * r, cy - 20 + math.sin(a) * r)], (240, 240, 235, 200), 3, 1, 1)
        c.ellipse(cx + math.cos(a) * r, cy - 20 + math.sin(a) * r, 7, 7, (250, 250, 245, 255), outline=None, jitter=0.5, tex=False)
    c.ellipse(cx, cy - 20, 62, 62, (250, 248, 240, 255), lw=4)
    c.dot_eye(cx - 22, cy - 30, 8); c.dot_eye(cx + 22, cy - 30, 8); c.stroke([(cx - 36, cy - 52), (cx - 12, cy - 42)], INK, 5, 1); c.stroke([(cx + 36, cy - 52), (cx + 12, cy - 42)], INK, 5, 1); c.mouth(cx, cy + 4, 40, 'frown')
def e_crayonsnail(c, cx, cy, s):
    c.ellipse(cx + 10, cy + 120, 150, 45, (240, 210, 130, 255), lw=5)
    cols = [(240, 90, 80), (250, 170, 60), (250, 230, 90), (110, 200, 110), (90, 150, 240), (170, 110, 220)]
    for i, r in enumerate(range(120, 20, -18)): c.ellipse(cx + 40, cy + 10, r, r, cols[i % 6] + (255,), lw=5)
    c.ellipse(cx - 110, cy + 60, 60, 45, (250, 225, 150, 255), lw=5)
    c.stroke([(cx - 140, cy + 30), (cx - 160, cy - 30)], INK, 6, 1); c.stroke([(cx - 100, cy + 25), (cx - 90, cy - 35)], INK, 6, 1)
    c.dot_eye(cx - 160, cy - 35, 10); c.dot_eye(cx - 90, cy - 40, 10); c.mouth(cx - 120, cy + 70, 30, 'smile')
def e_boss_scribble(c, cx, cy, s):
    c.scribble(cx - 220, cy - 180, 440, 400, (60, 30, 90, 255), n=200, lw=9); c.scribble(cx - 200, cy - 160, 400, 360, (20, 15, 30, 255), n=160, lw=6)
    for i in range(8): a = i / 8 * 6.28; c.scribble(cx + math.cos(a) * 200 - 40, cy + math.sin(a) * 180 - 40, 100, 100, (20, 15, 30, 255), n=20, lw=7)
    for (x, y, r) in [(-90, -60, 24), (60, -90, 30), (0, 10, 40), (-120, 60, 18), (110, 40, 22), (40, 110, 16), (-40, -130, 14), (130, -30, 12)]: c.eye(cx + x, cy + y, r)
    c.mouth(cx, cy + 150, 200, 'jag', 8)
def e_paperwolf(c, cx, cy, s):
    body = [(cx - 200, cy + 120), (cx - 140, cy - 20), (cx - 60, cy - 60), (cx + 40, cy - 40), (cx + 120, cy - 140), (cx + 200, cy - 60), (cx + 180, cy + 40), (cx + 100, cy + 130), (cx - 100, cy + 140)]
    c.shape(body, (245, 243, 235, 255), lw=6, jitter=1)
    for a, b in [((cx - 60, cy - 60), (cx + 40, cy + 130)), ((cx + 40, cy - 40), (cx + 180, cy + 40)), ((cx - 140, cy - 20), (cx - 100, cy + 140))]: c.stroke([a, b], (150, 150, 160, 200), 3, 1, 1)
    c.ellipse(cx + 130, cy - 50, 9, 9, (230, 40, 40, 255), outline=None, tex=False); c.ellipse(cx + 165, cy - 70, 9, 9, (230, 40, 40, 255), outline=None, tex=False)
    c.mouth(cx + 150, cy + 10, 60, 'jag', 5)
    for i in range(20): x = random.uniform(cx - 180, cx + 60); y = random.uniform(cy - 20, cy + 100); c.stroke([(x, y), (x + 14, y + 10)], (120, 120, 130, 160), 2, 1, 1)
def e_stickbandit(c, cx, cy, s):
    c.ellipse(cx, cy - 130, 55, 55, (255, 255, 255, 255), lw=9)
    c.stroke([(cx, cy - 75), (cx, cy + 70)], INK, 9, 2); c.stroke([(cx, cy + 70), (cx - 60, cy + 190)], INK, 9, 2); c.stroke([(cx, cy + 70), (cx + 60, cy + 190)], INK, 9, 2)
    c.stroke([(cx, cy - 30), (cx - 90, cy + 20)], INK, 9, 2); c.stroke([(cx, cy - 30), (cx + 80, cy - 60)], INK, 9, 2)
    c.rect(cx - 58, cy - 150, 116, 30, (220, 60, 60, 255), lw=4, jitter=1); c.dot_eye(cx - 22, cy - 135, 7); c.dot_eye(cx + 22, cy - 135, 7)
    c.ellipse(cx + 100, cy - 60, 40, 45, (170, 130, 80, 255), lw=5); c.mouth(cx, cy - 100, 40, 'smile')
def e_crumpledowl(c, cx, cy, s):
    c.ellipse(cx, cy + 20, 150, 190, (180, 140, 100, 255), wob=0.12, lw=6, jitter=4)
    for _ in range(30): x = random.uniform(cx - 120, cx + 120); y = random.uniform(cy - 120, cy + 180); c.stroke([(x, y), (x + random.uniform(-40, 40), y + random.uniform(-40, 40))], (120, 90, 60, 150), 3, 2, 1)
    c.spikes(cx - 90, cy - 170, 40, 15, 3, (180, 140, 100, 255), lw=5); c.spikes(cx + 90, cy - 170, 40, 15, 3, (180, 140, 100, 255), lw=5)
    c.eye(cx - 60, cy - 60, 55, white=(255, 220, 80, 255)); c.eye(cx + 60, cy - 60, 55, white=(255, 220, 80, 255))
    c.shape([(cx - 18, cy + 10), (cx + 18, cy + 10), (cx, cy + 50)], (240, 170, 60, 255), lw=4)
def e_boss_smudge(c, cx, cy, s):
    for i in range(6): c.ellipse(cx + random.uniform(-30, 30), cy + 40 + i * 20, 120 - i * 8, 170, (110, 110, 120, 90), outline=None, jitter=6)
    c.ellipse(cx, cy + 40, 110, 190, (95, 95, 105, 255), wob=0.1, lw=0, outline=None, jitter=5)
    c.ellipse(cx, cy - 140, 70, 65, (95, 95, 105, 255), wob=0.08, outline=None, jitter=4)
    c.rect(cx - 90, cy - 220, 180, 22, (30, 30, 35, 255), lw=4, jitter=1); c.rect(cx - 55, cy - 320, 110, 105, (30, 30, 35, 255), lw=4, jitter=2)
    c.ellipse(cx + 30, cy - 150, 24, 24, (255, 255, 255, 255), lw=4); c.stroke([(cx + 54, cy - 150), (cx + 90, cy - 100)], INK, 3, 1)
    c.dot_eye(cx - 30, cy - 150, 9); c.dot_eye(cx + 30, cy - 150, 6); c.mouth(cx, cy - 105, 70, 'smile', 4)
    for i in range(5): x = cx - 150 + i * 20; c.stroke([(x, cy + 100), (x + random.uniform(-10, 10), cy + 220)], (95, 95, 105, 230), 12, 3, 1)
    for i in range(5): x = cx + 70 + i * 20; c.stroke([(x, cy + 100), (x + random.uniform(-10, 10), cy + 220)], (95, 95, 105, 230), 12, 3, 1)
def e_teajelly(c, cx, cy, s):
    c.rect(cx - 120, cy - 120, 240, 200, (160, 110, 70, 200), lw=5, jitter=4)
    for i in range(8): c.stroke([(cx - 110 + i * 32, cy + 80), (cx - 110 + i * 32 + random.uniform(-20, 20), cy + 190)], (140, 95, 60, 180), 8, 3, 1)
    c.stroke([(cx, cy - 120), (cx + 10, cy - 200), (cx - 10, cy - 240)], (230, 230, 230, 255), 4, 1); c.rect(cx - 25, cy - 275, 50, 35, (255, 255, 255, 255), lw=3, jitter=1)
    c.dot_eye(cx - 40, cy - 40, 10); c.dot_eye(cx + 40, cy - 40, 10); c.stroke([(cx - 55, cy - 65), (cx - 25, cy - 60)], INK, 4, 1); c.stroke([(cx + 55, cy - 65), (cx + 25, cy - 60)], INK, 4, 1); c.mouth(cx, cy + 10, 40, 'flat')
def e_pageghost(c, cx, cy, s):
    pts = [(cx - 130, cy - 200), (cx + 130, cy - 200), (cx + 140, cy + 100), (cx + 100, cy + 170), (cx + 40, cy + 120), (cx - 20, cy + 190), (cx - 80, cy + 130), (cx - 140, cy + 180)]
    c.shape(pts, (240, 240, 235, 240), lw=5, jitter=3)
    for i in range(9): y = cy - 170 + i * 36; c.stroke([(cx - 120, y), (cx + 120, y)], (120, 160, 220, 140), 3, 2, 1)
    c.stroke([(cx - 100, cy - 200), (cx - 100, cy + 170)], (230, 100, 100, 120), 3, 2, 1)
    c.ellipse(cx - 45, cy - 60, 22, 30, INK, outline=None, tex=False); c.ellipse(cx + 45, cy - 60, 22, 30, INK, outline=None, tex=False); c.mouth(cx, cy + 20, 40, 'o')
def e_marshwasp(c, cx, cy, s, scale=1.0, crown=False):
    k = scale
    for sx in (-1, 1):
        c.shape([(cx + sx * 40 * k, cy - 40 * k), (cx + sx * 220 * k, cy - 180 * k), (cx + sx * 240 * k, cy - 60 * k), (cx + sx * 90 * k, cy + 10 * k)], (230, 230, 240, 150), lw=4, jitter=3)
    c.ellipse(cx, cy + 40 * k, 90 * k, 130 * k, (250, 210, 60, 255), lw=6, jitter=2)
    for i in range(4): y = cy - 20 * k + i * 45 * k; c.rect(cx - 85 * k, y, 170 * k, 20 * k, (30, 30, 35, 255), lw=0, outline=None, jitter=2)
    c.ellipse(cx, cy - 120 * k, 65 * k, 60 * k, (250, 210, 60, 255), lw=6)
    c.eye(cx - 25 * k, cy - 125 * k, 18 * k); c.eye(cx + 25 * k, cy - 125 * k, 18 * k); c.mouth(cx, cy - 85 * k, 40 * k, 'jag' if crown else 'flat', 4)
    c.stroke([(cx - 30 * k, cy - 170 * k), (cx - 60 * k, cy - 230 * k)], INK, 5, 1); c.stroke([(cx + 30 * k, cy - 170 * k), (cx + 60 * k, cy - 230 * k)], INK, 5, 1)
    c.shape([(cx - 15 * k, cy + 160 * k), (cx + 15 * k, cy + 160 * k), (cx, cy + 230 * k)], (120, 120, 130, 255), lw=4)
    if crown:
        for i in range(5): x = cx - 60 * k + i * 30 * k; c.stroke([(x, cy - 175 * k), (x, cy - 215 * k), (x + 14 * k, cy - 215 * k), (x + 14 * k, cy - 175 * k)], (150, 150, 160, 255), 5, 1)
def e_boss_waspqueen(c, cx, cy, s): e_marshwasp(c, cx, cy + 20, s, 1.15, crown=True)
def e_shaving(c, cx, cy, s):
    pts = [(cx - 160 + i * 20, cy + math.sin(i * 0.6) * 60 + (i - 8) * 8) for i in range(17)]
    c.stroke(pts, (255, 190, 200, 255), 60, 3, 1); c.stroke(pts, (255, 235, 240, 255), 35, 3, 1)
    c.dot_eye(cx - 20, cy - 20, 9); c.dot_eye(cx + 25, cy - 25, 9)
def e_doubt(c, cx, cy, s):
    g = (120, 120, 125, 255)
    c.ellipse(cx, cy - 90, 95, 90, (235, 235, 235, 200), outline=g, lw=4, jitter=3)
    c.rect(cx - 75, cy - 10, 150, 150, (225, 225, 225, 200), outline=g, lw=4, jitter=3)
    for i in range(5): c.stroke([(cx - 75, cy + 15 + i * 28), (cx + 75, cy + 15 + i * 28)], (150, 150, 155, 255), 6, 2, 1)
    c.stroke([(cx - 75, cy + 140), (cx - 60, cy + 210)], g, 8, 2); c.stroke([(cx + 75, cy + 140), (cx + 60, cy + 210)], g, 8, 2)
    c.scribble(cx - 80, cy - 170, 160, 60, (110, 110, 115, 255), n=40, lw=4)
    c.scribble(cx - 130, cy - 40, 60, 260, (170, 170, 175, 200), n=25, lw=3); c.scribble(cx + 70, cy - 40, 60, 260, (170, 170, 175, 200), n=25, lw=3)
    c.dot_eye(cx - 30, cy - 90, 6); c.dot_eye(cx + 30, cy - 90, 6)
def e_halfsketch(c, cx, cy, s):
    # left half: coloured cat; right half: pencil lines
    body = c.ell_pts(cx, cy + 40, 150, 130, wob=0.05); head = c.ell_pts(cx, cy - 110, 110, 95, wob=0.05)
    layer = Cr(c.w, c.h); layer.shape(body, (250, 170, 80, 255), lw=6); layer.shape(head, (250, 170, 80, 255), lw=6)
    layer.spikes(cx - 80, cy - 190, 55, 20, 3, (250, 170, 80, 255), lw=5); layer.spikes(cx + 80, cy - 190, 55, 20, 3, (250, 170, 80, 255), lw=5)
    layer.eye(cx - 40, cy - 120, 20); layer.eye(cx + 40, cy - 120, 20); layer.mouth(cx, cy - 70, 40, 'smile'); layer.blush(cx - 70, cy - 90, 18)
    arr = np.array(layer.im); half = arr.copy(); half[:, int(cx):, :] = 0; c.im.alpha_composite(Image.fromarray(half))
    pencil = Cr(c.w, c.h); pencil.stroke(body + [body[0]], (140, 140, 145, 200), 3, 2, 1); pencil.stroke(head + [head[0]], (140, 140, 145, 200), 3, 2, 1)
    pencil.stroke([(cx + 30, cy - 190), (cx + 80, cy - 260), (cx + 130, cy - 190)], (140, 140, 145, 200), 3, 2, 1)
    for _ in range(12): x = random.uniform(cx, cx + 140); y = random.uniform(cy - 200, cy + 150); pencil.stroke([(x, y), (x + 30, y + 20)], (170, 170, 175, 120), 2, 1, 1)
    arr = np.array(pencil.im); arr[:, :int(cx), :] = 0; c.im.alpha_composite(Image.fromarray(arr))
def e_boss_blank(c, cx, cy, s):
    for i in range(4): c.ellipse(cx, cy, 200 + i * 15, 240 + i * 15, (255, 255, 255, 40), outline=None, jitter=8)
    c.shape([(cx - 170, cy - 200), (cx + 170, cy - 200), (cx + 180, cy + 220), (cx - 180, cy + 220)], (250, 248, 245, 245), outline=(200, 200, 205, 255), lw=5, jitter=6)
    c.ellipse(cx, cy - 40, 55, 55, (255, 255, 255, 255), outline=(170, 170, 175, 255), lw=4); c.ellipse(cx, cy - 40, 24, 24, (150, 150, 155, 255), outline=None, tex=False)
    for _ in range(40): x = random.uniform(cx - 220, cx + 220); y = random.uniform(cy + 150, cy + 250); c.ellipse(x, y, random.uniform(3, 9), random.uniform(3, 9), (255, 220, 225, 200), outline=None, tex=False)
ENEMY_FNS = dict(scribblebunny=e_scribblebunny, dandelion=e_dandelion, crayonsnail=e_crayonsnail, boss_scribble=e_boss_scribble, paperwolf=e_paperwolf, stickbandit=e_stickbandit, crumpledowl=e_crumpledowl, boss_smudge=e_boss_smudge, teajelly=e_teajelly, pageghost=e_pageghost, marshwasp=e_marshwasp, boss_waspqueen=e_boss_waspqueen, shaving=e_shaving, doubt=e_doubt, halfsketch=e_halfsketch, boss_blank=e_boss_blank)

# ---------------- NPCs (procedural fallbacks) ----------------
def npc(name, fn):
    if not want(f'chars/{name}.png'):
        return
    for view in ('front', 'side', 'back'):
        c = Cr(256, 320); fn(c, 128, 160, view); c.grain(); c.save(f'chars/{name}_{view}.png', height=96)
def n_steep(c, cx, cy, view):
    c.ellipse(cx, cy + 90, 95, 55, (250, 245, 240, 255), lw=5); c.stroke([(cx + 95, cy + 70), (cx + 130, cy + 60), (cx + 130, cy + 100), (cx + 95, cy + 105)], INK, 5, 1)
    for i in range(4): c.ellipse(cx - 60 + i * 40, cy + 95, 10, 10, (240, 120, 150, 255), outline=None, tex=False)
    c.ellipse(cx, cy + 10, 75, 65, (110, 190, 90, 255), lw=5)
    if view != 'back': c.eye(cx - 30, cy - 30, 18); c.eye(cx + 30, cy - 30, 18); c.mouth(cx, cy + 20, 60, 'smile')
    c.rect(cx - 45, cy - 75, 90, 22, (40, 50, 90, 255), lw=3); c.rect(cx - 35, cy - 105, 70, 32, (40, 50, 90, 255), lw=3)
def n_beacon(c, cx, cy, view):
    c.shape([(cx - 40, cy + 140), (cx + 40, cy + 140), (cx + 55, cy - 40), (cx - 55, cy - 40)], (250, 210, 60, 255), lw=5, jitter=2)
    c.stroke([(cx, cy - 40), (cx, cy - 130)], (245, 245, 245, 255), 14, 1); c.ellipse(cx, cy - 140, 30, 24, (250, 250, 250, 255), lw=4)
    if view != 'back': c.shape([(cx + 20, cy - 145), (cx + 70, cy - 135), (cx + 20, cy - 125)], (250, 180, 60, 255), lw=3); c.dot_eye(cx + 8, cy - 148, 5)
    c.stroke([(cx - 55, cy - 20), (cx - 90, cy + 40)], INK, 5, 1); c.ellipse(cx - 92, cy + 62, 18, 24, (255, 230, 140, 255), lw=4)
    c.stroke([(cx - 15, cy + 140), (cx - 15, cy + 160)], INK, 5, 1); c.stroke([(cx + 15, cy + 140), (cx + 15, cy + 160)], INK, 5, 1)

def greywren():
    if not want('chars/greywren.png'): return
    for v in ('front', 'side', 'back'):
        src = os.path.join(IMG, 'chars', f'wren_{v}.png')
        if not os.path.exists(src): continue
        im = Image.open(src).convert('RGBA'); g = ImageOps.grayscale(im).point(lambda p: int(110 + p * 0.55)); out = Image.merge('RGBA', (g, g, g, im.getchannel('A')))
        a = np.array(out).astype(np.float32); h, w = a.shape[:2]; fade = np.linspace(1, 0.35, h)[:, None]; a[:, :, 3] *= fade; a[:, :, 3] *= (np.random.rand(h, w) > 0.12)
        Image.fromarray(a.astype(np.uint8)).save(os.path.join(IMG, 'chars', f'greywren_{v}.png')); print('proc greywren', v)

# ---------------- FACES from sheets ----------------
def faces():
    for who in ('wren', 'bramble', 'pip', 'moth'):
        if not want(f'faces/{who}.png'): continue
        raw = os.path.join(RAW, 'chars', f'{who}.png')
        if not os.path.exists(raw): continue
        sys.path.insert(0, os.path.dirname(__file__)); from slice import clean_alpha, projection_boxes
        im = clean_alpha(Image.open(raw)); a = np.array(im)[:, :, 3] > 0
        boxes = projection_boxes(a, 3); x0, y0, x1, y1, _ = boxes[0]
        head = im.crop((x0, y0, x1, y0 + int((y1 - y0) * 0.5))); bb = head.getbbox(); head = head.crop(bb)
        head = head.resize((round(head.width * 128 / head.height), 128), Image.LANCZOS)
        os.makedirs(os.path.join(IMG, 'faces'), exist_ok=True)
        for mood in ('neutral', 'brave', 'blue', 'giddy'): head.save(os.path.join(IMG, 'faces', f'{who}_{mood}.png'))
        print('faces', who)

# ---------------- TILES ----------------
def tile(name, base, fn=None, size=256):
    if not want(f'tiles/{name}.png'): return
    c = Cr(size, size, base); 
    arr = np.array(c.im).astype(np.float32); t = noise_tex(size, size, lo=0.86); arr[:, :, :3] *= t[:, :, None]; c.im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)); c.d = ImageDraw.Draw(c.im)
    if fn: fn(c, size)
    c.save(f'tiles/{name}.png', trim=False)
def t_grass(c, s, flowers=False):
    for _ in range(140): x, y = random.uniform(0, s), random.uniform(0, s); c.stroke([(x, y), (x + random.uniform(-6, 6), y - random.uniform(8, 18))], (70, 150, 70, 160), 3, 1, 1)
    if flowers:
        for _ in range(14): x, y = random.uniform(10, s - 10), random.uniform(10, s - 10); col = random.choice([(255, 220, 80), (255, 150, 180), (255, 255, 255)]); c.ellipse(x, y, 6, 6, col + (255,), outline=None, tex=False); c.ellipse(x, y, 2.5, 2.5, (250, 200, 60, 255), outline=None, tex=False)
def t_path(c, s):
    for _ in range(50): x, y = random.uniform(0, s), random.uniform(0, s); c.ellipse(x, y, random.uniform(3, 8), random.uniform(2, 5), (190, 170, 130, 255), outline=(150, 130, 100, 200), lw=2, jitter=1, tex=False)
def t_water(c, s):
    for _ in range(26): x, y = random.uniform(0, s), random.uniform(0, s); w = random.uniform(20, 60); c.stroke([(x, y), (x + w / 3, y - 4), (x + 2 * w / 3, y + 4), (x + w, y)], (230, 240, 255, 190), 3, 0.5, 1)
def t_leaves(c, s):
    for _ in range(80): x, y = random.uniform(0, s), random.uniform(0, s); col = random.choice([(220, 130, 50), (190, 90, 40), (230, 180, 60), (150, 90, 50)]); c.ellipse(x, y, 11, 6, col + (255,), rot=random.uniform(0, 3.14), lw=2, jitter=1)
def t_marsh(c, s):
    for _ in range(18): x, y = random.uniform(0, s), random.uniform(0, s); r = random.uniform(10, 40); c.stroke(c.ell_pts(x, y, r, r * 0.6, n=20) + [c.ell_pts(x, y, r, r * 0.6, n=20)[0]], (110, 85, 50, 120), 4, 1, 1)
def t_shallows(c, s):
    t_water(c, s)
    for _ in range(6): x, y = random.uniform(0, s), random.uniform(0, s); c.ellipse(x, y, 16, 12, (90, 160, 80, 255), lw=3, jitter=1)
def t_paper(c, s):
    for i in range(0, s, 32): c.stroke([(i, 0), (i, s)], (215, 215, 220, 120), 1, 0, 1); c.stroke([(0, i), (s, i)], (215, 215, 220, 120), 1, 0, 1)
    for _ in range(8): x, y = random.uniform(0, s), random.uniform(0, s); c.ellipse(x, y, 5, 3, (255, 200, 210, 255), outline=None, rot=random.uniform(0, 3), tex=False)
def t_wood(c, s):
    for i in range(0, s, 43): c.stroke([(0, i), (s, i)], (90, 60, 35, 200), 4, 1, 1); c.stroke([(random.uniform(0, s), i + 20), (random.uniform(0, s), i + 20)], (120, 85, 50, 120), 2, 1, 1)
def t_rug(c, s):
    for i, col in enumerate([(180, 70, 70), (240, 225, 200), (70, 90, 150), (240, 225, 200)] * 2): c.rect(0, i * 32, s, 32, col + (255,), outline=None, jitter=1)
def t_kitchen(c, s):
    for y in range(0, s, 64):
        for x in range(0, s, 64): col = (245, 240, 225) if ((x + y) // 64) % 2 == 0 else (190, 215, 235); c.rect(x, y, 64, 64, col + (255,), outline=(160, 160, 160, 120), lw=2, jitter=1)
def t_porch(c, s):
    for i in range(0, s, 52): c.stroke([(i, 0), (i, s)], (70, 65, 60, 200), 4, 1, 1)
def t_stone(c, s):
    for y in range(0, s, 48):
        for x in range(0, s, 56): c.ellipse(x + 28 + (24 if (y // 48) % 2 else 0), y + 24, 26, 20, (150, 150, 160, 255), outline=(90, 90, 100, 200), lw=3, jitter=2)
def t_dark(c, s): c.scribble(0, 0, s, s, (25, 25, 45, 255), n=30, lw=6)
TILE_DEFS = dict(grass=((120, 190, 95, 255), t_grass), grass2=((120, 190, 95, 255), lambda c, s: t_grass(c, s, True)), path=((215, 195, 150, 255), t_path), water=((110, 170, 230, 255), t_water), leaves=((160, 110, 60, 255), t_leaves),
    marsh=((120, 105, 60, 255), t_marsh), shallows=((150, 130, 80, 255), t_shallows), paper=((250, 249, 245, 255), t_paper), wood=((170, 120, 75, 255), t_wood), rug=((200, 90, 90, 255), t_rug), kitchen=((240, 235, 220, 255), t_kitchen),
    porch=((120, 105, 90, 255), t_porch), stone=((130, 130, 140, 255), t_stone), dark=((20, 18, 35, 255), t_dark))

# ---------------- PROPS ----------------
def prop(name, fn, w=300, h=300, height=128):
    if os.path.exists(os.path.join(IMG, 'props', name + '.png')) and not want('props/__never__'): pass
    c = Cr(w, h); fn(c, w / 2, h - 20, w, h); c.grain(); c.save(f'props/{name}.png', height=height)
WOOD = (190, 140, 80, 255); DWOOD = (140, 95, 55, 255); PAPER = (245, 242, 235, 255); GREY = (150, 150, 155, 255)
def p_fence(c, cx, by, w, h):
    for x in (cx - 100, cx - 34, cx + 34, cx + 100): c.rect(x - 12, by - 130, 24, 130, WOOD, lw=4); c.shape([(x - 12, by - 130), (x, by - 150), (x + 12, by - 130)], WOOD, lw=4)
    c.rect(cx - 120, by - 105, 240, 18, DWOOD, lw=4); c.rect(cx - 120, by - 55, 240, 18, DWOOD, lw=4)
def p_bookmark(c, cx, by, w, h):
    c.shape([(cx - 30, by - 250), (cx + 30, by - 250), (cx + 30, by - 20), (cx, by - 60), (cx - 30, by - 20)], (220, 50, 70, 255), lw=5, jitter=2)
    c.stroke([(cx, by - 240), (cx, by - 70)], (255, 150, 160, 200), 3, 1, 1)
def p_picnic(c, cx, by, w, h):
    c.shape([(cx - 130, by - 40), (cx + 130, by - 40), (cx + 110, by + 10), (cx - 110, by + 10)], (230, 70, 70, 255), lw=4)
    for i in range(6): c.stroke([(cx - 120 + i * 45, by - 40), (cx - 100 + i * 45, by + 10)], (255, 255, 255, 200), 6, 1, 1)
    c.rect(cx - 40, by - 100, 80, 60, WOOD, lw=4); c.stroke([(cx - 30, by - 100), (cx, by - 130), (cx + 30, by - 100)], DWOOD, 6, 1)
def p_birdhouse(c, cx, by, w, h):
    c.rect(cx - 8, by - 140, 16, 140, DWOOD, lw=4); c.rect(cx - 50, by - 230, 100, 90, (230, 200, 120, 255), lw=4); c.shape([(cx - 65, by - 230), (cx, by - 285), (cx + 65, by - 230)], (200, 80, 70, 255), lw=4); c.ellipse(cx, by - 190, 18, 18, INK, outline=None, tex=False)
def p_stall(c, cx, by, w, h):
    c.rect(cx - 120, by - 100, 240, 100, WOOD, lw=5); c.rect(cx - 130, by - 120, 260, 22, DWOOD, lw=4)
    for x in (cx - 115, cx + 115): c.rect(x - 8, by - 240, 16, 130, DWOOD, lw=4)
    for i in range(6): c.shape([(cx - 140 + i * 47, by - 250), (cx - 93 + i * 47, by - 250), (cx - 93 + i * 47, by - 215), (cx - 117 + i * 47, by - 200), (cx - 140 + i * 47, by - 215)], (230, 80, 80, 255) if i % 2 else (250, 250, 250, 255), lw=4)
def p_bridge(c, cx, by, w, h):
    for i in range(6): c.rect(cx - 130, by - 150 + i * 26, 260, 22, WOOD, lw=4)
    c.rect(cx - 140, by - 160, 14, 170, DWOOD, lw=3); c.rect(cx + 126, by - 160, 14, 170, DWOOD, lw=3)
def p_papertree(c, cx, by, w, h):
    c.rect(cx - 22, by - 130, 44, 130, PAPER, lw=5, jitter=3)
    for i in range(3): c.spikes(cx, by - 170 - i * 50, 95 - i * 18, 60 - i * 12, 8, PAPER, lw=5, jitter=3)
    for _ in range(25): x, y = random.uniform(cx - 80, cx + 80), random.uniform(by - 300, by - 20); c.stroke([(x, y), (x + random.uniform(-25, 25), y + random.uniform(-25, 25))], (150, 150, 160, 150), 2, 1, 1)
def p_deadtree(c, cx, by, w, h):
    c.stroke([(cx, by), (cx - 5, by - 120), (cx + 10, by - 220)], (30, 25, 35, 255), 22, 3); 
    for (a, b) in [((cx - 5, by - 120), (cx - 90, by - 200)), ((cx + 5, by - 170), (cx + 90, by - 260)), ((cx + 10, by - 220), (cx - 30, by - 290)), ((cx - 90, by - 200), (cx - 110, by - 260))]: c.stroke([a, b], (30, 25, 35, 255), 12, 3)
def p_log(c, cx, by, w, h):
    c.rect(cx - 120, by - 60, 240, 60, DWOOD, lw=5, jitter=3); c.ellipse(cx + 120, by - 30, 22, 30, (220, 190, 140, 255), lw=4); c.ellipse(cx + 120, by - 30, 10, 14, (190, 150, 100, 255), lw=3)
def p_stump(c, cx, by, w, h):
    c.rect(cx - 60, by - 70, 120, 70, DWOOD, lw=5, jitter=3); c.ellipse(cx, by - 70, 62, 26, (225, 195, 145, 255), lw=4)
    for r in (40, 25, 12): c.stroke(c.ell_pts(cx, by - 70, r, r * 0.4, n=18) + [c.ell_pts(cx, by - 70, r, r * 0.4, n=18)[0]], (170, 130, 80, 200), 3, 1, 1)
def p_lantern(c, cx, by, w, h):
    c.rect(cx - 6, by - 250, 12, 250, DWOOD, lw=3); c.stroke([(cx, by - 250), (cx + 60, by - 230)], DWOOD, 8, 1)
    c.ellipse(cx + 60, by - 160, 40, 55, (255, 220, 120, 255), lw=4); c.ellipse(cx + 60, by - 160, 20, 30, (255, 245, 200, 255), outline=None)
def p_cranestatue(c, cx, by, w, h):
    c.rect(cx - 50, by - 40, 100, 40, GREY, lw=4); c.shape([(cx - 50, by - 60), (cx + 50, by - 60), (cx + 20, by - 140), (cx + 60, by - 200), (cx + 30, by - 200), (cx - 10, by - 150), (cx - 70, by - 130)], (180, 180, 190, 255), lw=4)
def p_reeds(c, cx, by, w, h):
    for i in range(7): x = cx - 60 + i * 20; c.stroke([(x, by), (x + random.uniform(-10, 10), by - 200 - i % 3 * 30)], (110, 150, 70, 255), 5, 2); c.ellipse(x + random.uniform(-8, 8), by - 200 - i % 3 * 30, 9, 26, (120, 80, 50, 255), lw=3)
def p_teacup(c, cx, by, w, h):
    c.shape([(cx - 120, by - 120), (cx + 120, by - 120), (cx + 90, by - 10), (cx - 90, by - 10)], PAPER, lw=5, jitter=2); c.ellipse(cx, by - 120, 122, 30, (240, 235, 230, 255), lw=4)
    c.stroke([(cx + 120, by - 100), (cx + 165, by - 90), (cx + 160, by - 40), (cx + 100, by - 30)], INK, 6, 1)
    for i in range(4): c.ellipse(cx - 70 + i * 45, by - 70, 14, 14, (240, 120, 150, 255), outline=None, tex=False)
def p_lilypad(c, cx, by, w, h):
    c.shape(c.ell_pts(cx, by - 40, 120, 60, n=30, wob=0.08)[:26], (90, 170, 80, 255), lw=4); c.spikes(cx + 50, by - 80, 30, 14, 6, (255, 160, 190, 255), lw=3)
def p_teabag(c, cx, by, w, h):
    c.stroke([(cx + 60, by), (cx + 60, by - 260)], DWOOD, 8, 1); c.shape([(cx - 80, by - 200), (cx + 40, by - 210), (cx + 50, by - 20), (cx - 60, by - 10)], (200, 160, 110, 255), lw=5, jitter=4)
    c.stroke([(cx - 20, by - 205), (cx - 10, by - 250)], (240, 240, 240, 255), 3, 1); c.rect(cx - 30, by - 275, 40, 28, (255, 255, 255, 255), lw=3)
def p_lighthouse(c, cx, by, w, h):
    c.shape([(cx - 70, by), (cx + 70, by), (cx + 45, by - 230), (cx - 45, by - 230)], (250, 250, 250, 255), lw=5)
    for i in range(3): c.shape([(cx - 66 + i * 7, by - 25 - i * 70), (cx + 66 - i * 7, by - 25 - i * 70), (cx + 62 - i * 7, by - 55 - i * 70), (cx - 62 + i * 7, by - 55 - i * 70)], (230, 60, 60, 255), lw=3)
    c.rect(cx - 45, by - 275, 90, 45, (255, 230, 120, 255), lw=4); c.shape([(cx - 55, by - 275), (cx, by - 300), (cx + 55, by - 275)], (230, 60, 60, 255), lw=4)
def p_dockpost(c, cx, by, w, h):
    c.rect(cx - 22, by - 200, 44, 200, DWOOD, lw=5, jitter=3); c.ellipse(cx, by - 200, 24, 10, WOOD, lw=3)
    for i in range(3): c.stroke(c.ell_pts(cx, by - 150 + i * 15, 30, 9, n=16) + [c.ell_pts(cx, by - 150 + i * 15, 30, 9, n=16)[0]], (220, 200, 150, 255), 5, 1, 1)
def p_ghosttree(c, cx, by, w, h):
    g = (160, 160, 165, 200); c.stroke([(cx, by), (cx, by - 120)], g, 4, 2, 1); pts = c.ell_pts(cx, by - 200, 100, 90, n=24, wob=0.1); c.stroke(pts + [pts[0]], g, 3, 3, 1)
    for _ in range(6): x = random.uniform(cx - 60, cx + 60); y = random.uniform(by - 260, by - 150); c.stroke([(x, y), (x + 20, y + 15)], (190, 190, 195, 120), 2, 1, 1)
def p_pencilstub(c, cx, by, w, h):
    c.rect(cx - 40, by - 200, 80, 200, (250, 210, 60, 255), lw=5); c.shape([(cx - 40, by - 200), (cx + 40, by - 200), (cx, by - 270)], (240, 220, 180, 255), lw=4); c.shape([(cx - 12, by - 250), (cx + 12, by - 250), (cx, by - 272)], INK, lw=2)
    c.rect(cx - 42, by - 40, 84, 20, (200, 200, 205, 255), lw=3); c.rect(cx - 40, by - 20, 80, 20, (255, 150, 170, 255), lw=3)
def p_eraserblock(c, cx, by, w, h):
    c.shape([(cx - 120, by - 20), (cx + 80, by - 20), (cx + 120, by - 70), (cx - 80, by - 70)], (255, 170, 190, 255), lw=5); c.shape([(cx - 120, by - 20), (cx - 120, by - 110), (cx + 80, by - 110), (cx + 80, by - 20)], (255, 190, 205, 255), lw=5); c.shape([(cx - 120, by - 110), (cx - 80, by - 160), (cx + 120, by - 160), (cx + 80, by - 110)], (255, 210, 220, 255), lw=5)
def p_paperball(c, cx, by, w, h):
    c.ellipse(cx, by - 70, 90, 75, PAPER, wob=0.15, lw=5, jitter=5)
    for _ in range(20): x = random.uniform(cx - 70, cx + 70); y = random.uniform(by - 130, by - 20); c.stroke([(x, y), (x + random.uniform(-30, 30), y + random.uniform(-30, 30))], (170, 170, 175, 180), 2, 1, 1)
def p_ghostchair(c, cx, by, w, h):
    g = (160, 160, 165, 220)
    for pts in [[(cx - 50, by), (cx - 50, by - 90)], [(cx + 50, by), (cx + 50, by - 90)], [(cx - 50, by - 90), (cx + 50, by - 90)], [(cx - 45, by - 90), (cx - 45, by - 200)], [(cx + 45, by - 90), (cx + 45, by - 200)], [(cx - 45, by - 200), (cx + 45, by - 200)], [(cx - 45, by - 150), (cx + 45, by - 150)]]: c.stroke(pts, g, 4, 2, 1)
def p_doorframe(c, cx, by, w, h):
    c.rect(cx - 90, by - 260, 30, 260, DWOOD, lw=5); c.rect(cx + 60, by - 260, 30, 260, DWOOD, lw=5); c.rect(cx - 100, by - 285, 200, 30, DWOOD, lw=5)
    c.rect(cx - 60, by - 255, 120, 255, (255, 255, 255, 180), outline=None, jitter=0, tex=False)
def p_bed(c, cx, by, w, h):
    c.rect(cx - 90, by - 230, 180, 230, (150, 100, 60, 255), lw=5); c.rect(cx - 80, by - 200, 160, 190, (100, 140, 220, 255), lw=4)
    for i in range(4): c.stroke([(cx - 80, by - 160 + i * 40), (cx + 80, by - 160 + i * 40)], (70, 100, 180, 200), 3, 1, 1)
    c.rect(cx - 70, by - 225, 140, 45, (255, 255, 255, 255), lw=4)
def p_desk(c, cx, by, w, h):
    c.rect(cx - 120, by - 110, 240, 30, WOOD, lw=5); c.rect(cx - 110, by - 80, 20, 80, DWOOD, lw=4); c.rect(cx + 90, by - 80, 20, 80, DWOOD, lw=4)
    c.rect(cx - 60, by - 150, 90, 40, (255, 255, 255, 255), lw=3); c.stroke([(cx - 15, by - 150), (cx - 15, by - 110)], (200, 200, 200, 255), 2, 1, 1)
    c.stroke([(cx + 80, by - 110), (cx + 80, by - 180)], INK, 6, 1); c.shape([(cx + 50, by - 180), (cx + 110, by - 180), (cx + 95, by - 215), (cx + 65, by - 215)], (255, 220, 120, 255), lw=4)
def p_bookshelf(c, cx, by, w, h):
    c.rect(cx - 100, by - 260, 200, 260, DWOOD, lw=5)
    for row in range(3):
        x = cx - 90
        while x < cx + 80: bw = random.uniform(14, 28); col = random.choice([(230, 80, 80), (80, 140, 230), (240, 200, 80), (110, 190, 110), (200, 120, 220)]); c.rect(x, by - 240 + row * 80, bw, 70, col + (255,), lw=3, jitter=1); x += bw + 3
        c.rect(cx - 100, by - 165 + row * 80, 200, 8, WOOD, lw=2)
def p_toybox(c, cx, by, w, h):
    c.rect(cx - 90, by - 110, 180, 110, (230, 90, 90, 255), lw=5); c.rect(cx - 95, by - 130, 190, 24, (250, 210, 70, 255), lw=4)
    c.ellipse(cx + 40, by - 150, 35, 35, (190, 140, 90, 255), lw=4); c.ellipse(cx + 20, by - 180, 12, 12, (190, 140, 90, 255), lw=3); c.ellipse(cx + 60, by - 180, 12, 12, (190, 140, 90, 255), lw=3); c.dot_eye(cx + 30, by - 155, 4); c.dot_eye(cx + 50, by - 155, 4)
def p_window(c, cx, by, w, h):
    c.rect(cx - 90, by - 220, 180, 180, (40, 45, 90, 255), lw=6); c.stroke([(cx, by - 220), (cx, by - 40)], (240, 240, 240, 255), 6, 1); c.stroke([(cx - 90, by - 130), (cx + 90, by - 130)], (240, 240, 240, 255), 6, 1)
    for _ in range(12): c.ellipse(random.uniform(cx - 80, cx + 80), random.uniform(by - 210, by - 50), 3, 3, (255, 255, 220, 255), outline=None, tex=False)
    c.ellipse(cx + 40, by - 170, 22, 22, (255, 245, 200, 255), lw=3)
    c.rect(cx - 120, by - 230, 30, 200, (240, 150, 150, 255), lw=4); c.rect(cx + 90, by - 230, 30, 200, (240, 150, 150, 255), lw=4)
def p_door(c, cx, by, w, h):
    c.rect(cx - 70, by - 230, 140, 230, DWOOD, lw=6); c.rect(cx - 50, by - 200, 100, 80, WOOD, lw=3); c.rect(cx - 50, by - 100, 100, 80, WOOD, lw=3); c.ellipse(cx + 45, by - 115, 9, 9, (240, 200, 80, 255), lw=3)
def p_table(c, cx, by, w, h):
    c.ellipse(cx, by - 100, 120, 55, WOOD, lw=5); c.rect(cx - 12, by - 100, 24, 100, DWOOD, lw=4)
    for x in (cx - 150, cx + 150): c.rect(x - 25, by - 120, 50, 20, DWOOD, lw=4); c.rect(x - 25, by - 100, 8, 90, DWOOD, lw=3); c.rect(x + 17, by - 100, 8, 90, DWOOD, lw=3); c.rect(x - 22, by - 200, 44, 80, DWOOD, lw=4)
def p_fridge(c, cx, by, w, h):
    c.rect(cx - 70, by - 260, 140, 260, (245, 240, 225, 255), lw=6); c.stroke([(cx - 70, by - 170), (cx + 70, by - 170)], INK, 4, 1); c.rect(cx + 40, by - 150, 10, 60, GREY, lw=2)
    for (x, y, col) in [(cx - 35, by - 230, (255, 200, 80)), (cx + 10, by - 120, (120, 200, 120)), (cx - 30, by - 90, (230, 120, 160))]: c.rect(x, y, 40, 45, (255, 255, 255, 255), lw=2); c.scribble(x + 5, y + 5, 30, 35, col + (255,), n=6, lw=3); c.ellipse(x + 20, y, 5, 5, (230, 60, 60, 255), outline=None, tex=False)
def p_stove(c, cx, by, w, h):
    c.rect(cx - 90, by - 150, 180, 150, (230, 230, 235, 255), lw=5); c.rect(cx - 90, by - 165, 180, 20, (60, 60, 70, 255), lw=4)
    for x in (cx - 45, cx + 45): c.ellipse(x, by - 155, 28, 10, (40, 40, 45, 255), lw=3)
    c.rect(cx - 60, by - 110, 120, 70, (40, 40, 45, 255), lw=3); c.ellipse(cx + 45, by - 190, 30, 26, (200, 200, 210, 255), lw=4); c.stroke([(cx + 75, by - 195), (cx + 100, by - 215)], INK, 5, 1)
def p_rockingchair(c, cx, by, w, h):
    c.stroke([(cx - 90, by - 10), (cx - 40, by + 5), (cx + 40, by + 5), (cx + 90, by - 10)], DWOOD, 8, 1)
    c.rect(cx - 60, by - 90, 120, 25, WOOD, lw=4); c.rect(cx - 60, by - 220, 20, 135, DWOOD, lw=4); c.rect(cx + 40, by - 220, 20, 135, DWOOD, lw=4)
    for i in range(3): c.stroke([(cx - 40, by - 200 + i * 40), (cx + 40, by - 200 + i * 40)], DWOOD, 8, 1)
    c.rect(cx - 55, by - 65, 12, 65, DWOOD, lw=3); c.rect(cx + 43, by - 65, 12, 65, DWOOD, lw=3)
def p_plant(c, cx, by, w, h):
    c.shape([(cx - 60, by - 90), (cx + 60, by - 90), (cx + 45, by), (cx - 45, by)], (200, 110, 70, 255), lw=5)
    for a in (-0.9, -0.4, 0, 0.4, 0.9): c.stroke([(cx, by - 90), (cx + math.sin(a) * 90, by - 90 - math.cos(a) * 130)], (90, 160, 80, 255), 8, 2); c.ellipse(cx + math.sin(a) * 95, by - 95 - math.cos(a) * 140, 30, 18, (110, 190, 100, 255), rot=a, lw=3)
def p_coatrack(c, cx, by, w, h):
    c.rect(cx - 8, by - 260, 16, 260, DWOOD, lw=4); c.ellipse(cx, by, 40, 12, DWOOD, lw=3)
    for a in (-1, 1): c.stroke([(cx, by - 250), (cx + a * 50, by - 270)], DWOOD, 8, 1)
    c.shape([(cx - 60, by - 250), (cx - 10, by - 250), (cx, by - 100), (cx - 70, by - 110)], (100, 90, 160, 255), lw=4); c.ellipse(cx + 50, by - 285, 40, 22, (60, 60, 70, 255), lw=4); c.rect(cx + 25, by - 320, 50, 40, (60, 60, 70, 255), lw=4)
def p_barrel(c, cx, by, w, h):
    c.shape([(cx - 70, by - 20), (cx - 85, by - 90), (cx - 70, by - 170), (cx + 70, by - 170), (cx + 85, by - 90), (cx + 70, by - 20)], WOOD, lw=5); c.rect(cx - 85, by - 140, 170, 14, GREY, lw=3); c.rect(cx - 85, by - 60, 170, 14, GREY, lw=3)
    for x in (cx - 30, cx + 30): c.stroke([(x, by - 170), (x, by - 20)], DWOOD, 3, 1, 1)
def p_books(c, cx, by, w, h):
    for i, col in enumerate([(230, 80, 80), (80, 140, 230), (240, 200, 80)]): c.rect(cx - 80 + i * 6, by - 40 - i * 34, 160, 34, col + (255,), lw=4, jitter=1)
def p_campfire(c, cx, by, w, h):
    for a in (-0.5, 0.3, 1.2): c.rect(cx - 80, by - 30, 160, 20, DWOOD, lw=4)
    c.spikes(cx, by - 90, 60, 25, 5, (255, 140, 40, 255), lw=4); c.spikes(cx, by - 80, 35, 12, 5, (255, 220, 80, 255), lw=3)
    c.stroke([(cx - 60, by - 40), (cx - 20, by - 180), (cx + 20, by - 180), (cx + 60, by - 40)], DWOOD, 6, 1); c.ellipse(cx, by - 150, 30, 24, (200, 200, 210, 255), lw=4)
def p_well(c, cx, by, w, h):
    c.shape([(cx - 90, by), (cx + 90, by), (cx + 90, by - 80), (cx - 90, by - 80)], (150, 150, 160, 255), lw=5); c.ellipse(cx, by - 80, 92, 30, (60, 80, 120, 255), lw=4)
    c.rect(cx - 80, by - 200, 14, 120, DWOOD, lw=3); c.rect(cx + 66, by - 200, 14, 120, DWOOD, lw=3); c.shape([(cx - 100, by - 200), (cx, by - 250), (cx + 100, by - 200)], (200, 80, 70, 255), lw=4); c.rect(cx - 25, by - 120, 50, 30, WOOD, lw=3)
def p_tent(c, cx, by, w, h):
    c.shape([(cx - 130, by), (cx, by - 180), (cx + 130, by)], (250, 210, 120, 255), lw=6); c.shape([(cx - 40, by), (cx, by - 90), (cx + 40, by)], (60, 50, 60, 255), lw=4); c.stroke([(cx - 150, by - 200), (cx + 150, by - 200)], DWOOD, 5, 1)
def p_hidingball(c, cx, by, w, h):
    p_paperball(c, cx, by, w, h); c.dot_eye(cx - 25, by - 80, 8); c.dot_eye(cx + 20, by - 85, 8)
PROP_FNS = dict(fence=p_fence, bookmark=p_bookmark, picnic=p_picnic, birdhouse=p_birdhouse, stall=p_stall, bridge=p_bridge, papertree=p_papertree, deadtree=p_deadtree, log=p_log, stump=p_stump, lantern=p_lantern, cranestatue=p_cranestatue,
    reeds=p_reeds, teacup=p_teacup, lilypad=p_lilypad, teabag=p_teabag, lighthouse=p_lighthouse, dockpost=p_dockpost, ghosttree=p_ghosttree, pencilstub=p_pencilstub, eraserblock=p_eraserblock, paperball=p_paperball, ghostchair=p_ghostchair, doorframe=p_doorframe,
    bed=p_bed, desk=p_desk, bookshelf=p_bookshelf, toybox=p_toybox, window=p_window, door=p_door, table=p_table, fridge=p_fridge, stove=p_stove, rockingchair=p_rockingchair, plant=p_plant, coatrack=p_coatrack, barrel=p_barrel, books=p_books, campfire=p_campfire, well=p_well, tent=p_tent, hidingball=p_hidingball)
PROP_SHEET = dict(meadow2=['fence', 'bookmark', 'picnic', 'birdhouse', 'stall', 'bridge'], woods=['papertree', 'deadtree', 'log', 'stump', 'lantern', 'cranestatue'], marsh=['reeds', 'teacup', 'lilypad', 'teabag', 'lighthouse', 'dockpost'],
    blank=['ghosttree', 'pencilstub', 'eraserblock', 'paperball', 'ghostchair', 'doorframe'], bedroom=['bed', 'desk', 'bookshelf', 'toybox', 'window', 'door'], house=['table', 'fridge', 'stove', 'rockingchair', 'plant', 'coatrack'], misc=['barrel', 'books', 'campfire', 'well', 'tent', 'hidingball'])

# ---------------- ICONS ----------------
def icon(name, fn):
    if not want('ui/icons.png'): return
    c = Cr(128, 128); fn(c, 64, 64); c.save(f'ui/{name}.png', height=64)
def i_crayon(c, x, y): c.shape([(x - 40, y + 30), (x + 20, y - 30), (x + 40, y - 10), (x - 20, y + 50)], (80, 140, 230, 255), lw=4); c.shape([(x + 20, y - 30), (x + 34, y - 44), (x + 40, y - 10)], (80, 140, 230, 255), lw=3)
def i_eraser(c, x, y): c.shape([(x - 45, y + 10), (x + 25, y - 30), (x + 45, y - 5), (x - 25, y + 35)], (255, 150, 170, 255), lw=4)
def i_cookie(c, x, y): c.ellipse(x, y, 42, 40, (220, 170, 100, 255), lw=4); [c.ellipse(x + dx, y + dy, 6, 6, (90, 50, 30, 255), outline=None, tex=False) for dx, dy in ((-15, -10), (10, -18), (18, 12), (-8, 18), (0, 0))]
def i_juice(c, x, y): c.rect(x - 30, y - 30, 60, 75, (250, 200, 80, 255), lw=4); c.stroke([(x + 15, y - 30), (x + 25, y - 55)], (255, 255, 255, 255), 5, 1); c.ellipse(x, y + 5, 16, 16, (230, 80, 80, 255), lw=3)
def i_bandage(c, x, y): c.shape([(x - 45, y - 5), (x + 35, y - 40), (x + 45, y + 5), (x - 35, y + 40)], (250, 220, 190, 255), lw=4); c.rect(x - 12, y - 12, 24, 24, (255, 255, 255, 255), lw=2)
def i_star(c, x, y): c.spikes(x, y, 46, 20, 5, (255, 215, 60, 255), lw=4)
def i_page(c, x, y): c.rect(x - 30, y - 42, 60, 84, (255, 255, 255, 255), lw=4); c.ellipse(x - 8, y - 4, 10, 10, (240, 100, 120, 255), outline=None, tex=False); c.ellipse(x + 8, y - 4, 10, 10, (240, 100, 120, 255), outline=None, tex=False); c.shape([(x - 17, y), (x + 17, y), (x, y + 18)], (240, 100, 120, 255), outline=None, tex=False)
def i_key(c, x, y): c.ellipse(x - 20, y - 15, 22, 22, (230, 190, 80, 255), lw=4); c.stroke([(x - 5, y), (x + 45, y + 40)], (230, 190, 80, 255), 10, 1); c.stroke([(x + 30, y + 28), (x + 40, y + 15)], (230, 190, 80, 255), 8, 1)
def i_lantern(c, x, y): c.ellipse(x, y + 5, 30, 40, (255, 220, 120, 255), lw=4); c.rect(x - 12, y - 45, 24, 10, INK, lw=2); c.ellipse(x, y + 5, 12, 18, (255, 250, 220, 255), outline=None)
def i_sandwich(c, x, y): c.shape([(x - 45, y + 20), (x + 45, y + 20), (x, y - 35)], (240, 200, 120, 255), lw=4); c.stroke([(x - 30, y + 8), (x + 30, y + 8)], (110, 190, 90, 255), 8, 1); c.stroke([(x - 25, y + 16), (x + 25, y + 16)], (240, 120, 100, 255), 5, 1)
def i_tea(c, x, y): c.shape([(x - 35, y - 15), (x + 35, y - 15), (x + 25, y + 35), (x - 25, y + 35)], (250, 250, 250, 255), lw=4); c.ellipse(x, y - 15, 36, 10, (170, 110, 60, 255), lw=3); c.stroke([(x + 35, y - 5), (x + 55, y), (x + 50, y + 25), (x + 28, y + 28)], INK, 5, 1)
def i_bookmark(c, x, y): c.shape([(x - 20, y - 45), (x + 20, y - 45), (x + 20, y + 45), (x, y + 25), (x - 20, y + 45)], (220, 50, 70, 255), lw=4)
ICON_FNS = dict(ic_crayon=i_crayon, ic_eraser=i_eraser, ic_cookie=i_cookie, ic_juice=i_juice, ic_bandage=i_bandage, ic_star=i_star, ic_page=i_page, ic_key=i_key, ic_lantern=i_lantern, ic_sandwich=i_sandwich, ic_tea=i_tea, ic_bookmark=i_bookmark)

# ---------------- BATTLE BACKGROUNDS + SCENES ----------------
def gradient(w, h, top, bottom):
    a = np.linspace(0, 1, h)[:, None, None]; arr = (np.array(top)[None, None, :] * (1 - a) + np.array(bottom)[None, None, :] * a)
    arr = np.repeat(arr, w, axis=1); return Image.fromarray(np.concatenate([arr, np.full((h, w, 1), 255)], axis=2).astype(np.uint8), 'RGBA')
def hills(c, w, h, cols, ybase, amp):
    for i, col in enumerate(cols):
        y0 = ybase + i * amp * 0.6; pts = [(x, y0 + math.sin(x / 260 + i) * amp + math.sin(x / 90 + i * 2) * amp * 0.3) for x in range(-20, w + 40, 20)]
        c.shape(pts + [(w + 40, h + 20), (-20, h + 20)], col + (255,), outline=(40, 30, 40, 120), lw=5, jitter=3)
def bg(name, fn):
    if not want(f'battle/{name}.png'): return
    w, h = 1536, 1024; c = Cr(w, h); fn(c, w, h); c.grain(); c.save(f'battle/{name}.png', trim=False)
def bg_meadow(c, w, h):
    c.im.alpha_composite(gradient(w, h, (150, 205, 245), (225, 240, 250)))
    for _ in range(7): x, y = random.uniform(0, w), random.uniform(60, 330); [c.ellipse(x + dx, y + dy, r, r * 0.7, (255, 255, 255, 240), outline=None, jitter=3) for dx, dy, r in ((0, 0, 70), (-60, 15, 50), (60, 15, 55))]
    hills(c, w, h, [(150, 200, 120), (120, 190, 95), (105, 175, 85)], 480, 40)
    for x, hh in ((150, 300), (1350, 260), (700, 200)): paste(c, 'props/tree', x, 660, hh)
    for x in (400, 1000, 1200): paste(c, 'props/flowerbush', x, 720, 90)
def bg_woods(c, w, h):
    c.im.alpha_composite(gradient(w, h, (40, 40, 90), (110, 90, 140)))
    hills(c, w, h, [(70, 60, 110), (60, 50, 95), (80, 70, 110)], 520, 30)
    for x in range(80, w, 170): paste(c, 'props/papertree', x + random.uniform(-40, 40), 700 + random.uniform(-60, 40), random.uniform(260, 360))
    for x in (300, 1100): paste(c, 'props/deadtree', x, 720, 300)
def bg_marsh(c, w, h):
    c.im.alpha_composite(gradient(w, h, (170, 150, 110), (120, 110, 70)))
    hills(c, w, h, [(120, 120, 80), (105, 100, 60), (95, 90, 55)], 500, 25)
    paste(c, 'props/lighthouse', 1200, 600, 330); 
    for x in range(100, w, 140): paste(c, 'props/reeds', x + random.uniform(-30, 30), 760 + random.uniform(-30, 30), random.uniform(120, 200))
    for _ in range(14): x, y = random.uniform(0, w), random.uniform(600, h); c.ellipse(x, y, random.uniform(200, 400), random.uniform(20, 40), (240, 235, 220, 28), outline=None, jitter=5, tex=False)
def bg_blank(c, w, h):
    c.im.alpha_composite(gradient(w, h, (252, 252, 250), (240, 240, 238)))
    g = (200, 200, 205, 160); pts = [(x, 560 + math.sin(x / 260) * 40) for x in range(-20, w + 40, 20)]; c.stroke(pts, g, 4, 3, 1)
    for x in (200, 700, 1250): paste(c, 'props/ghosttree', x, 680, 280, alpha=0.6)
    for _ in range(60): x, y = random.uniform(0, w), random.uniform(0, h); c.ellipse(x, y, random.uniform(3, 9), random.uniform(3, 9), (255, 200, 210, 150), outline=None, tex=False)
BG_FNS = dict(bg_meadow=bg_meadow, bg_woods=bg_woods, bg_marsh=bg_marsh, bg_blank=bg_blank)

def scene(name, fn):
    if not want(f'scenes/{name}.png'): return
    w, h = 1536, 1024; c = Cr(w, h); fn(c, w, h); c.grain(); c.save(f'scenes/{name}.png', trim=False)
def room(c, w, h, wall, floor):
    c.im.alpha_composite(gradient(w, h, wall, wall)); c.rect(0, 600, w, h - 600, floor + (255,), outline=None, jitter=0)
    c.stroke([(0, 600), (w, 600)], (60, 50, 60, 200), 6, 2)
def s_memory_table(c, w, h):
    room(c, w, h, (250, 225, 180), (180, 130, 80)); c.rect(1100, 120, 260, 300, (255, 245, 200, 255), lw=8); c.stroke([(1230, 120), (1230, 420)], (240, 240, 240, 255), 8, 1)
    paste(c, 'props/table', 700, 800, 260); paste(c, 'chars/pop_front', 560, 790, 330); paste(c, 'chars/wren_front', 850, 790, 250)
    c.rect(640, 640, 130, 70, (255, 255, 255, 255), lw=4); c.scribble(650, 650, 110, 50, (230, 100, 120, 255), n=6, lw=4)
def s_bedroom_night(c, w, h):
    room(c, w, h, (45, 40, 70), (60, 50, 60)); paste(c, 'props/window', 1150, 560, 300); paste(c, 'props/bed', 450, 860, 330); paste(c, 'chars/wren_front', 480, 720, 260)
    c.rect(780, 780, 180, 120, (255, 255, 255, 255), lw=5); 
    for i, col in enumerate([(255, 120, 150), (120, 200, 255), (255, 220, 100), (140, 230, 140)]): c.ellipse(870 + random.uniform(-60, 60), 760 - i * 60, 60 + i * 30, 40 + i * 20, col + (70,), outline=None, jitter=6)
def s_porch(c, w, h):
    c.im.alpha_composite(gradient(w, h, (240, 150, 110), (90, 70, 110))); hills(c, w, h, [(80, 60, 90), (60, 45, 70)], 560, 30)
    c.rect(0, 700, w, 324, (120, 105, 90, 255), outline=None, jitter=0); c.stroke([(0, 700), (w, 700)], (60, 50, 60, 200), 6, 2)
    paste(c, 'props/rockingchair', 760, 900, 300); paste(c, 'chars/pop_front', 760, 880, 300); c.rect(700, 760, 120, 80, (255, 255, 255, 255), lw=4)
def s_end_keep(c, w, h):
    room(c, w, h, (255, 240, 200), (190, 140, 90)); c.rect(1100, 100, 260, 300, (255, 250, 220, 255), lw=8)
    paste(c, 'props/table', 720, 820, 260); paste(c, 'chars/pop_front', 560, 800, 330); paste(c, 'chars/wren_front', 880, 800, 300)
    c.rect(650, 650, 150, 80, (255, 255, 255, 255), lw=4); paste(c, 'chars/bramble_front', 725, 725, 60)
def s_end_drift(c, w, h):
    room(c, w, h, (70, 75, 95), (75, 70, 80)); paste(c, 'props/window', 800, 520, 340)
    for _ in range(60): x = random.uniform(660, 940); y = random.uniform(220, 480); c.stroke([(x, y), (x - 4, y + 22)], (200, 210, 230, 160), 2, 0, 1)
    paste(c, 'chars/wren_back', 800, 760, 280); paste(c, 'props/desk', 350, 800, 220); paste(c, 'props/books', 350, 700, 60)
def s_end_erase(c, w, h):
    c.im.alpha_composite(gradient(w, h, (252, 252, 250), (245, 245, 243))); g = (170, 170, 175, 200)
    cx, cy = 1250, 820; c.stroke(c.ell_pts(cx, cy, 60, 40, n=20) + [(cx + 60, cy)], g, 3, 2, 1); c.stroke(c.ell_pts(cx - 55, cy - 30, 28, 24, n=16) + [(cx - 27, cy - 30)], g, 3, 2, 1); c.stroke([(cx - 83, cy - 30), (cx - 100, cy - 26)], g, 3, 1, 1); c.stroke([(cx + 55, cy - 10), (cx + 110, cy - 40)], g, 3, 1, 1)
def s_margins_vista(c, w, h):
    c.im.alpha_composite(gradient(w, h, (150, 205, 245), (245, 245, 243)))
    hills(c, w, h, [(150, 200, 120), (120, 190, 95), (100, 130, 90), (140, 120, 90)], 420, 50)
    for x in range(100, 700, 120): paste(c, 'props/tree', x, 640 + random.uniform(-30, 30), random.uniform(90, 140))
    for x in range(700, 1100, 90): paste(c, 'props/papertree', x, 700 + random.uniform(-30, 30), random.uniform(120, 170))
    paste(c, 'props/lighthouse', 1250, 760, 180)
    c.rect(1200, 0, 400, h, (252, 252, 250, 210), outline=None, jitter=0)
def s_title(c, w, h):
    c.im.alpha_composite(gradient(w, h, (35, 30, 55), (70, 55, 90)))
    c.shape([(300, 600), (1240, 600), (1300, 980), (240, 980)], (250, 248, 240, 255), lw=8, jitter=4); c.stroke([(770, 600), (770, 980)], (200, 200, 200, 255), 6, 2)
    for i, col in enumerate([(230, 80, 80), (80, 140, 230), (240, 200, 80), (110, 190, 110), (200, 120, 220)]): x = 330 + i * 60; c.shape([(x, 1000), (x + 30, 1000), (x + 40, 930), (x + 10, 930)], col + (255,), lw=3)
    paste(c, 'chars/wren_front', 640, 900, 300); paste(c, 'chars/bramble_front', 420, 950, 170); paste(c, 'chars/pip_front', 1020, 940, 180); paste(c, 'chars/moth_front', 1180, 900, 180)
    c.ellipse(1300, 180, 90, 90, (255, 245, 200, 255), lw=4)
SCENE_FNS = dict(title=s_title, memory_table=s_memory_table, bedroom_night=s_bedroom_night, porch=s_porch, end_keep=s_end_keep, end_drift=s_end_drift, end_erase=s_end_erase, margins_vista=s_margins_vista)

if __name__ == '__main__':
    only = sys.argv[1] if len(sys.argv) > 1 else None
    if not only or only == 'faces': faces(); greywren()
    if not only or only == 'npcs': npc('steep', n_steep); npc('beacon', n_beacon)
    if not only or only == 'enemies':
        for k, f in ENEMY_FNS.items(): enemy(k, f)
    if not only or only == 'tiles':
        for k, (base, f) in TILE_DEFS.items(): tile(k, base, f)
    if not only or only == 'props':
        for sheet, names in PROP_SHEET.items():
            if want(f'props/{sheet}.png'):
                for n in names: prop(n, PROP_FNS[n], height=128)
    if not only or only == 'icons':
        for k, f in ICON_FNS.items(): icon(k, f)
    if not only or only == 'bg':
        for k, f in BG_FNS.items(): bg(k, f)
    if not only or only == 'scenes':
        for k, f in SCENE_FNS.items(): scene(k, f)
