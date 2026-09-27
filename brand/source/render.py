# Renders every brand SVG to square PNGs with Chrome (transparent where the SVG has no background).
import sys, pathlib
from playwright.sync_api import sync_playwright
out = pathlib.Path(sys.argv[1])
(out / "png").mkdir(exist_ok=True)
SIZES = [512, 1024, 2048]
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    for f in sorted(out.glob("*.svg")):
        src = f.read_text()
        for w in SIZES:
            page = b.new_page(viewport={"width": w, "height": w})
            body = src.replace('width="512" height="512"', f'width="{w}" height="{w}"', 1)
            page.set_content(f'<html><body style="margin:0;background:transparent">{body}</body></html>')
            page.screenshot(path=str(out / "png" / f"{f.stem}-{w}.png"), omit_background=True, clip={"x": 0, "y": 0, "width": w, "height": w})
            page.close()
            print("png", f"{f.stem}-{w}")
    b.close()
