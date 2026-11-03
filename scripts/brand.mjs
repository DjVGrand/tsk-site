// Логотип ТСК в векторе: знак + надпись шрифтом Russo One, текст переведён в кривые.
// Запускается workflow «Логотип» (.github/workflows/brand.yml); результат — папка brand/.
import fs from "node:fs";
import opentype from "opentype.js";

const fontFile = process.argv[2];
const buf = fs.readFileSync(fontFile);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

function textPath(str, x, y, size, track) {
  let d = "", cx = x, prev = null;
  for (const ch of str) {
    const g = font.charToGlyph(ch);
    if (prev) cx += font.getKerningValue(prev, g) * size / font.unitsPerEm;
    d += g.getPath(cx, y, size).toPathData(2);
    cx += g.advanceWidth * size / font.unitsPerEm + track * size;
    prev = g;
  }
  return { d, w: cx - x - track * size };
}

// Знак (как на сайте), исходные координаты 62×30
const MARK = (ink, accent) => `<g fill="none" stroke="${ink}" stroke-width="3.6" stroke-linecap="square" stroke-linejoin="miter">
    <path d="M11 11V26.5"/><path d="M2 3H20M2 11H20" stroke-width="2.4"/>
    <path d="M37 3.5H25V26.5H37"/>
    <path d="M43 3.5V26.5M43 15L58 3.5M47.5 11.5L58 26.5"/>
  </g>
  <path d="M2 11L5 3 8 11 11 3 14 11 17 3 20 11" fill="none" stroke="${accent}" stroke-width="1.5" stroke-linejoin="round"/>`;

const K = 2;                 // масштаб знака
const SIZE = 25, TRACK = 0.03, GAP = 16;
const tx = 62 * K + GAP;
const l1 = textPath("ТУРИСТСКИЕ", tx, 27, SIZE, TRACK);
const l2 = textPath("СПОРТИВНЫЕ КОМПЛЕКСЫ", tx, 57, SIZE, TRACK);
const W = Math.ceil(tx + Math.max(l1.w, l2.w) + 2), H = 62;

const VARIANTS = {
  "logo-color": { ink: "#1D2227", accent: "#C8452F", bg: null },
  "logo-graphite": { ink: "#1D2227", accent: "#1D2227", bg: null },
  "logo-white": { ink: "#FFFFFF", accent: "#FFFFFF", bg: null },
  "logo-white-red": { ink: "#FFFFFF", accent: "#E8735C", bg: null },
};
fs.mkdirSync("brand", { recursive: true });
for (const [name, v] of Object.entries(VARIANTS)) {
  const full = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>ТСК — туристские спортивные комплексы</title>
  <g transform="translate(0 1) scale(${K})">${MARK(v.ink, v.accent)}</g>
  <path fill="${v.ink}" d="${l1.d}"/>
  <path fill="${v.ink}" d="${l2.d}"/>
</svg>
`;
  fs.writeFileSync(`brand/${name}.svg`, full);
  const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="124" height="62" viewBox="0 0 62 31">
  <title>ТСК</title>
  <g transform="translate(0 0.5)">${MARK(v.ink, v.accent)}</g>
</svg>
`;
  fs.writeFileSync(`brand/${name.replace("logo", "mark")}.svg`, mark);
}
console.log("brand/:", fs.readdirSync("brand").join(", "), `${W}×${H}`);
