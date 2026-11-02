// Сборка сайта для GitHub Pages: подставляет content/site.json в страницу,
// делает зимний вариант (/winter/) и проверяет, что все картинки на месте.
import fs from "node:fs";
import path from "node:path";

const OUT = "_site";
const site = JSON.parse(fs.readFileSync("content/site.json", "utf8")); // упадёт, если JSON испорчен
const json = JSON.stringify(site).replace(/<\//g, "<\\/");

// Проверка ссылок на файлы
const missing = [];
(function walk(o) {
  if (Array.isArray(o)) return o.forEach(walk);
  if (o && typeof o === "object") return Object.values(o).forEach(walk);
  if (typeof o === "string" && /^(photos|images)\//.test(o) && !fs.existsSync(o)) missing.push(o);
})(site);
if (missing.length) { console.error("Нет файлов:", missing.join(", ")); process.exit(1); }

const tpl = fs.readFileSync("index.html", "utf8");
if (!tpl.includes("__SITE__")) { console.error("В index.html нет метки __SITE__"); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), tpl.replace("__SITE__", () => json));

// Зимний вариант: без блока инженерного стиля, пути на уровень выше
let w = tpl.replace(/\/\*ENG-START\*\/[\s\S]*?\/\*ENG-END\*\//, "")
  .replace('<script id="site-data"', '<script>window.ASSET_PREFIX="../"</script>\n<script id="site-data"')
  .replace(/href="vendor\//g, 'href="../vendor/')
  .replace(/src="images\//g, 'src="../images/')
  .replace(/<title>[^<]*<\/title>/, "<title>ТСК — зимний вариант</title>")
  .replace("__SITE__", () => json);
fs.mkdirSync(path.join(OUT, "winter"), { recursive: true });
fs.writeFileSync(path.join(OUT, "winter", "index.html"), w);

for (const d of ["photos", "images", "content", "admin", "eng"]) if (fs.existsSync(d)) fs.cpSync(d, path.join(OUT, d), { recursive: true });
if (fs.existsSync("CNAME")) fs.copyFileSync("CNAME", path.join(OUT, "CNAME"));
console.log("Готово:", site.products.length, "конструкций,", site.album.length, "фото в альбоме,", (site.news || []).length, "новостей");
