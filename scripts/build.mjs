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

// ---------- SEO ----------
const SEO = Object.assign({
  siteUrl: "https://tsk-st.ru/",
  title: "Туристские спортивные комплексы ТСК — конструкции из алюминиевых ферм",
  description: "Туристские спортивные комплексы ТСК из алюминиевых ферм для тренировок и соревнований по спортивному туризму. ООО «Современные технологии спорта».",
  ogImage: "images/hero.jpg", index: true, yandexVerification: "", googleVerification: "",
}, site.seo || {});
const base = SEO.siteUrl.replace(/\/?$/, "/");
const esc = (x) => String(x ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const abs = (u) => (/^https?:/.test(u) ? u : base + String(u).replace(/^\//, ""));
const C = site.company || {};
const org = { "@context": "https://schema.org", "@type": "Organization", name: C.name || "ООО «Современные технологии спорта»",
  alternateName: "ТСК — туристские спортивные комплексы", url: base, logo: abs("brand/png/logo-color.png"),
  email: C.email || undefined, telephone: (C.phones || [])[0] || undefined,
  address: C.address ? { "@type": "PostalAddress", streetAddress: C.address, addressCountry: "RU" } : undefined };
function seoHead(page) {
  const url = page === "winter" ? base + "winter/" : base;
  return [
    `<link rel="canonical" href="${base}">`,
    `<meta name="robots" content="${page === "winter" || !SEO.index ? "noindex, follow" : "index, follow"}">`,
    `<meta property="og:type" content="website">`, `<meta property="og:locale" content="ru_RU">`,
    `<meta property="og:site_name" content="ТСК — туристские спортивные комплексы">`,
    `<meta property="og:title" content="${esc(SEO.title)}">`, `<meta property="og:description" content="${esc(SEO.description)}">`,
    `<meta property="og:url" content="${url}">`, SEO.ogImage ? `<meta property="og:image" content="${esc(abs(SEO.ogImage))}">` : "",
    `<meta name="twitter:card" content="summary_large_image">`,
    SEO.yandexVerification ? `<meta name="yandex-verification" content="${esc(SEO.yandexVerification)}">` : "",
    SEO.googleVerification ? `<meta name="google-site-verification" content="${esc(SEO.googleVerification)}">` : "",
    `<script type="application/ld+json">${JSON.stringify(org).replace(/</g, "\\u003c")}</script>`,
  ].filter(Boolean).join("\n");
}
// Тексты из панели подставляются и в сам HTML — поисковики видят их без выполнения скриптов
function applyTexts(html) {
  const T = site.texts || {};
  for (const [k, v] of Object.entries(T)) {
    if (typeof v !== "string") continue;
    const re = new RegExp(`(data-txt="${k.replace(/[.]/g, "\\.")}"[^>]*>)[^<]*(<)`);
    html = html.replace(re, (m, a, b) => a + esc(v).replace(/\n/g, "<br>") + b);
  }
  return html;
}
function applySeo(html, page) {
  html = applyTexts(html);
  return html.replace(/<title>[^<]*<\/title>/, `<title>${esc(page === "winter" ? SEO.title + " (зимний вариант)" : SEO.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(SEO.description)}">`)
    .replace("<!--SEO-->", () => seoHead(page));
}

const tpl = fs.readFileSync("index.html", "utf8");
if (!tpl.includes("__SITE__")) { console.error("В index.html нет метки __SITE__"); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), applySeo(tpl, "main").replace("__SITE__", () => json));

// Зимний вариант: без блока инженерного стиля, пути на уровень выше
let w = tpl.replace(/\/\*ENG-START\*\/[\s\S]*?\/\*ENG-END\*\//, "")
  .replace('<script id="site-data"', '<script>window.ASSET_PREFIX="../"</script>\n<script id="site-data"')
  .replace(/href="vendor\//g, 'href="../vendor/')
  .replace(/src="images\//g, 'src="../images/')
  .replace(/href="(favicon|brand\/|site\.webmanifest)/g, 'href="../$1');
w = applySeo(w, "winter").replace("__SITE__", () => json);
fs.mkdirSync(path.join(OUT, "winter"), { recursive: true });
fs.writeFileSync(path.join(OUT, "winter", "index.html"), w);

for (const f of ["favicon.ico", "favicon.svg", "site.webmanifest"]) if (fs.existsSync(f)) fs.copyFileSync(f, path.join(OUT, f));
for (const d of ["photos", "images", "content", "admin", "eng", "brand"]) if (fs.existsSync(d)) fs.cpSync(d, path.join(OUT, d), { recursive: true });
if (fs.existsSync("CNAME")) fs.copyFileSync("CNAME", path.join(OUT, "CNAME"));
// robots.txt и sitemap.xml
fs.writeFileSync(path.join(OUT, "robots.txt"), SEO.index
  ? `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /winter/\nDisallow: /eng/\n\nSitemap: ${base}sitemap.xml\n`
  : `User-agent: *\nDisallow: /\n`);
fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${base}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`);
console.log("Готово:", site.products.length, "конструкций,", site.album.length, "фото в альбоме,", (site.news || []).length, "новостей");
