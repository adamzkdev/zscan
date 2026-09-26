# Renders brand SVGs to PNG with Chrome (transparent where the SVG has no background).
import sys, pathlib
from playwright.sync_api import sync_playwright
out = pathlib.Path(sys.argv[1])
jobs = [
    ("zscan-mark.svg", [512, 1024], None), ("zscan-mark-white.svg", [512, 1024], None),
    ("zscan-logo.svg", [None], 2), ("zscan-logo-white.svg", [None], 2),
    ("zscan-avatar.svg", [400, 1024], None), ("twitter-banner.svg", [1500, 3000], None),
]
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    for name, widths, scale in jobs:
        src = (out / name).read_text()
        import re
        w0, h0 = [float(x) for x in re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', src).groups()]
        for w in widths:
            if scale:
                w, h = round(w0 * scale), round(h0 * scale)
            else:
                h = round(w * h0 / w0)
            page = b.new_page(viewport={"width": w, "height": h})
            body = src.replace(f'width="{int(w0)}" height="{int(h0)}"', f'width="{w}" height="{h}"', 1)
            page.set_content(f'<html><body style="margin:0;background:transparent">{body}</body></html>')
            stem = name[:-4]
            suffix = f"@{scale}x" if scale else f"-{w}"
            page.screenshot(path=str(out / "png" / f"{stem}{suffix}.png"), omit_background=True, clip={"x": 0, "y": 0, "width": w, "height": h})
            page.close()
            print("png", stem + suffix)
    b.close()
