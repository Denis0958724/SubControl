"""Screenshots and graphics for App Store and Google Play.

Takes real screens from the browser build of the app, then frames them with a headline.

    npm run preview:web
    (cd dist-preview && python3 -m http.server 8123 &)
    python3 scripts/make-store-assets.py

Writes store/ios/*.png (iPhone 6.9", 1320x2868), store/android/*.png (1080x1920),
store/android/feature-graphic.png (1024x500), store/android/icon-512.png, store/ios/icon-1024.png.
All subscriptions on the screenshots are made up.
"""
import asyncio
import base64
import json
from datetime import date, timedelta
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "store"
RAW = OUT / "raw"
URL = "http://localhost:8123/index.html"
FIXTURE = ROOT / "src/lib/statement/__tests__/fixtures/privat.xlsx"
FONTS = ROOT / "node_modules/@expo-google-fonts"

TODAY = date.today()
USD = 44.96

SERVICES = {
    # id: (name, color)
    "netflix": ("Netflix", "#E50914"),
    "spotify": ("Spotify", "#1DB954"),
    "youtube": ("YouTube Premium", "#FF0033"),
    "megogo": ("MEGOGO", "#7B3FE4"),
    "chatgpt": ("ChatGPT Plus", "#10A37F"),
    "icloud": ("iCloud+", "#3693F3"),
    "sweettv": ("SWEET.TV", "#E6236B"),
    "duolingo": ("Duolingo Super", "#58CC02"),
}


def sub(sid, amount, currency, cycle, days, **extra):
    name, color = SERVICES[sid]
    nxt = TODAY + timedelta(days=days)
    s = {
        "id": f"shot-{sid}",
        "serviceId": sid,
        "name": name,
        "amount": amount,
        "currency": currency,
        "cycle": cycle,
        "nextCharge": nxt.isoformat(),
        "anchorDay": nxt.day,
        "color": color,
        "remind": True,
        "status": "active",
        "sharedWith": 1,
        "source": "manual",
        "createdAt": (TODAY - timedelta(days=60)).isoformat(),
    }
    s.update(extra)
    return s


def state(subs, pro=True):
    return {
        "state": {
            "subs": subs,
            "settings": {"leadDays": 1, "hour": 10, "sounds": True},
            "rates": {"USD": USD, "EUR": 50.24, "updatedAt": f"{TODAY.isoformat()}T09:00:00.000Z", "source": "monobank"},
            "isPro": pro,
            "monoConnected": False,
        },
        "version": 1,
    }


SUBS = [
    sub("netflix", 9.99, "USD", "month", 1),
    sub("spotify", 149, "UAH", "month", 5),
    sub("youtube", 249, "UAH", "month", 9, sharedWith=4),
    sub("megogo", 199, "UAH", "month", 13),
    sub("chatgpt", 20, "USD", "month", 24),
    sub("icloud", 0.99, "USD", "month", 22),
    sub("sweettv", 99, "UAH", "month", 26),
    sub("duolingo", 59.99, "USD", "year", 140),
]


async def shoot():
    RAW.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()

        async def ctx(scheme, data):
            c = await b.new_context(viewport={"width": 440, "height": 956}, device_scale_factor=3, color_scheme=scheme)
            await c.add_init_script(f"localStorage.setItem('subcontrol', {json.dumps(json.dumps(data))});")
            page = await c.new_page()
            await page.goto(URL)
            await page.wait_for_timeout(1800)
            return c, page

        vis = lambda page, t: page.locator(f"text={t} >> visible=true").last

        c, page = await ctx("light", state(SUBS))
        await page.screenshot(path=RAW / "home-light.png")
        await vis(page, "Netflix").click()
        await page.wait_for_timeout(700)
        await page.screenshot(path=RAW / "detail-light.png")
        await vis(page, "Як скасувати").click()
        await page.wait_for_timeout(700)
        await page.screenshot(path=RAW / "cancel-light.png")
        await c.close()

        c, page = await ctx("dark", state(SUBS))
        await page.screenshot(path=RAW / "home-dark.png")
        await c.close()

        c, page = await ctx("light", state([], pro=True))
        await vis(page, "Знайти у виписці банку").click()
        await page.wait_for_timeout(600)
        await vis(page, "ПриватБанк").click()
        await page.wait_for_timeout(600)
        async with page.expect_file_chooser() as fc:
            await vis(page, "Обрати файл").click()
        await (await fc.value).set_files([str(FIXTURE)])
        await page.wait_for_timeout(1500)
        await page.screenshot(path=RAW / "import-light.png")
        await c.close()

        c, page = await ctx("light", state(SUBS, pro=False))
        await page.get_by_label("Налаштування").click()
        await page.wait_for_timeout(500)
        await vis(page, "SubControl Pro").click()
        await page.wait_for_timeout(700)
        await page.screenshot(path=RAW / "pro-light.png")
        await c.close()
        await b.close()


def data_uri(path, mime="image/png"):
    return f"data:{mime};base64," + base64.b64encode(Path(path).read_bytes()).decode()


FONT_CSS = "".join(
    f"@font-face{{font-family:'{fam}';src:url({data_uri(FONTS / rel, 'font/ttf')});font-weight:{w}}}"
    for fam, rel, w in [
        ("Unbounded", "unbounded/600SemiBold/Unbounded_600SemiBold.ttf", 600),
        ("Onest", "onest/400Regular/Onest_400Regular.ttf", 400),
        ("Onest", "onest/600SemiBold/Onest_600SemiBold.ttf", 600),
    ]
)

# (raw shot, headline, subline, background, notification or None)
SLIDES = [
    ("home-light", "Усі підписки<br>в гривнях", "Скільки на місяць і скільки на рік. Без калькулятора й сорому.", "#2F4BFF", None),
    ("detail-light", "Нагадає за день<br>до списання", "«Продовжую» чи «Скасувати» просто зі сповіщення.", "#1B2140", "Завтра Netflix спише 449 ₴"),
    ("import-light", "Знайде забуті<br>підписки", "У виписці monobank, ПриватБанку та інших банків. Файл не покидає телефон.", "#2F4BFF", None),
    ("cancel-light", "Підкаже,<br>як скасувати", "Покроково і з прямим посиланням. Бо шукати кнопку «Скасувати» ніхто не любить.", "#1B2140", None),
    ("home-dark", "Темна тема<br>теж є", "Для тих, хто рахує витрати вночі.", "#10132A", None),
]

APP_ICON = ROOT / "assets/icon.png"


def frame_html(w, h, shot, title, sub_text, bg, notif):
    pad = round(w * 0.075)
    title_size = round(w * 0.082)
    sub_size = round(w * 0.036)
    # taller phones (App Store 6.9") leave relatively more room for the screenshot
    text_h = round(h * (0.215 if h / w > 2 else 0.262))
    shot_h = h - text_h - round(h * 0.04)
    radius = round(w * 0.06)
    notif_html = ""
    if notif:
        ns = w / 1320
        notif_html = f"""
        <div class="notif" style="top:{text_h + round(shot_h * 0.6)}px;width:{round(1060 * ns)}px;padding:{round(34 * ns)}px {round(38 * ns)}px;border-radius:{round(52 * ns)}px;gap:{round(30 * ns)}px">
          <img src="{data_uri(APP_ICON)}" style="width:{round(110 * ns)}px;height:{round(110 * ns)}px;border-radius:{round(26 * ns)}px">
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;font-size:{round(34 * ns)}px;color:#7D8399;font-family:Onest">
              <span>SUBCONTROL</span><span>зараз</span></div>
            <div style="font:600 {round(44 * ns)}px/1.25 Onest;color:#1B2140;margin-top:{round(6 * ns)}px">{notif}</div>
            <div style="font:400 {round(40 * ns)}px/1.3 Onest;color:#4A5070">Продовжуєте чи скасувати?</div>
            <div style="display:flex;gap:{round(18 * ns)}px;margin-top:{round(24 * ns)}px">
              <span class="act" style="padding:{round(16 * ns)}px {round(30 * ns)}px;font-size:{round(38 * ns)}px">Продовжую</span>
              <span class="act cancel" style="padding:{round(16 * ns)}px {round(30 * ns)}px;font-size:{round(38 * ns)}px">Скасувати</span>
            </div>
          </div>
        </div>"""
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
    {FONT_CSS}
    html,body{{margin:0;width:{w}px;height:{h}px;overflow:hidden;background:{bg}}}
    .t{{position:absolute;left:{pad}px;right:{pad}px;top:{round(h * 0.045)}px;color:#fff}}
    h1{{font:600 {title_size}px/1.12 Unbounded;letter-spacing:-0.02em;margin:0 0 {round(h * 0.012)}px}}
    p{{font:400 {sub_size}px/1.35 Onest;margin:0;opacity:.82}}
    .shot{{position:absolute;left:50%;transform:translateX(-50%);top:{text_h}px;height:{shot_h}px;border-radius:{radius}px;
      box-shadow:0 {round(w * 0.02)}px {round(w * 0.06)}px rgba(0,0,0,.35);outline:{max(2, round(w * 0.004))}px solid rgba(255,255,255,.16)}}
    .notif{{position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:flex-start;
      background:rgba(255,255,255,.97);box-shadow:0 20px 60px rgba(0,0,0,.35)}}
    .act{{background:#E8ECFF;color:#2F4BFF;border-radius:999px;font-family:Onest;font-weight:600}}
    .act.cancel{{background:#FDECEC;color:#D93D42}}
    </style></head><body>
    <div class="t"><h1>{title}</h1><p>{sub_text}</p></div>
    <img class="shot" src="{data_uri(RAW / (shot + '.png'))}">
    {notif_html}
    </body></html>"""


def feature_html():
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
    {FONT_CSS}
    html,body{{margin:0;width:1024px;height:500px;overflow:hidden;background:#2F4BFF;color:#fff}}
    .row{{position:absolute;left:84px;top:0;bottom:0;display:flex;align-items:center;gap:44px}}
    img{{width:184px;height:184px;border-radius:44px;box-shadow:0 18px 50px rgba(0,0,0,.25)}}
    h1{{font:600 66px/1 Unbounded;letter-spacing:-0.02em;margin:0 0 18px}}
    p{{font:400 30px/1.3 Onest;margin:0;opacity:.88}}
    svg{{position:absolute;right:-120px;top:-60px;opacity:.16}}
    </style></head><body>
    <svg width="620" height="620" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="#fff" stroke-width="7" stroke-dasharray="180 400" stroke-linecap="round" transform="rotate(-90 50 50)"/><circle cx="50" cy="50" r="40" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/></svg>
    <div class="row"><img src="{data_uri(APP_ICON)}"><div><h1>SubControl</h1><p>Усі підписки в гривнях.<br>Нагадування за день до списання.</p></div></div>
    </body></html>"""


async def compose():
    (OUT / "ios").mkdir(parents=True, exist_ok=True)
    (OUT / "android").mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for folder, w, h in (("ios", 1320, 2868), ("android", 1080, 1920)):
            page = await b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            for i, (shot, title, sub_text, bg, notif) in enumerate(SLIDES, 1):
                await page.set_content(frame_html(w, h, shot, title, sub_text, bg, notif))
                await page.wait_for_timeout(300)
                await page.screenshot(path=OUT / folder / f"{i}-{shot.split('-')[0]}.png")
            await page.close()
        page = await b.new_page(viewport={"width": 1024, "height": 500}, device_scale_factor=1)
        await page.set_content(feature_html())
        await page.wait_for_timeout(300)
        await page.screenshot(path=OUT / "android" / "feature-graphic.png")
        await b.close()

    icon = Image.open(APP_ICON).convert("RGB")
    icon.save(OUT / "ios" / "icon-1024.png")  # App Store: no transparency
    icon.resize((512, 512), Image.LANCZOS).convert("RGBA").save(OUT / "android" / "icon-512.png")
    # screenshots in the stores must not have transparency either
    for f in list((OUT / "ios").glob("[0-9]-*.png")) + list((OUT / "android").glob("*.png")):
        im = Image.open(f)
        if im.mode != "RGB" and f.name != "icon-512.png":
            im.convert("RGB").save(f)


if __name__ == "__main__":
    asyncio.run(shoot())
    asyncio.run(compose())
    print("done:", ", ".join(sorted(str(f.relative_to(OUT)) for f in OUT.rglob("*.png") if "raw" not in f.parts)))
