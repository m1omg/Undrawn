#!/usr/bin/env python3
"""Slice a transparent sprite sheet into separate PNGs by connected components.

usage: slice.py SHEET.png OUTDIR name1 name2 ... [--rows R] [--height H] [--thresh T]
Components are ordered row-major (top-to-bottom bands, then left-to-right).
"""
import sys, os, argparse
import numpy as np
from PIL import Image

def clean_alpha(im, thresh=110):
    a = np.array(im.convert("RGBA")).astype(np.int32)
    al = a[:, :, 3]
    # kill halo: soft pixels become fully transparent, solid stays; smooth edge in between
    al2 = np.clip((al - thresh) * 255 // max(1, (230 - thresh)), 0, 255)
    a[:, :, 3] = al2
    return Image.fromarray(a.astype(np.uint8), "RGBA")

def components(mask, cell=6, gap=2):
    """Connected components on a downsampled grid; gap dilates to merge nearby parts."""
    h, w = mask.shape
    gh, gw = h // cell, w // cell
    g = mask[:gh*cell, :gw*cell].reshape(gh, cell, gw, cell).max(axis=(1, 3))
    # dilate
    d = g.copy()
    for _ in range(gap):
        p = np.pad(d, 1)
        d = (p[:-2,1:-1] | p[2:,1:-1] | p[1:-1,:-2] | p[1:-1,2:] | d)
    lab = np.zeros_like(d, dtype=np.int32); n = 0; boxes = []
    for y in range(gh):
        for x in range(gw):
            if d[y, x] and not lab[y, x]:
                n += 1; stack = [(y, x)]; lab[y, x] = n; ys = []; xs = []
                while stack:
                    cy, cx = stack.pop(); ys.append(cy); xs.append(cx)
                    for ny, nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
                        if 0 <= ny < gh and 0 <= nx < gw and d[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n; stack.append((ny, nx))
                area = len(ys)
                boxes.append((min(xs)*cell, min(ys)*cell, (max(xs)+1)*cell, (max(ys)+1)*cell, area))
    return boxes

def projection_boxes(a, n, axis=0):
    """Split by gaps in the alpha projection along an axis; keep the n widest segments."""
    proj = a.sum(axis=axis) > 0
    segs = []; start = None
    for i, v in enumerate(proj):
        if v and start is None: start = i
        if not v and start is not None: segs.append((start, i)); start = None
    if start is not None: segs.append((start, len(proj)))
    # merge tiny gaps (< 12 px)
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < 12: merged[-1] = (merged[-1][0], s[1])
        else: merged.append(s)
    merged = sorted(sorted(merged, key=lambda s: -(s[1] - s[0]))[:n])
    if len(merged) < n:  # views touch: cut at the lowest-density columns around equal-mass positions
        dens = a.sum(axis=axis).astype(float); cum = np.cumsum(dens); total = cum[-1]; L = len(dens)
        cuts = []
        for k in range(1, n):
            target = np.searchsorted(cum, total * k / n); lo, hi = max(1, target - L // 12), min(L - 1, target + L // 12)
            cuts.append(lo + int(np.argmin(dens[lo:hi])))
        bounds = [0] + cuts + [L]; merged = []
        for i in range(n):
            seg = dens[bounds[i]:bounds[i + 1]]; nz = np.where(seg > 0)[0]
            if len(nz): merged.append((bounds[i] + nz[0], bounds[i] + nz[-1] + 1))
    out = []
    for s0, s1 in merged:
        sub = a[:, s0:s1] if axis == 0 else a[s0:s1, :]
        ys = np.where(sub.any(axis=1 if axis == 0 else 0))[0]
        if axis == 0: out.append((s0, ys.min(), s1, ys.max() + 1, (s1 - s0) * len(ys)))
        else: out.append((ys.min(), s0, ys.max() + 1, s1, (s1 - s0) * len(ys)))
    return out

def slice_sheet(path, outdir, names, rows=None, height=None, thresh=110, min_area=40):
    im = clean_alpha(Image.open(path), thresh)
    a = np.array(im)[:, :, 3] > 0
    if (rows or 1) == 1 and len(names) <= 4:
        boxes = projection_boxes(a, len(names), axis=0)
        if len(boxes) != len(names): print(f"warning: projection found {len(boxes)} parts in {path}", file=sys.stderr)
        os.makedirs(outdir, exist_ok=True)
        for name, (x0, y0, x1, y1, _) in zip(names, boxes):
            crop = im.crop((x0, y0, x1, y1)); bb = crop.getbbox()
            if bb: crop = crop.crop(bb)
            if height: crop = crop.resize((max(1, round(crop.width * height / crop.height)), height), Image.LANCZOS)
            crop.save(os.path.join(outdir, name + ".png")); print("sliced", name, crop.size)
        return
    boxes = [b for b in components(a) if b[4] >= min_area]
    if not boxes: raise SystemExit("no components in " + path)
    # order: cluster by rows
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    if rows is None:
        rows = 1 if len(names) <= 3 else 2
    per = max(1, round(len(boxes) / rows))
    ordered = []
    for r in range(rows):
        band = boxes[r*per:(r+1)*per] if r < rows-1 else boxes[r*per:]
        band.sort(key=lambda b: b[0]); ordered += band
    if len(ordered) != len(names):
        # fall back: keep the N biggest, then reorder
        ordered = sorted(ordered, key=lambda b: -b[4])[:len(names)]
        ordered.sort(key=lambda b: (b[1] + b[3]) / 2)
        out = []
        for r in range(rows):
            band = ordered[r*per:(r+1)*per] if r < rows-1 else ordered[r*per:]
            band.sort(key=lambda b: b[0]); out += band
        ordered = out
        print(f"warning: component count mismatch in {path}, kept {len(ordered)} biggest", file=sys.stderr)
    os.makedirs(outdir, exist_ok=True)
    for name, (x0, y0, x1, y1, _) in zip(names, ordered):
        crop = im.crop((x0, y0, x1, y1))
        bb = crop.getbbox()
        if bb: crop = crop.crop(bb)
        if height:
            s = height / crop.height
            crop = crop.resize((max(1, round(crop.width*s)), height), Image.LANCZOS)
        crop.save(os.path.join(outdir, name + ".png"))
        print("sliced", name, crop.size)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet"); ap.add_argument("outdir"); ap.add_argument("names", nargs="+")
    ap.add_argument("--rows", type=int); ap.add_argument("--height", type=int); ap.add_argument("--thresh", type=int, default=110)
    a = ap.parse_args()
    slice_sheet(a.sheet, a.outdir, a.names, a.rows, a.height, a.thresh)
