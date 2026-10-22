# Tariel Caulsleigh - textures for the opening's people, from the Quaternius packs (CC0):
# Universal Base Characters (skin, eyes, hair) and Modular Character Outfits - Fantasy (Ranger, Peasant).
# Sized for a Chromebook; recoloured where the people need their own look.
#   python3 people_textures.py <base-characters Textures dir> <outfits Textures dir> <out dir>
import sys, colorsys
from PIL import Image
base, outfits, out = sys.argv[1], sys.argv[2], sys.argv[3]

def save(im, name, size):
    im.convert('RGB').resize((size, size), Image.LANCZOS).save(f'{out}/{name}.png', optimize=True)

def rehue(im, test, change):
    """change the colour of the pixels whose (h, s, v) pass test"""
    im = im.convert('RGB'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = px[x, y]; h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if test(h, s, v):
                h, s, v = change(h, s, v); r, g, b = colorsys.hsv_to_rgb(h % 1, max(0, min(1, s)), max(0, min(1, v)))
                px[x, y] = (int(r * 255), int(g * 255), int(b * 255))
    return im

def hair(src, colour):
    """grey hair texture -> a hair colour, keeping its light and shade"""
    im = Image.open(src).convert('L')
    lo, hi = im.getextrema()
    pal = []
    for i in range(256):
        t = (i - lo) / max(1, hi - lo); k = 0.35 + 0.95 * t
        pal += [max(0, min(255, int(c * k))) for c in colour]
    im.putpalette(pal)
    return im.convert('RGB')

# skin: the lighter base, head and hands
save(Image.open(f'{base}/T_Superhero_Female_Light_BaseColor.png'), 'skin_f', 1024)
save(Image.open(f'{base}/T_Superhero_Male_Ligh.png'), 'skin_m', 1024)
save(Image.open(f'{outfits}/Base/T_Regular_Female_Dark_BaseColor.png'), 'hands_f', 512)
save(Image.open(f'{outfits}/Base/T_Regular_Male_Dark_BaseColor.png'), 'hands_m', 512)
# eyes: brown as they come; Tariel's are green (her notes: "sharp and green")
eye = Image.open(f'{base}/T_Eye_Brown.png').convert('RGB')
save(eye, 'eye_brown', 128)
save(rehue(eye, lambda h, s, v: s > 0.4 and 0.035 < h < 0.14 and v < 0.8, lambda h, s, v: (0.31, s * 0.9, v * 1.05)), 'eye_green', 128)
# hair: Tariel dark blonde (her notes), her father greying brown, Síofel and the rider dark
save(hair(f'{base}/T_Hair_1_BaseColor.png', (150, 114, 68)), 'hair1_darkblonde', 256)
save(hair(f'{base}/T_Hair_2_BaseColor.png', (150, 114, 68)), 'hair2_darkblonde', 256)
save(hair(f'{base}/T_Hair_1_BaseColor.png', (128, 112, 98)), 'hair1_greying', 256)
save(hair(f'{base}/T_Hair_2_BaseColor.png', (128, 112, 98)), 'hair2_greying', 256)
save(hair(f'{base}/T_Hair_1_BaseColor.png', (70, 52, 40)), 'hair1_dark', 256)
save(hair(f'{base}/T_Hair_2_BaseColor.png', (70, 52, 40)), 'hair2_dark', 256)
# outfits: the Ranger as it comes (Tariel); its green turned to deep blue (Lord Caulsleigh);
# the brown Ranger (Síofel); the second Peasant (the rider)
ranger = Image.open(f'{outfits}/Ranger/T_Ranger_BaseColor.png').convert('RGB').resize((1024, 1024), Image.LANCZOS)
save(ranger, 'ranger_green', 1024)
save(rehue(ranger, lambda h, s, v: 0.17 < h < 0.48 and s > 0.15, lambda h, s, v: (h + 0.32, s * 0.9, v * 0.85)), 'ranger_blue', 1024)
save(Image.open(f'{outfits}/Ranger/T_Ranger_3_BaseColor.png'), 'ranger_brown', 1024)
save(Image.open(f'{outfits}/Peasant/T_Peasant_2_BaseColor.png'), 'peasant', 1024)
# Thiah's "posh rags": the first, lighter Peasant
save(Image.open(f'{outfits}/Peasant/T_Peasant_BaseColor.png'), 'peasant_light', 1024)
print('textures written to', out)

# ── the Mark of Kern, on Thiah's left foot (Rhys's design, tools/art/mark_of_kern.png) ──
# tools/foot_uv.mjs lists the left foot's vertices: position, normal, texture coordinate. The ones on the top
# of the foot map (x, z) to (u, v) nearly linearly; that fit places the mark, ankle-ward end up, on the instep.
import json, os
foot = sys.argv[4] if len(sys.argv) > 4 else None
if foot and os.path.exists(foot):
    import numpy as np
    pts = [v for v in json.load(open(foot)) if v['n'][1] > 0.55]
    A = np.array([[v['p'][0], v['p'][2], 1] for v in pts]); U = np.array([v['uv'] for v in pts])
    fit, res, *_ = np.linalg.lstsq(A, U, rcond=None)
    M = np.array([[fit[0][0], fit[1][0]], [fit[0][1], fit[1][1]]]); off = np.array([fit[2][0], fit[2][1]])
    Minv = np.linalg.inv(M)
    xs = A[:, 0]; zs = A[:, 1]
    cx, cz = xs.mean(), zs.min() + (zs.max() - zs.min()) * 0.42          # a little ankle-ward of the middle
    H = (zs.max() - zs.min()) * 0.62; Wd = H * 359 / 540
    glyph = Image.open(os.path.join(os.path.dirname(__file__), 'art', 'mark_of_kern.png')).convert('L')
    skin = Image.open(f'{base}/T_Superhero_Female_Light_BaseColor.png').convert('RGB')
    S = skin.width; px = skin.load(); gp = glyph.load()
    # only inside the outline of the top of the foot on the texture
    from PIL import ImageDraw
    hull_mask = Image.new('L', (S, S), 0)
    uv = U * S
    # convex hull (monotone chain)
    P = sorted(set(map(tuple, uv.round(1))))
    def cross(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, hi = [], []
    for p in P:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(P):
        while len(hi) >= 2 and cross(hi[-2], hi[-1], p) <= 0: hi.pop()
        hi.append(p)
    ImageDraw.Draw(hull_mask).polygon(lo[:-1] + hi[:-1], fill=255)
    hm = hull_mask.load()
    u0, v0 = uv.min(0).astype(int); u1, v1 = uv.max(0).astype(int)
    ink = (52, 40, 36)
    for ty in range(max(0, v0 - 2), min(S, v1 + 3)):
        for tx in range(max(0, u0 - 2), min(S, u1 + 3)):
            if not hm[tx, ty]: continue
            x, z = Minv @ (np.array([(tx + 0.5) / S, (ty + 0.5) / S]) - off)
            gx = (x - (cx - Wd / 2)) / Wd; gz = (z - (cz - H / 2)) / H
            if not (0 <= gx < 1 and 0 <= gz < 1): continue
            a = gp[int(gx * glyph.width), int(gz * glyph.height)] / 255 * 0.82
            if a <= 0: continue
            r, g, b = px[tx, ty]
            px[tx, ty] = (int(r + (ink[0] - r) * a), int(g + (ink[1] - g) * a), int(b + (ink[2] - b) * a))
    save(skin, 'skin_f_kern', 2048)
    print('the Mark of Kern painted: fit residual', res, 'mark', round(Wd * 100, 1), 'x', round(H * 100, 1), 'cm')
