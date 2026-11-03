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
// Заголовки и описания подобраны под целевые запросы: «туристский спортивный комплекс», «ТСК», «оборудование /
// конструкции для спортивного туризма», «навесная переправа», «параллельные перила», «дистанция – пешеходная».
// Любое из них можно переопределить в панели управления (вкладка SEO): site.seo.title/description — главная,
// site.seo.pages[ключ] — остальные страницы.
const SEO = Object.assign({
  siteUrl: "https://tsk-st.ru/",
  title: "Туристские спортивные комплексы ТСК для спортивного туризма",
  description: "Сборные конструкции из алюминиевых ферм для дистанций по спортивному туризму: навесная переправа, параллельные перила, подъём и спуск. Производство и сборка.",
  ogImage: "images/hero.jpg", index: true, yandexVerification: "", googleVerification: "",
}, site.seo || {});
const PAGE_DEF = {
  catalog: { title: "Каталог ТСК — комплексы для дистанций по спортивному туризму",
    description: "ТСК 1, ТСК 2 и ТСК комби: длина 25–31 м, ширина 6,7–13,5 м, до 18 ниток. Схемы перил, характеристики и 3D-модель каждого варианта." },
  "tsk-1": { title: "ТСК 1 — комплекс для навесной переправы, подъёма и спуска",
    description: "Туристский спортивный комплекс ТСК 1: подъём и спуск по навесной переправе, подъём, спуск, вертикальный маятник. 5 вариантов размеров, до 16 ниток." },
  "tsk-2": { title: "ТСК 2 — комплекс для параллельных перил и навесной переправы",
    description: "Туристский спортивный комплекс ТСК 2 с двумя ярусами ферм: параллельные перила, навесная переправа и все этапы ТСК 1. 5 вариантов размеров, до 16 ниток." },
  "tsk-kombi": { title: "ТСК комби — две полосы этапов спортивного туризма на одном каркасе",
    description: "ТСК комби объединяет ТСК 1 и ТСК 2: две полосы на общем каркасе, этапы обоих комплексов ставятся одновременно. Варианты 6/24 и 12/30, до 18 ниток." },
  photos: { title: "Фото туристских спортивных комплексов ТСК на соревнованиях",
    description: "Комплексы ТСК на соревнованиях и тренировках по спортивному туризму летом и зимой: этапы дистанций, сборка комплексов на площадках." },
  news: { title: "Новости — туристские спортивные комплексы ТСК",
    description: "События компании «Современные технологии спорта»: соревнования на комплексах ТСК, новые модели и поставки." },
  about: { title: "О компании «Современные технологии спорта» — производитель ТСК",
    description: "Московская компания с 2013 года разрабатывает и производит туристские спортивные комплексы ТСК для соревнований и тренировок по спортивному туризму." },
};
const base = SEO.siteUrl.replace(/\/?$/, "/");
const esc = (x) => String(x ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const abs = (u) => (/^https?:/.test(u) ? u : base + String(u).replace(/^\//, ""));
const C = site.company || {};
const org = { "@context": "https://schema.org", "@type": "Organization", name: C.name || "ООО «Современные технологии спорта»",
  alternateName: "ТСК — туристские спортивные комплексы", url: base, logo: abs("brand/png/logo-color.png"),
  email: C.email || undefined, telephone: (C.phones || [])[0] || undefined,
  address: C.address ? { "@type": "PostalAddress", streetAddress: C.address, addressCountry: "RU" } : undefined };
const NEWS_ON = !!(site.settings && site.settings.newsVisible);
// Страницы сайта: у каждой свой адрес, заголовок, описание и каноническая ссылка
const PAGES = [{ key: "home", path: "", view: "home" }, { key: "catalog", path: "catalog/", view: "catalog" }]
  .concat((site.products || []).map((p) => ({ key: p.id, path: `catalog/${p.id}/`, view: "catalog", product: p })))
  .concat([{ key: "photos", path: "photos/", view: "photos" }], NEWS_ON ? [{ key: "news", path: "news/", view: "news" }] : [], [{ key: "about", path: "about/", view: "about" }]);
const clip = (t, n) => (t.length <= n ? t : t.slice(0, t.lastIndexOf(" ", n - 1)) + "…");
function meta(pg) {
  if (pg.key === "home") return { title: SEO.title || "Туристские спортивные комплексы ТСК", description: SEO.description || "" };
  const ov = Object.fromEntries(Object.entries(((SEO.pages || {})[pg.key]) || {}).filter(([, v]) => typeof v === "string" && v.trim()));
  const o = Object.assign({}, PAGE_DEF[pg.key] || {}, ov);
  if (pg.product) { const p = pg.product;
    o.title = o.title || `${p.name} — туристский спортивный комплекс`; o.description = o.description || clip(p.desc || "", 160); }
  return o;
}
function seoHead(page, pg) {
  pg = pg || PAGES[0];
  const m = meta(pg), url = page === "winter" ? base + "winter/" : base + pg.path;
  const ld = [org];
  if (pg.product) { const p = pg.product, im = (p.schemes || [])[0] || (p.photos || [])[0];
    ld.push({ "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.desc, url,
      brand: { "@type": "Organization", name: org.name }, manufacturer: { "@type": "Organization", name: org.name },
      image: im ? abs(typeof im === "string" ? im : (im.src || im[1] || "")) : undefined, category: "Оборудование для спортивного туризма" }); }
  if (pg.key !== "home" && page !== "winter") {
    const items = [{ n: "Главная", u: base }];
    if (pg.product) items.push({ n: "Каталог", u: base + "catalog/" });
    items.push({ n: pg.product ? pg.product.name : ({ catalog: "Каталог", photos: "Фотоальбом", news: "Новости", about: "О компании" })[pg.key], u: url });
    ld.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.n, item: x.u })) });
  }
  return [
    `<link rel="canonical" href="${page === "winter" ? base : url}">`,
    `<meta name="robots" content="${page === "winter" || !SEO.index ? "noindex, follow" : "index, follow"}">`,
    `<meta property="og:type" content="${pg.product ? "product" : "website"}">`, `<meta property="og:locale" content="ru_RU">`,
    `<meta property="og:site_name" content="ТСК — туристские спортивные комплексы">`,
    `<meta property="og:title" content="${esc(m.title)}">`, `<meta property="og:description" content="${esc(m.description)}">`,
    `<meta property="og:url" content="${url}">`, SEO.ogImage ? `<meta property="og:image" content="${esc(abs(SEO.ogImage))}">` : "",
    `<meta name="twitter:card" content="summary_large_image">`,
    SEO.yandexVerification ? `<meta name="yandex-verification" content="${esc(SEO.yandexVerification)}">` : "",
    SEO.googleVerification ? `<meta name="google-site-verification" content="${esc(SEO.googleVerification)}">` : "",
    ...ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`),
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
function applySeo(html, page, pg) {
  pg = pg || PAGES[0];
  const m = meta(pg);
  html = applyTexts(html);
  return html.replace(/<title>[^<]*<\/title>/, `<title>${esc(page === "winter" ? SEO.title + " (зимний вариант)" : m.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(m.description)}">`)
    .replace("<!--SEO-->", () => seoHead(page, pg));
}
const num = (v) => String(v).replace(".", ",");
// Ссылки меню — настоящие адреса страниц (поисковики ходят по ним), внутри страницы работают и старые #-ссылки
function realLinks(html) {
  const map = { home: "/", catalog: "/catalog/", photos: "/photos/", about: "/about/" };
  if (NEWS_ON) map.news = "/news/";
  return html.replace(/href="#(home|catalog|photos|about|news)"/g, (m0, k) => (map[k] ? `href="${map[k]}"` : m0));
}
const footLinks = `<nav class="foot-links" aria-label="Разделы сайта">${(site.products || []).map((p) => `<a href="/catalog/${p.id}/">${esc(p.name)}</a>`).join("")}<a href="/catalog/">Каталог</a><a href="/photos/">Фотоальбом</a><a href="/about/">О компании</a></nav>`;
// Блок комплекса на его странице: обычный текст, который видят и посетители из поиска, и поисковые роботы
function productIntro(p) {
  const vi = Math.max(0, Math.min((p.variants || []).length - 1, p.defaultVariant || 0));
  return `<section class="prod-intro"><div class="wrap"><div class="pi">
    <div><h2>Этапы на комплексе ${esc(p.name)}</h2><ul>${(p.stages || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <div class="act"><button type="button" class="btn btn-rope" data-pick-open="${esc(p.id)}" data-vi="${vi}">Схемы и 3D-модель</button><a class="btn btn-ghost" href="#request" data-req="${esc((p.variants[vi] || {}).name || p.name)}">Запросить предложение</a></div></div>
    <div><h2>Варианты ${esc(p.name)}</h2><table><thead><tr><th>Вариант</th><th>Длина</th><th>Ширина</th><th>Ниток</th></tr></thead><tbody>${(p.variants || []).map((v) => `<tr><td>${esc(v.name)}</td><td>${num(v.L)} м</td><td>${num(v.W)} м</td><td>до ${v.n}</td></tr>`).join("")}</tbody></table></div>
  </div></div></section>`;
}
function pageHtml(tplMain, pg) {
  let h = applySeo(tplMain, "main", pg).replace("<!--FOOT-LINKS-->", footLinks);
  if (pg.key === "home") return realLinks(h).replace("<!--CATALOG-INTRO-->", "");
  h = h.replace('<script id="site-data"', `<script>window.ASSET_PREFIX="/";window.ROUTE=${JSON.stringify({ view: pg.view, product: pg.product ? pg.product.id : undefined })}</script>\n<script id="site-data"`)
    .replace(/href="vendor\//g, 'href="/vendor/').replace(/src="images\//g, 'src="/images/')
    .replace(/href="(favicon|brand\/|site\.webmanifest)/g, 'href="/$1')
    .replace('<div data-view="home">', '<div data-view="home" hidden>')
    .replace(`<div data-view="${pg.view}" hidden>`, `<div data-view="${pg.view}">`);
  if (pg.product) {
    const p = pg.product;
    h = h.replace(/(<div data-view="catalog">[\s\S]*?)<span class="eyebrow"[^>]*>[^<]*<\/span>\s*<h1[^>]*>[^<]*<\/h1>\s*<p[^>]*>[^<]*<\/p>/,
      (m0, pre) => `${pre}<span class="eyebrow"><a href="/catalog/" style="color:inherit">Каталог</a> · ${esc(p.name)}</span>\n        <h1>${esc(p.name)} — туристский спортивный комплекс</h1>\n        <p>${esc(p.desc || "")}</p>`)
      .replace("<!--CATALOG-INTRO-->", productIntro(p));
  } else h = h.replace("<!--CATALOG-INTRO-->", "");
  return realLinks(h);
}

const tpl = fs.readFileSync("index.html", "utf8");
if (!tpl.includes("__SITE__")) { console.error("В index.html нет метки __SITE__"); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
for (const pg of PAGES) {
  const dir = path.join(OUT, pg.path); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), pageHtml(tpl, pg).replace("__SITE__", () => json));
}

// Зимний вариант: без блока инженерного стиля, пути на уровень выше
let w = tpl.replace(/\/\*ENG-START\*\/[\s\S]*?\/\*ENG-END\*\//, "")
  .replace('<script id="site-data"', '<script>window.ASSET_PREFIX="../"</script>\n<script id="site-data"')
  .replace(/href="vendor\//g, 'href="../vendor/')
  .replace(/src="images\//g, 'src="../images/')
  .replace(/href="(favicon|brand\/|site\.webmanifest)/g, 'href="../$1');
w = applySeo(w, "winter").replace("<!--FOOT-LINKS-->", "").replace("<!--CATALOG-INTRO-->", "").replace("__SITE__", () => json);
fs.mkdirSync(path.join(OUT, "winter"), { recursive: true });
fs.writeFileSync(path.join(OUT, "winter", "index.html"), w);

for (const f of ["favicon.ico", "favicon.svg", "site.webmanifest"]) if (fs.existsSync(f)) fs.copyFileSync(f, path.join(OUT, f));
for (const d of ["photos", "images", "content", "admin", "eng", "brand"]) if (fs.existsSync(d)) fs.cpSync(d, path.join(OUT, d), { recursive: true });
if (fs.existsSync("CNAME")) fs.copyFileSync("CNAME", path.join(OUT, "CNAME"));
// robots.txt и sitemap.xml
fs.writeFileSync(path.join(OUT, "robots.txt"), SEO.index
  ? `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /winter/\nDisallow: /eng/\n\nSitemap: ${base}sitemap.xml\n`
  : `User-agent: *\nDisallow: /\n`);
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.map((pg) =>
  `  <url><loc>${base}${pg.path}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${pg.key === "home" ? "1.0" : pg.product ? "0.9" : "0.7"}</priority></url>`).join("\n")}\n</urlset>\n`);
console.log("Готово:", site.products.length, "конструкций,", site.album.length, "фото в альбоме,", (site.news || []).length, "новостей");
