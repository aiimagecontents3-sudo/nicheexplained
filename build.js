// Minimal static site generator: content/*.md -> docs/ (GitHub Pages serves /docs)
const fs = require('fs'), path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const cfg = JSON.parse(fs.readFileSync('site.config.json', 'utf8'));
const OUT = 'docs';
const base = cfg.baseUrl.replace(/\/$/, '');
const basePath = new URL(base + '/').pathname.replace(/\/$/, ''); // "/nicheexplained" or ""
const abs = p => base + p, rel = p => basePath + p;
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const iso = d => new Date(d).toISOString();

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync('static', OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

function load(dir) {
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => {
    const { data, content } = matter(fs.readFileSync(path.join(dir, f), 'utf8'));
    const slug = data.slug || f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
    const words = content.split(/\s+/).filter(Boolean).length;
    return { ...data, slug, html: marked.parse(content), words, readMin: Math.max(1, Math.round(words / 220)) };
  });
}
const articles = load('content/articles').filter(a => !a.draft)
  .sort((a, b) => new Date(b.date) - new Date(a.date));
const pages = load('content/pages');

function newsletter() {
  const n = cfg.newsletter; if (!n.enabled) return '';
  // TODO(owner): configure provider in site.config.json
  const form = n.provider === 'substack'
    ? `<iframe src="${esc(n.substackUrl)}/embed" width="100%" height="150" style="border:0;background:transparent" frameborder="0" scrolling="no" title="Newsletter signup"></iframe>`
    : `<form action="https://buttondown.com/api/emails/embed-subscribe/${esc(n.buttondownUsername)}" method="post" target="_blank" class="nl-form">
        <label for="nl-email" class="sr">Email address</label>
        <input id="nl-email" type="email" name="email" placeholder="you@example.com" required>
        <button type="submit">Subscribe</button></form>`;
  return `<aside class="box newsletter"><h2>Get one niche explained, daily</h2><p>Free. No spam. Unsubscribe anytime.</p>${form}</aside>`;
}
function sponsor() {
  const s = cfg.sponsor; if (!s.enabled) return '';
  // TODO(owner): sponsor slot — fill name/url/text in site.config.json
  return s.name
    ? `<aside class="box sponsor"><span class="label">Sponsor</span> <a href="${esc(s.url)}" rel="sponsored noopener" target="_blank">${esc(s.name)}</a> — ${esc(s.text)}</aside>`
    : `<aside class="box sponsor"><span class="label">Sponsor slot</span> Want to reach curious readers? <a href="${rel('/about/')}#sponsor">Sponsor NicheExplained</a>.</aside>`;
}

function layout({ title, description, urlPath, body, type = 'website', jsonld, image }) {
  const canonical = abs(urlPath);
  const fullTitle = urlPath === '/' ? `${cfg.title} — ${cfg.tagline}` : `${title} | ${cfg.title}`;
  const img = abs(image || cfg.defaultOgImage);
  const ads = cfg.adsenseClientId ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(cfg.adsenseClientId)}" crossorigin="anonymous"></script>` : '';
  return `<!doctype html>
<html lang="${cfg.language}">
<head>
<meta name="google-site-verification" content="e3KiLzmjXY11CIK6mHIUkHUXxlhMxn456v13wouNE4o" />
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" type="application/rss+xml" title="${esc(cfg.title)}" href="${abs('/feed.xml')}">
<meta property="og:site_name" content="${esc(cfg.title)}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${img}">
${cfg.twitterHandle ? `<meta name="twitter:site" content="${esc(cfg.twitterHandle)}">` : ''}
<link rel="icon" href="${rel('/favicon.svg')}" type="image/svg+xml">
<link rel="stylesheet" href="${rel('/style.css')}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
${ads}
</head>
<body>
<header class="site-header"><div class="wrap">
<a class="logo" href="${rel('/')}">Niche<span>Explained</span></a>
<nav><a href="${rel('/')}">Articles</a><a href="${rel('/about/')}">About</a><a href="${rel('/feed.xml')}">RSS</a></nav>
</div></header>
<main class="wrap">${body}</main>
<footer class="site-footer"><div class="wrap">
<p>© ${new Date().getFullYear()} ${esc(cfg.title)} · <a href="${rel('/about/')}">About</a> · <a href="${rel('/privacy/')}">Privacy</a> · <a href="${rel('/feed.xml')}">RSS</a></p>
</div></footer>
</body></html>`;
}
const write = (p, html) => { const f = path.join(OUT, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };

// Articles
for (const a of articles) {
  const urlPath = `/${a.slug}/`;
  const share = encodeURIComponent(abs(urlPath)), st = encodeURIComponent(a.title);
  const jsonld = { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.description,
    datePublished: iso(a.date), dateModified: iso(a.updated || a.date), author: { '@type': 'Person', name: a.author || cfg.author },
    publisher: { '@type': 'Organization', name: cfg.title }, mainEntityOfPage: abs(urlPath), image: abs(a.image || cfg.defaultOgImage),
    wordCount: a.words, keywords: (a.tags || []).join(', ') };
  const body = `<article class="post">
<header><p class="meta"><time datetime="${iso(a.date)}">${fmtDate(a.date)}</time> · ${a.readMin} min read${(a.tags||[]).length ? ' · ' + a.tags.map(esc).join(', ') : ''}</p>
<h1>${esc(a.title)}</h1><p class="lede">${esc(a.description)}</p></header>
${sponsor()}
<div class="content">${a.html}</div>
<p class="share">Share: <a href="https://twitter.com/intent/tweet?url=${share}&text=${st}" target="_blank" rel="noopener">X</a> · <a href="https://www.linkedin.com/sharing/share-offsite/?url=${share}" target="_blank" rel="noopener">LinkedIn</a> · <a href="https://www.reddit.com/submit?url=${share}&title=${st}" target="_blank" rel="noopener">Reddit</a> · <a href="mailto:?subject=${st}&body=${share}">Email</a></p>
</article>${newsletter()}`;
  write(`${a.slug}/index.html`, layout({ title: a.title, description: a.description, urlPath, body, type: 'article', jsonld, image: a.image }));
}

// Static pages
for (const p of pages) {
  write(`${p.slug}/index.html`, layout({ title: p.title, description: p.description, urlPath: `/${p.slug}/`,
    body: `<article class="post"><h1>${esc(p.title)}</h1><div class="content">${p.html}</div></article>` }));
}

// Home
const list = articles.map(a => `<li class="card"><a href="${rel(`/${a.slug}/`)}"><h2>${esc(a.title)}</h2></a>
<p class="meta"><time datetime="${iso(a.date)}">${fmtDate(a.date)}</time> · ${a.readMin} min read</p><p>${esc(a.description)}</p></li>`).join('\n');
write('index.html', layout({ title: cfg.title, description: cfg.description, urlPath: '/',
  jsonld: { '@context': 'https://schema.org', '@type': 'WebSite', name: cfg.title, url: abs('/'), description: cfg.description },
  body: `<section class="hero"><h1>${esc(cfg.tagline)}</h1><p>${esc(cfg.description)}</p></section>${newsletter()}<ul class="list">${list}</ul>${sponsor()}` }));

// 404
write('404.html', layout({ title: 'Page not found', description: 'This page does not exist.', urlPath: '/404.html',
  body: `<h1>Page not found</h1><p><a href="${rel('/')}">Back to all articles</a></p>` }));

// Sitemap, robots, RSS
const urls = [['/', articles[0]?.date], ...articles.map(a => [`/${a.slug}/`, a.updated || a.date]), ...pages.map(p => [`/${p.slug}/`])];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d]) =>
  `<url><loc>${abs(u)}</loc>${d ? `<lastmod>${iso(d).slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`);
write('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${esc(cfg.title)}</title><link>${abs('/')}</link><description>${esc(cfg.description)}</description><language>${cfg.language}</language>
<atom:link href="${abs('/feed.xml')}" rel="self" type="application/rss+xml"/>
${articles.slice(0, 30).map(a => `<item><title>${esc(a.title)}</title><link>${abs(`/${a.slug}/`)}</link><guid>${abs(`/${a.slug}/`)}</guid><pubDate>${new Date(a.date).toUTCString()}</pubDate><description>${esc(a.description)}</description></item>`).join('\n')}
</channel></rss>\n`);

console.log(`Built ${articles.length} article(s), ${pages.length} page(s) -> ${OUT}/`);
