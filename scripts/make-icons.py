"""Draws SubControl's app icons: the month dial with one upcoming charge."""
import math
from PIL import Image, ImageDraw

COBALT = (47, 75, 255, 255)
WHITE = (255, 255, 255, 255)
AMBER = (255, 185, 56, 255)
PAPER = (244, 245, 249, 255)


def dial(size, bg, ring_scale=0.58, track=(255, 255, 255, 90), arc=WHITE, dot=AMBER, dot_ring=None, mono=False):
    s = size * 4
    img = Image.new("RGBA", (s, s), bg)
    c = s / 2
    r = s * ring_scale / 2
    w = int(s * 0.075)
    box = [c - r, c - r, c + r, c + r]
    # semi-transparent track goes on its own layer so it blends instead of punching alpha holes
    layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse(box, outline=track, width=w)
    img = Image.alpha_composite(img, layer)
    d = ImageDraw.Draw(img)
    # elapsed part of the month: from the top, clockwise to ~62%
    start, end = -90, -90 + 0.62 * 360
    d.arc(box, start, end, fill=arc, width=w)
    for a in (start, end):
        x = c + (r - w / 2) * math.cos(math.radians(a))
        y = c + (r - w / 2) * math.sin(math.radians(a))
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=arc)
    # upcoming charge
    a = math.radians(-90 + 0.78 * 360)
    x = c + (r - w / 2) * math.cos(a)
    y = c + (r - w / 2) * math.sin(a)
    dr = w * 1.05
    if dot_ring:
        d.ellipse([x - dr - w * 0.35, y - dr - w * 0.35, x + dr + w * 0.35, y + dr + w * 0.35], fill=dot_ring)
    d.ellipse([x - dr, y - dr, x + dr, y + dr], fill=dot)
    return img.resize((size, size), Image.LANCZOS)


dial(1024, COBALT, dot_ring=COBALT).convert("RGB").save("assets/icon.png")  # App Store: no transparency
dial(1024, (0, 0, 0, 0), ring_scale=0.46, dot_ring=COBALT).save("assets/android-icon-foreground.png")
dial(1024, (0, 0, 0, 0), ring_scale=0.46, track=(255, 255, 255, 110), arc=WHITE, dot=WHITE, mono=True).save(
    "assets/android-icon-monochrome.png"
)
dial(96, (0, 0, 0, 0), ring_scale=0.8, track=(255, 255, 255, 110), dot=WHITE).save("assets/notification-icon.png")
dial(512, (0, 0, 0, 0), ring_scale=0.9, track=(47, 75, 255, 60), arc=COBALT, dot=AMBER, dot_ring=PAPER).save(
    "assets/splash-icon.png"
)
dial(48, COBALT, dot_ring=COBALT).save("assets/favicon.png")
# colour icon next to the reminder text on Android; the system crops it to a circle
dial(256, COBALT, ring_scale=0.5, dot_ring=COBALT).save("assets/notification-large-icon.png")
print("icons written")
