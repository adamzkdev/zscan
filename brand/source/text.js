// Text → SVG path data (outlined), laid out glyph by glyph with kerning.
const o = require("opentype.js"), fs = require("fs");
const fonts = {};
function font(w) { return (fonts[w] ??= o.parse(fs.readFileSync(`${__dirname}/roboto-${w}.ttf`).buffer)); }
function outline(text, { weight = 700, size, x = 0, y = 0, tracking = 0 }) {
  const f = font(weight), scale = size / f.unitsPerEm;
  let pen = x, d = "", prev = null;
  for (const ch of text) {
    const g = f.charToGlyph(ch);
    if (prev) pen += f.getKerningValue(prev, g) * scale;
    d += g.getPath(pen, y, size).toPathData(2);
    pen += g.advanceWidth * scale + tracking;
    prev = g;
  }
  return { d, width: pen - x - tracking };
}
module.exports = { outline };
if (require.main === module) console.log(outline("ZScan", { size: 100 }).width);
