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
