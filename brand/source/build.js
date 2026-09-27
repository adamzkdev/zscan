// Generates the ZScan media kit SVGs (text outlined, no font dependency). Every asset is
// square (512×512 viewBox), so it drops into avatars, app icons and article thumbnails as is.
const fs = require("fs");
const path = require("path");
const { outline } = require("./text");
// Usage: node build.js <output dir>  (see ../README.md)

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

const C = { navy: "#21325b", navy2: "#2d4476", ink: "#212529", white: "#ffffff", accent: "#f4b728", ironwood: "#1baf7a" };
const S = 512;

/** The shield mark, drawn in a 32×32 box, placed at (x, y) with side `s`. */
function mark(x, y, s, z) {
  const k = s / 32;
  return `<g transform="translate(${x} ${y}) scale(${k})">
    <path d="M16 2.5 27.5 7v8.6c0 7-4.8 11.9-11.5 13.9C9.3 27.5 4.5 22.6 4.5 15.6V7L16 2.5Z" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M11 11h10l-10 10h10" fill="none" stroke="${z}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M7.5 16h17" stroke="${C.ironwood}" stroke-width="1.2" stroke-dasharray="2 2" opacity=".85"/>
  </g>`;
}

/** "Z" + "Scan" wordmark centred on cx, baseline at y. */
function wordmark(cx, y, size, z) {
  const w = outline("Z", { size }).width + outline("Scan", { size }).width;
  const x = cx - w / 2;
  const zPart = outline("Z", { size, x, y });
  const scan = outline("Scan", { size, x: x + zPart.width, y });
  return `<path d="${zPart.d}" fill="${z}"/><path d="${scan.d}" fill="${C.accent}"/>`;
}

const BG = {
  none: "",
  white: `<rect width="${S}" height="${S}" fill="${C.white}"/>`,
  navy: `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.navy}"/><stop offset="1" stop-color="${C.navy2}"/></linearGradient><pattern id="d" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#fff" opacity="0.07"/></pattern></defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/><rect width="${S}" height="${S}" fill="url(#d)"/>`,
};

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">\n${body}\n</svg>\n`;

function write(name, content) {
  fs.writeFileSync(path.join(OUT, name), content);
  console.log("wrote", name);
}

// Mark alone, centred with a margin that keeps it inside a circular crop.
const markOnly = (bg, z) => svg(BG[bg] + mark(96, 92, 320, z));
// Mark stacked over the wordmark.
const stacked = (bg, z) => {
  const m = 212, size = 108, gap = 34;
  const cap = 0.711 * size;
  const top = (S - (m + gap + cap)) / 2;
  return svg(BG[bg] + mark((S - m) / 2, top, m, z) + wordmark(S / 2, top + m + gap + cap, size, z));
};

write("zscan-icon.svg", markOnly("navy", C.white));
write("zscan-icon-light.svg", markOnly("white", C.ink));
write("zscan-mark.svg", markOnly("none", C.ink));
write("zscan-mark-white.svg", markOnly("none", C.white));
write("zscan-logo.svg", stacked("none", C.ink));
write("zscan-logo-white.svg", stacked("none", C.white));
write("zscan-logo-navy.svg", stacked("navy", C.white));
write("zscan-logo-light.svg", stacked("white", C.ink));
