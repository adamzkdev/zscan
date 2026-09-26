# ZScan media kit

Logos and social assets for ZScan, published at https://zscan.cash/brand (files in
`web/public/brand/`, plus `zscan-media-kit.zip`). Text is outlined in the SVGs, so they render
the same everywhere without the font installed.

| File | Use |
|---|---|
| `zscan-logo.svg`, `png/zscan-logo@2x.png` | Horizontal logo for light backgrounds |
| `zscan-logo-white.svg`, `png/zscan-logo-white@2x.png` | Horizontal logo for dark backgrounds |
| `zscan-mark.svg`, `png/zscan-mark-{512,1024}.png` | Shield mark alone, light backgrounds |
| `zscan-mark-white.svg`, `png/zscan-mark-white-{512,1024}.png` | Shield mark alone, dark backgrounds |
| `zscan-avatar.svg`, `png/zscan-avatar-{400,1024}.png` | Profile picture (X/Twitter, GitHub, Discord) |
| `twitter-banner.svg`, `png/twitter-banner-{1500,3000}.png` | X/Twitter header (1500×500, and @2x) |

PNGs have transparent backgrounds except the avatar and banner.

## Colors

| Name | Hex | Role |
|---|---|---|
| Zcash gold | `#f4b728` | Shield, "Scan", accents |
| Ink | `#212529` | "Z" on light backgrounds |
| Navy | `#21325b` → `#2d4476` | Backgrounds (gradient) |
| Ironwood | `#1baf7a` / `#3ddc97` | Scan line, privacy accent |
| Sapling | `#2a78d6` | Pool color |
| Orchard | `#eb6834` | Pool color |

Typeface: Roboto (700 for the wordmark). Tagline: *See what's public. Respect what's private.*

## Usage

- Keep clear space around the logo of at least the height of the "Z".
- Don't recolor the shield, stretch the logo or place the ink version on dark backgrounds.
- The X header keeps its content in the centre-right: the profile picture covers the bottom-left,
  and mobile apps crop about 60px from the top and bottom.

## Regenerating

```sh
cd brand/source
npm install opentype.js
for w in 400 500 700; do curl -sfLo roboto-$w.ttf "https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-$w-normal.ttf"; done
node build.js ../../web/public/brand       # SVGs
python3 render.py ../../web/public/brand   # PNGs (needs Playwright for Python and Google Chrome)
```
