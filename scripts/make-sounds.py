"""Short, quiet interface sounds for SubControl. Pure synthesis, no samples.

Run: python3 scripts/make-sounds.py  (writes assets/sounds/*.wav)
"""
import math
import struct
import wave
from pathlib import Path

RATE = 44100
OUT = Path(__file__).resolve().parent.parent / "assets" / "sounds"


def tone(freq, dur, decay, amp=1.0, harmonics=((1, 1.0),), attack=0.002):
    n = int(RATE * dur)
    out = []
    for i in range(n):
        t = i / RATE
        env = min(1.0, t / attack) * math.exp(-t / decay)
        s = sum(w * math.sin(2 * math.pi * freq * h * t) for h, w in harmonics)
        out.append(amp * env * s)
    return out


def mix(*parts):
    """parts: (offset_seconds, samples)"""
    length = max(int(off * RATE) + len(s) for off, s in parts)
    buf = [0.0] * length
    for off, s in parts:
        start = int(off * RATE)
        for i, v in enumerate(s):
            buf[start + i] += v
    return buf


def fade_tail(buf, ms=6):
    n = int(RATE * ms / 1000)
    for i in range(n):
        buf[-1 - i] *= i / n
    return buf


def write(name, buf, peak):
    m = max(abs(v) for v in buf) or 1
    buf = fade_tail([v / m * peak for v in buf])
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(v * 32767)) for v in buf))


BELL = ((1, 1.0), (2.0, 0.18), (3.01, 0.06))
WOOD = ((1, 1.0), (2.76, 0.25))

# A dry little tick, like a good pen button.
write("tap", tone(1900, 0.035, 0.006, harmonics=WOOD, attack=0.0008), 0.32)

# Switch on goes up, switch off goes down.
write("on", mix((0, tone(1175, 0.06, 0.016, harmonics=WOOD)), (0.035, tone(1568, 0.07, 0.018, harmonics=WOOD))), 0.34)
write("off", mix((0, tone(1568, 0.06, 0.016, harmonics=WOOD)), (0.035, tone(1175, 0.07, 0.018, harmonics=WOOD))), 0.3)

# Saved, added, Pro turned on: two soft bell notes going up (E6, B6).
write("success", mix((0, tone(1318.5, 0.32, 0.09, harmonics=BELL)), (0.075, tone(1975.5, 0.42, 0.12, harmonics=BELL))), 0.4)

# Subscription cancelled or deleted: two lower notes going down (A5, E5). Calm, not an error.
write("cancel", mix((0, tone(880, 0.3, 0.08, harmonics=BELL)), (0.08, tone(659.3, 0.4, 0.11, harmonics=BELL))), 0.36)

# Something was found in a bank statement: three quick notes up (C6, E6, G6).
write("found", mix(
    (0, tone(1046.5, 0.25, 0.06, harmonics=BELL)),
    (0.06, tone(1318.5, 0.25, 0.07, harmonics=BELL)),
    (0.12, tone(1568, 0.4, 0.12, harmonics=BELL)),
), 0.38)

# The reminder itself: has to be heard across a room, but stay a chime, not a siren.
# Two bright phrases (G5 C6 E6 G6, then again) with a short gap, about 1.8 s.
phrase = [
    (0.00, tone(783.99, 0.5, 0.16, harmonics=BELL)),
    (0.11, tone(1046.5, 0.5, 0.16, harmonics=BELL)),
    (0.22, tone(1318.5, 0.5, 0.18, harmonics=BELL)),
    (0.33, tone(1568.0, 0.8, 0.28, harmonics=BELL)),
]
write("reminder", mix(*phrase, *[(off + 0.95, s) for off, s in phrase]), 0.85)

print("ok:", ", ".join(sorted(p.name for p in OUT.glob("*.wav"))))
