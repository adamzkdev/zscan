# ZScan media kit

Square logos for ZScan, published at https://zscan.cash/brand (files in `web/public/brand/`,
plus `zscan-media-kit.zip`). Every file is square, as SVG and as PNG at 512, 1024 and 2048 px.
Text is outlined in the SVGs, so they render the same everywhere without the font installed.

| File | What |
|---|---|
| `zscan-icon` | Shield on navy: profile pictures, app icons |
| `zscan-icon-light` | Shield on white |
| `zscan-logo-navy` | Shield + ZScan wordmark on navy |
| `zscan-logo-light` | Shield + ZScan wordmark on white |
| `zscan-logo` / `zscan-logo-white` | Shield + wordmark, transparent, for light / dark backgrounds |
| `zscan-mark` / `zscan-mark-white` | Shield alone, transparent, for light / dark backgrounds |

## Regenerating

```sh
cd brand/source
npm install opentype.js
for w in 400 500 700; do curl -sfLo roboto-$w.ttf "https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-$w-normal.ttf"; done
node build.js ../../web/public/brand       # SVGs
python3 render.py ../../web/public/brand   # PNGs (needs Playwright for Python and Google Chrome)
```
