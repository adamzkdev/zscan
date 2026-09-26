// Generates the ZScan media kit SVGs (text outlined, no font dependency) into brand/.
const fs = require("fs");
const path = require("path");
const { outline } = require("./text");
// Usage: node build.js <output dir>  (see ../README.md)

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

const C = {
  navy: "#21325b",
  navy2: "#2d4476",
  ink: "#212529",
  white: "#ffffff",
  accent: "#f4b728",
  ironwood: "#1baf7a",
  ironwoodBright: "#3ddc97",
  orchard: "#eb6834",
  sapling: "#2a78d6",
  transparent: "#eda100",
};

/** The shield mark, drawn in a 32×32 box, placed at (x, y) with side `s`. */
function mark(x, y, s, z) {
  const k = s / 32;
  return `<g transform="translate(${x} ${y}) scale(${k})">
    <path d="M16 2.5 27.5 7v8.6c0 7-4.8 11.9-11.5 13.9C9.3 27.5 4.5 22.6 4.5 15.6V7L16 2.5Z" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M11 11h10l-10 10h10" fill="none" stroke="${z}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M7.5 16h17" stroke="${C.ironwood}" stroke-width="1.2" stroke-dasharray="2 2" opacity=".85"/>
  </g>`;
}

/** "Z" + "Scan" wordmark; returns svg markup and width. Baseline at y. */
function wordmark(x, y, size, z) {
  const zPart = outline("Z", { size, x, y });
  const scan = outline("Scan", { size, x: x + zPart.width, y });
  return {
    svg: `<path d="${zPart.d}" fill="${z}"/><path d="${scan.d}" fill="${C.accent}"/>`,
    width: zPart.width + scan.width,
  };
}

const svg = (w, h, body, extra = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"${extra}>\n${body}\n</svg>\n`;

function write(name, content) {
  fs.writeFileSync(path.join(OUT, name), content);
  console.log("wrote", name);
}

// 1. Mark alone.
write("zscan-mark.svg", svg(32, 32, mark(0, 0, 32, C.ink)));
write("zscan-mark-white.svg", svg(32, 32, mark(0, 0, 32, C.white)));

// 2. Horizontal logo: mark + wordmark, vertically centred on the mark.
function logo(z) {
  const S = 120, gap = 22, size = 92;
  const cap = 0.711 * size;
  const baseline = S / 2 + cap / 2;
  const wm = wordmark(S + gap, baseline, size, z);
  const W = Math.ceil(S + gap + wm.width + 4);
  return svg(W, S, mark(0, 0, S, z) + wm.svg);
}
write("zscan-logo.svg", logo(C.ink));
write("zscan-logo-white.svg", logo(C.white));

// 3. Avatar (profile picture): mark on navy, safe inside the circular crop.
const dots = (id, op = 0.07) =>
  `<pattern id="${id}" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#fff" opacity="${op}"/></pattern>`;
write(
  "zscan-avatar.svg",
  svg(
    400,
    400,
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.navy}"/><stop offset="1" stop-color="${C.navy2}"/></linearGradient>${dots("d")}</defs>
  <rect width="400" height="400" fill="url(#bg)"/><rect width="400" height="400" fill="url(#d)"/>
  ${mark(80, 76, 240, C.white)}`,
  ),
);

// 4. Twitter / X header, 1500×500. Mobile crops ~60px top and bottom; the avatar covers the
// bottom-left, so content sits in the centre-right band.
function banner() {
  const W = 1500, H = 500;
  const title = wordmark(0, 0, 112, C.white);
  const tx = 560;
  const tagA = outline("See what’s public.", { size: 40, weight: 500, x: tx, y: 318 });
  const tagB = outline("Respect what’s private.", { size: 40, weight: 500, x: tx + tagA.width + 14, y: 318 });
  const feats = outline("Zcash explorer  ·  Shielded pools  ·  Supply audit  ·  Protocols  ·  Free API", {
    size: 23, weight: 400, x: tx, y: 372,
  });
  const url = outline("zscan.cash", { size: 26, weight: 500, x: 0, y: 0 });

  // Chain of blocks along the top right, with a scan line through them.
  const blocks = [];
  const colors = [C.ironwood, null, C.sapling, null, C.ironwood, C.orchard, null, C.ironwood, null, C.transparent];
  for (let i = 0; i < colors.length; i++) {
    const bx = 790 + i * 68, by = 70;
    const fill = colors[i];
    blocks.push(
      `<rect x="${bx}" y="${by}" width="46" height="46" rx="9" fill="${fill ?? "none"}" fill-opacity="${fill ? 0.9 : 0}" stroke="#fff" stroke-opacity="${fill ? 0 : 0.22}" stroke-width="2"/>`,
    );
    if (i < colors.length - 1) blocks.push(`<path d="M${bx + 46} ${by + 23}h22" stroke="#fff" stroke-opacity=".22" stroke-width="2"/>`);
  }

  return svg(
    W,
    H,
    `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.navy}"/><stop offset="1" stop-color="${C.navy2}"/></linearGradient>
    ${dots("d")}
    <linearGradient id="scan" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.ironwoodBright}" stop-opacity="0"/><stop offset=".5" stop-color="${C.ironwoodBright}" stop-opacity=".9"/><stop offset="1" stop-color="${C.ironwoodBright}" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#d)"/>
  <g opacity=".05">${mark(1275, 150, 380, C.white)}</g>
  ${blocks.join("\n  ")}
  <rect x="760" y="92" width="740" height="2" fill="url(#scan)"/>
  ${mark(tx, 150, 116, C.white)}
  <g transform="translate(${tx + 140} 250)">${title.svg}</g>
  <path d="${tagA.d}" fill="#fff" fill-opacity=".92"/>
  <path d="${tagB.d}" fill="${C.ironwoodBright}"/>
  <path d="${feats.d}" fill="#fff" fill-opacity=".62"/>
  <g transform="translate(${W - 64 - url.width} 440)"><path d="${url.d}" fill="${C.accent}"/></g>`,
  );
}
write("twitter-banner.svg", banner());
